"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getIdToken } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useAllVotes } from "@/lib/firebase-realtime";
import { characters, type Character, type CharacterType } from "@/data/characters";
import { getFirebaseAuth } from "@/lib/firebase";
import { buildUserStats } from "@/lib/firebase-user";
import { safePhotoURL } from "@/lib/validate-url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = "total" | "smash" | "pass" | "smashRate" | "name";
type SortDir = "desc" | "asc";
type UserSortKey = "displayName" | "currentId" | "lastPlayed" | "totalVotes" | "smashRate";

interface CharacterRow {
  character: Character;
  smash: number;
  pass: number;
  total: number;
  smashRate: number;
}

interface UserRow {
  uid: string;
  displayName: string;
  photoURL: string | null;
  currentId: number;
  lastPlayed: number;
  lastReset?: number;
  totalVotes: number;
  smashCount: number;
  passCount: number;
  smashRate: number;
}

// No more NEXT_PUBLIC_ADMIN_EMAIL — admin status is verified server-side only.

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtDate(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  color = "gold",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "gold" | "smash" | "pass" | "ash" | "ranni";
}) {
  const colorMap = {
    gold: "text-gold",
    smash: "text-smash",
    pass: "text-pass",
    ash: "text-ash",
    ranni: "text-ranni",
  };
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-ash/70 font-semibold">{label}</span>
      <span className={`text-2xl font-bold font-cinzel ${colorMap[color]}`}>{value}</span>
      {sub && <span className="text-xs text-ash/50">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { allVotes, loading: votesLoading } = useAllVotes();

  // Leaderboard state
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CharacterType | "all">("all");

  // User section state
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<UserSortKey>("lastPlayed");
  const [userSortDir, setUserSortDir] = useState<SortDir>("desc");
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  // Server verification state
  const [verifiedByServer, setVerifiedByServer] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Helper: get a fresh Bearer token
  const getToken = useCallback(async () => {
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error("Not signed in");
    return getIdToken(firebaseUser);
  }, []);

  // ── Redirect non-admins (server-verified) ─────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }

    // Verify admin status via server — no client-side email check needed
    getToken()
      .then((token) =>
        fetch("/api/admin/verify", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
      )
      .then((res) => res.json())
      .then((data) => {
        if (data.isAdmin) {
          setVerifiedByServer(true);
          setAdminEmail(data.email ?? null);
        } else {
          router.replace("/");
        }
      })
      .catch((err) => {
        setApiError(err.message);
        router.replace("/");
      });
  }, [user, loading, router, getToken]);

  // ── Fetch all users via Admin SDK API route ───────────────────────────
  useEffect(() => {
    if (!verifiedByServer) return;

    setUsersLoading(true);

    getToken()
      .then((token) =>
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
      )
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        const raw = (data.users ?? {}) as Record<string, {
          displayName?: string;
          photoURL?: string;
          currentId?: number;
          lastPlayed?: number;
          lastReset?: number;
          votes?: Record<string, "smash" | "pass">;
        }>;

        const rows: UserRow[] = Object.entries(raw).map(([uid, d]) => {
          const votes = d.votes ?? {};
          const stats = buildUserStats(votes);
          return {
            uid,
            displayName: d.displayName ?? "Tarnished",
            photoURL: d.photoURL ?? null,
            currentId: d.currentId ?? 0,
            lastPlayed: d.lastPlayed ?? 0,
            lastReset: d.lastReset,
            totalVotes: stats.total,
            smashCount: stats.smashed.length,
            passCount: stats.passed.length,
            smashRate: stats.smashPercent,
          };
        });
        setUsers(rows);
      })
      .catch((err) => console.error("Failed to fetch users:", err))
      .finally(() => setUsersLoading(false));
  }, [verifiedByServer, getToken]);

  // ── Character leaderboard rows ────────────────────────────────────────
  const charRows: CharacterRow[] = useMemo(() => {
    return characters.map((char) => {
      const v = allVotes[char.id];
      const smash = v?.smash ?? 0;
      const pass = v?.pass ?? 0;
      const total = smash + pass;
      return { character: char, smash, pass, total, smashRate: total > 0 ? (smash / total) * 100 : 0 };
    });
  }, [allVotes]);

  const filteredCharRows = useMemo(() => {
    let r = charRows;
    if (typeFilter !== "all") r = r.filter((row) => row.character.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((row) => row.character.name.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.character.name.localeCompare(b.character.name);
      else if (sortKey === "smashRate") diff = a.smashRate - b.smashRate;
      else diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [charRows, sortKey, sortDir, search, typeFilter]);

  // ── User table rows ───────────────────────────────────────────────────
  const filteredUserRows = useMemo(() => {
    let r = users;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      r = r.filter(
        (u) => u.displayName.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q)
      );
    }
    return [...r].sort((a, b) => {
      const diff = (() => {
        if (userSort === "displayName") return a.displayName.localeCompare(b.displayName);
        return (a[userSort] as number) - (b[userSort] as number);
      })();
      return userSortDir === "desc" ? -diff : diff;
    });
  }, [users, userSearch, userSort, userSortDir]);

  // ── Live global stats ─────────────────────────────────────────────────
  const withVotes = useMemo(() => charRows.filter((r) => r.total > 0), [charRows]);
  const liveStats = useMemo(() => {
    const totalSmashes = charRows.reduce((s, r) => s + r.smash, 0);
    const totalPasses = charRows.reduce((s, r) => s + r.pass, 0);
    const total = totalSmashes + totalPasses;
    return {
      totalVotes: total,
      totalSmashes,
      totalPasses,
      smashRate: total > 0 ? Math.round((totalSmashes / total) * 1000) / 10 : null,
      charactersWithVotes: withVotes.length,
    };
  }, [charRows, withVotes]);

  const topSmashed = useMemo(() => [...withVotes].sort((a, b) => b.smash - a.smash).slice(0, 5), [withVotes]);
  const topPassed = useMemo(() => [...withVotes].sort((a, b) => b.pass - a.pass).slice(0, 5), [withVotes]);
  const mostControversial = useMemo(
    () => [...withVotes].filter((r) => r.total >= 5).sort((a, b) => Math.abs(a.smashRate - 50) - Math.abs(b.smashRate - 50)).slice(0, 5),
    [withVotes]
  );

  // ── Sort helpers ──────────────────────────────────────────────────────
  function handleCharSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  function handleUserSort(key: UserSortKey) {
    if (userSort === key) setUserSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setUserSort(key); setUserSortDir("desc"); }
  }
  const charSortIcon = (key: SortKey) => sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : " ·";
  const userSortIcon = (key: UserSortKey) => userSort === key ? (userSortDir === "desc" ? " ↓" : " ↑") : " ·";

  const typeBadge: Record<CharacterType, string> = {
    boss:     "bg-ember/20 text-ember border-ember/30",
    npc:      "bg-moonlight/20 text-frost border-moonlight/30",
    mc:       "bg-gold/20 text-gold border-gold/30",
    merchant: "bg-smash/20 text-smash border-smash/30",
    summon:   "bg-ranni/20 text-ranni border-ranni/30",
    mob:      "bg-ash/20 text-ash border-ash/30",
  };

  // ── Guard states ──────────────────────────────────────────────────────
  if (loading || !user || !verifiedByServer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-ash animate-pulse font-cinzel">Checking credentials…</span>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-void text-priscilla">

      {/* Sticky header */}
      <div className="border-b border-dark-600 bg-dark-900/90 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Back to game */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-ash/60 hover:text-gold transition-colors text-sm group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span className="font-cinzel text-xs tracking-wider">Elden Smash</span>
            </Link>
            <span className="text-dark-500">|</span>
            <span className="font-cinzel text-lg text-gold font-bold tracking-wider">⚔ ADMIN</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {verifiedByServer ? (
              <span className="text-xs bg-smash/20 text-smash border border-smash/30 rounded px-2 py-0.5 font-semibold">
                ✓ Server Verified
              </span>
            ) : apiError ? (
              <span className="text-xs bg-pass/20 text-pass border border-pass/30 rounded px-2 py-0.5">
                ⚠ {apiError}
              </span>
            ) : (
              <span className="text-xs text-ash/40 animate-pulse">Verifying…</span>
            )}
            <span className="text-xs text-ash/50 hidden sm:block">{adminEmail}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">

        {/* ── Global stats ──────────────────────────────────────────── */}
        <section>
          <h2 className="font-cinzel text-gold/60 text-xs uppercase tracking-widest mb-3">
            Global Stats
            {votesLoading && <span className="text-ash/30 normal-case ml-2 font-sans">loading…</span>}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total Votes" value={fmt(liveStats.totalVotes)} color="gold" />
            <StatCard label="Smashes" value={fmt(liveStats.totalSmashes)} sub={`${pct(liveStats.totalSmashes, liveStats.totalVotes)}%`} color="smash" />
            <StatCard label="Passes" value={fmt(liveStats.totalPasses)} sub={`${pct(liveStats.totalPasses, liveStats.totalVotes)}%`} color="pass" />
            <StatCard
              label="Smash Rate"
              value={liveStats.smashRate !== null ? `${liveStats.smashRate}%` : "—"}
              color={liveStats.smashRate !== null ? liveStats.smashRate >= 50 ? "smash" : "pass" : "ash"}
            />
            <StatCard label="Chars Voted" value={`${liveStats.charactersWithVotes}/${characters.length}`} sub={`${pct(liveStats.charactersWithVotes, characters.length)}% of roster`} color="ash" />
            <StatCard
              label="Users"
              value={usersLoading ? "…" : fmt(users.length)}
              sub="signed-in accounts"
              color="ranni"
            />
          </div>
        </section>

        {/* ── Highlights ──────────────────────────────────────────────── */}
        {withVotes.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-dark-800 border border-smash/20 rounded-lg p-4">
              <h3 className="font-cinzel text-smash text-xs uppercase tracking-widest mb-3">🏆 Most Smashed</h3>
              <ol className="space-y-2">
                {topSmashed.map((r, i) => (
                  <li key={r.character.id} className="flex items-center gap-2">
                    <span className="text-ash/40 text-xs w-4">{i + 1}.</span>
                    <span className="flex-1 text-sm truncate">{r.character.name}</span>
                    <span className="text-smash font-bold text-sm tabular-nums">{fmt(r.smash)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-dark-800 border border-pass/20 rounded-lg p-4">
              <h3 className="font-cinzel text-pass text-xs uppercase tracking-widest mb-3">💀 Most Passed</h3>
              <ol className="space-y-2">
                {topPassed.map((r, i) => (
                  <li key={r.character.id} className="flex items-center gap-2">
                    <span className="text-ash/40 text-xs w-4">{i + 1}.</span>
                    <span className="flex-1 text-sm truncate">{r.character.name}</span>
                    <span className="text-pass font-bold text-sm tabular-nums">{fmt(r.pass)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-dark-800 border border-gold/20 rounded-lg p-4">
              <h3 className="font-cinzel text-gold/80 text-xs uppercase tracking-widest mb-3">⚖ Most Controversial</h3>
              <ol className="space-y-2">
                {mostControversial.length === 0
                  ? <li className="text-ash/30 text-xs">Need ≥5 votes per character</li>
                  : mostControversial.map((r, i) => (
                    <li key={r.character.id} className="flex items-center gap-2">
                      <span className="text-ash/40 text-xs w-4">{i + 1}.</span>
                      <span className="flex-1 text-sm truncate">{r.character.name}</span>
                      <span className="text-gold/80 font-bold text-xs tabular-nums">{Math.round(r.smashRate)}%</span>
                    </li>
                  ))
                }
              </ol>
            </div>
          </section>
        )}

        {/* ── User management ─────────────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-cinzel text-gold/60 text-xs uppercase tracking-widest">
              Users
              {usersLoading && <span className="text-ash/30 normal-case ml-2 font-sans">loading…</span>}
              {!usersLoading && <span className="text-ash/40 normal-case ml-2 font-sans font-normal">{users.length} total</span>}
            </h2>
            <input
              type="text"
              placeholder="Search by name or UID…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="bg-dark-700 border border-dark-500 rounded px-3 py-1.5 text-sm text-priscilla placeholder:text-ash/40 focus:outline-none focus:border-gold/50 w-52"
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-dark-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-800 text-ash/60 text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 text-left w-8"></th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-priscilla select-none" onClick={() => handleUserSort("displayName")}>
                    User{userSortIcon("displayName")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-gold select-none" onClick={() => handleUserSort("currentId")}>
                    Progress{userSortIcon("currentId")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-smash select-none" onClick={() => handleUserSort("totalVotes")}>
                    Votes Cast{userSortIcon("totalVotes")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-priscilla select-none" onClick={() => handleUserSort("smashRate")}>
                    Smash %{userSortIcon("smashRate")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-ash select-none" onClick={() => handleUserSort("lastPlayed")}>
                    Last Played{userSortIcon("lastPlayed")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr><td colSpan={6} className="text-center text-ash/40 py-8 text-xs">Loading users…</td></tr>
                ) : filteredUserRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-ash/30 py-8 text-xs">No users found</td></tr>
                ) : (
                  filteredUserRows.map((u) => (
                    <Fragment key={u.uid}>
                      <tr
                        className="border-t border-dark-700 hover:bg-dark-800/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedUid(expandedUid === u.uid ? null : u.uid)}
                      >
                        <td className="px-3 py-3 text-ash/40 text-xs">
                          {expandedUid === u.uid ? "▾" : "▸"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {safePhotoURL(u.photoURL) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={safePhotoURL(u.photoURL)!} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs text-ash/50 shrink-0">
                                {u.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{u.displayName}</div>
                              <div className="text-xs text-ash/40 font-mono">{u.uid.slice(0, 12)}…</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-gold font-semibold">{u.currentId} / {characters.length}</span>
                            <div className="w-20 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gold/60 rounded-full"
                                style={{ width: `${pct(u.currentId, characters.length)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className="text-smash">{u.smashCount}</span>
                          <span className="text-ash/30 mx-1">/</span>
                          <span className="text-pass">{u.passCount}</span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {u.totalVotes > 0 ? (
                            <span className={u.smashRate >= 50 ? "text-smash font-semibold" : "text-pass font-semibold"}>
                              {u.smashRate}%
                            </span>
                          ) : (
                            <span className="text-ash/30">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-ash/60 text-xs">{fmtDate(u.lastPlayed)}</td>
                      </tr>

                      {/* Expanded user detail */}
                      {expandedUid === u.uid && (
                        <tr className="border-t border-dark-700 bg-dark-900/60">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-xs text-ash/40 uppercase tracking-wider mb-1">Full UID</div>
                                <div className="font-mono text-xs text-ash/70 break-all">{u.uid}</div>
                              </div>
                              <div>
                                <div className="text-xs text-ash/40 uppercase tracking-wider mb-1">Smashes</div>
                                <div className="text-smash font-bold text-lg">{fmt(u.smashCount)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-ash/40 uppercase tracking-wider mb-1">Passes</div>
                                <div className="text-pass font-bold text-lg">{fmt(u.passCount)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-ash/40 uppercase tracking-wider mb-1">Progress</div>
                                <div className="text-gold font-bold text-lg">
                                  {pct(u.currentId, characters.length)}%
                                  <span className="text-ash/40 text-xs font-normal ml-1">
                                    ({u.currentId} chars)
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-ash/40 uppercase tracking-wider mb-1">Last Played</div>
                                <div className="text-ash/70">{fmtDate(u.lastPlayed)}</div>
                              </div>
                              {u.lastReset && (
                                <div>
                                  <div className="text-xs text-ash/40 uppercase tracking-wider mb-1">Last Reset</div>
                                  <div className="text-ash/50">{fmtDate(u.lastReset)}</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Character leaderboard ────────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-cinzel text-gold/60 text-xs uppercase tracking-widest">Character Leaderboard</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Search character…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-dark-700 border border-dark-500 rounded px-3 py-1.5 text-sm text-priscilla placeholder:text-ash/40 focus:outline-none focus:border-gold/50 w-44"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CharacterType | "all")}
                className="bg-dark-700 border border-dark-500 rounded px-3 py-1.5 text-sm text-priscilla focus:outline-none focus:border-gold/50"
              >
                <option value="all">All Types</option>
                <option value="boss">Boss</option>
                <option value="npc">NPC</option>
                <option value="merchant">Merchant</option>
                <option value="summon">Summon</option>
                <option value="mob">Mob</option>
                <option value="mc">Player</option>
              </select>
              <span className="text-ash/40 text-xs self-center">{filteredCharRows.length} / {characters.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-dark-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-800 text-ash/60 text-xs uppercase tracking-wider">
                  <th className="px-3 py-3 text-left w-8">#</th>
                  <th className="px-3 py-3 text-left cursor-pointer hover:text-priscilla select-none" onClick={() => handleCharSort("name")}>
                    Character{charSortIcon("name")}
                  </th>
                  <th className="px-3 py-3 text-center w-20">Type</th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-smash select-none" onClick={() => handleCharSort("smash")}>
                    Smashes{charSortIcon("smash")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-pass select-none" onClick={() => handleCharSort("pass")}>
                    Passes{charSortIcon("pass")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-gold select-none" onClick={() => handleCharSort("total")}>
                    Total{charSortIcon("total")}
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-priscilla select-none w-36" onClick={() => handleCharSort("smashRate")}>
                    Smash %{charSortIcon("smashRate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCharRows.map((row, idx) => (
                  <tr key={row.character.id} className="border-t border-dark-700 hover:bg-dark-800/50 transition-colors">
                    <td className="px-3 py-2.5 text-ash/30 tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <div className="truncate max-w-45" title={row.character.name}>{row.character.name}</div>
                      <div className="text-xs text-ash/30 font-mono">{row.character.id}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs border rounded px-1.5 py-0.5 ${typeBadge[row.character.type]}`}>
                        {row.character.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-smash font-semibold">
                      {row.smash > 0 ? fmt(row.smash) : <span className="text-ash/20">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-pass font-semibold">
                      {row.pass > 0 ? fmt(row.pass) : <span className="text-ash/20">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.total > 0 ? fmt(row.total) : <span className="text-ash/20">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.total > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-dark-600 rounded-full overflow-hidden shrink-0">
                            <div className="h-full bg-smash rounded-full" style={{ width: `${row.smashRate}%` }} />
                          </div>
                          <span className={`tabular-nums font-semibold text-xs w-9 text-right ${row.smashRate >= 50 ? "text-smash" : "text-pass"}`}>
                            {Math.round(row.smashRate)}%
                          </span>
                        </div>
                      ) : <span className="text-ash/20 block text-right">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Security footer ────────────────────────────────────────────── */}
        <section className="bg-dark-800/40 border border-dark-600/50 rounded-lg p-4 text-xs text-ash/40 space-y-1">
          <p className="font-semibold text-ash/60 uppercase tracking-wider mb-1">Security</p>
          <p>• Access restricted to admin email — verified server-side via Firebase Admin SDK token verification</p>
          <p>• User data fetched via server API route — no client-side database rule needed</p>
          <p>• User writes are still owner-only — admin cannot modify user data from this dashboard</p>
          <p>• Admin email is never exposed to the client bundle</p>
        </section>

      </div>
    </div>
  );
}
