"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserData, buildUserStats, resetUserHistory, setUserPublic, updateUserProfile } from "@/lib/firebase-user";
import toast from "react-hot-toast";
import {
  CHARACTER_TYPE_COLORS,
  CHARACTER_TYPE_LABELS,
  type CharacterType,
} from "@/data/characters";
import { LazyCharCard } from "./LazyCharCard";
import { ShareButtons } from "./ShareButtons";
import {
  X,
  Heart,
  Skull,
  Trophy,
  LogIn,
  Loader2,
  RefreshCw,
  Flame,
  Trash2,
  AlertTriangle,
  Globe,
  Lock,
  Link2,
  Settings,
  User,
  Check,
} from "lucide-react";

interface UserProfileProps {
  onClose: () => void;
  /** Which tab to open on mount */
  defaultTab?: "profile" | "settings";
  /** Called whenever the public/private toggle changes so parent can sync state */
  onPublicChange?: (isPublic: boolean) => void;
}

type LoadState = "loading" | "empty" | "ready" | "unauthenticated";
type Tab = "profile" | "settings";

export function UserProfile({ onClose, defaultTab = "profile", onPublicChange }: UserProfileProps) {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [stats, setStats] = useState<ReturnType<typeof buildUserStats> | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  // Editable profile fields
  const [editName, setEditName] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadState("loading");
    try {
      const data = await getUserData(user.uid);
      if (!data || !data.votes || Object.keys(data.votes).length === 0) {
        const name = data?.displayName ?? user.displayName ?? "Tarnished";
        setDisplayName(name);
        setEditName(name);
        setEditTagline(data?.tagline ?? "");
        setPhotoURL(data?.photoURL ?? user.photoURL ?? null);
        setIsPublic(data?.isPublic === true);
        setLoadState("empty");
        return;
      }
      const name = data.displayName ?? user.displayName ?? "Tarnished";
      setDisplayName(name);
      setEditName(name);
      setEditTagline(data.tagline ?? "");
      setPhotoURL(data.photoURL ?? user.photoURL ?? null);
      setIsPublic(data.isPublic === true);
      setStats(buildUserStats(data.votes));
      setLoadState("ready");
    } catch (err) {
      console.error("Failed to load history:", err);
      setLoadState("empty");
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadState("unauthenticated");
      return;
    }
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign-in failed:", err);
    } finally {
      setSigningIn(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    try {
      setResetting(true);
      await resetUserHistory(user);
      setShowResetConfirm(false);
      setStats(null);
      setLoadState("empty");
      toast.success("History erased", { duration: 2500 });
    } catch (err) {
      console.error("Reset failed:", err);
      toast.error("Failed to erase history");
    } finally {
      setResetting(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!user) return;
    try {
      setTogglingPublic(true);
      const next = !isPublic;
      await setUserPublic(user, next);
      setIsPublic(next);
      onPublicChange?.(next);
      if (next) {
        toast.success("Profile is now public — share your link!", { icon: "🔗", duration: 3500 });
      } else {
        toast("Profile set to private", { icon: "🔒", duration: 2500 });
      }
    } catch (err) {
      console.error("Failed to update profile visibility:", err);
      toast.error("Failed to update privacy setting");
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleCopyLink = () => {
    if (!user) return;
    const url = `${window.location.origin}/users/${user.uid}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Profile link copied!", { icon: "✓", duration: 2000 });
    }).catch(() => {
      toast(`Your link: /users/${user.uid}`, { duration: 5000 });
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSavingProfile(true);
      await updateUserProfile(user, { displayName: editName, tagline: editTagline });
      setDisplayName(editName.trim() || "Tarnished");
      toast.success("Profile updated", { duration: 2000 });
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMakePublicAndCopy = async () => {
    if (!user) return;
    try {
      setTogglingPublic(true);
      await setUserPublic(user, true);
      setIsPublic(true);
      onPublicChange?.(true);
      const url = `${window.location.origin}/users/${user.uid}`;
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Profile is public! Link copied.", { duration: 3000 });
      }).catch(() => {
        toast.success("Profile is now public!", { duration: 3000 });
      });
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setTogglingPublic(false);
    }
  };

  // Thirst level label
  const thirstLevel = (pct: number) =>
    pct >= 80 ? "Maidenless Behavior"
    : pct >= 60 ? "Down Horrendous"
    : pct >= 40 ? "Perfectly Balanced"
    : pct >= 20 ? "Picky Tarnished"
    : "Heart of Stone";

  // Group smashed by type — memoized so tab switches / input typing don't recompute
  const smashedByType = useMemo(() => {
    if (!stats) return {};
    return stats.smashed.reduce<Record<string, typeof stats.smashed>>((acc, char) => {
      if (!acc[char.type]) acc[char.type] = [];
      acc[char.type].push(char);
      return acc;
    }, {});
  }, [stats]);

  const isAuthenticated = loadState !== "unauthenticated";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Profile"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[88vh] card-dark flex flex-col overflow-hidden shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-700/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Flame size={15} className="text-ember animate-bonfire shrink-0" />
            {isAuthenticated && displayName ? (
              <div className="flex items-center gap-2 min-w-0">
                {photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-6 h-6 rounded-full border border-dark-600/60 object-cover shrink-0"
                  />
                )}
                <span className="text-souls text-sm font-bold text-gold tracking-wider truncate">
                  {displayName}
                </span>
              </div>
            ) : (
              <h2 className="text-souls text-sm font-bold text-gold tracking-wider">
                Profile
              </h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            {loadState === "ready" && tab === "profile" && (
              <button
                onClick={fetchHistory}
                className="p-1.5 rounded-lg text-ash/40 hover:text-gold transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ash/40 hover:text-pass transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Tab bar (only when authenticated) ── */}
        {isAuthenticated && (
          <div className="flex border-b border-dark-700/40 shrink-0 px-5">
            <TabButton
              active={tab === "profile"}
              onClick={() => setTab("profile")}
              icon={<User size={12} />}
              label="Profile"
            />
            <TabButton
              active={tab === "settings"}
              onClick={() => setTab("settings")}
              icon={<Settings size={12} />}
              label="Settings"
            />
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5">

          {/* ══ UNAUTHENTICATED ══ */}
          {loadState === "unauthenticated" && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <div className="w-14 h-14 rounded-full bg-dark-700/60 flex items-center justify-center">
                <LogIn size={22} className="text-ash/40" />
              </div>
              <div>
                <p className="text-priscilla/70 font-medium mb-1">Sign in to see your profile</p>
                <p className="text-xs text-ash/40">
                  Your smash picks are saved across sessions when you&apos;re logged in
                </p>
              </div>
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2"
              >
                {signingIn ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                <span className="relative z-10">{signingIn ? "Signing in…" : "Sign in with Google"}</span>
              </button>
            </div>
          )}

          {/* ══ PROFILE TAB ══ */}
          {tab === "profile" && isAuthenticated && (
            <>
              {/* Loading */}
              {loadState === "loading" && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Loader2 size={22} className="text-gold/50 animate-spin" />
                  <p className="text-xs text-ash/40">Loading your history…</p>
                </div>
              )}

              {/* Empty */}
              {loadState === "empty" && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Skull size={26} className="text-ash/30" />
                  <p className="text-priscilla/50 font-medium">No history yet</p>
                  <p className="text-xs text-ash/30">Finish a game to save your picks here</p>
                </div>
              )}

              {/* Ready */}
              {loadState === "ready" && stats && (
                <div className="space-y-7 animate-fade-in">
                  {/* Summary row */}
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-xs text-ash/50">
                      All-time picks — {stats.total} characters judged
                    </p>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <Heart size={16} className="mx-auto mb-1 text-gold" fill="currentColor" />
                        <div className="text-3xl font-black text-souls text-gold tabular-nums">
                          {stats.smashed.length}
                        </div>
                        <div className="text-[10px] text-ash mt-0.5">Smashed</div>
                      </div>
                      <div className="text-xl text-dark-600 text-souls">/</div>
                      <div className="text-center">
                        <X size={16} className="mx-auto mb-1 text-pass" />
                        <div className="text-3xl font-black text-souls text-pass tabular-nums">
                          {stats.passed.length}
                        </div>
                        <div className="text-[10px] text-ash mt-0.5">Passed</div>
                      </div>
                    </div>

                    {/* Smash rate bar */}
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-souls text-ash/70">{thirstLevel(stats.smashPercent)}</span>
                        <span className="text-gold font-bold tabular-nums">{stats.smashPercent}%</span>
                      </div>
                      <div className="h-2.5 bg-dark-700/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pass via-ember to-gold rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${stats.smashPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Share */}
                  {stats.total > 0 && (
                    <div className="flex flex-col items-center gap-2 mb-2">
                      <span className="text-[10px] text-priscilla/30 uppercase tracking-widest">Share your results</span>
                      <ShareButtons
                        smashed={stats.smashed.length}
                        passed={stats.passed.length}
                        total={stats.total}
                        smashPercent={stats.smashPercent}
                        profileUrl={user && isPublic ? `https://eldensmash.com/users/${user.uid}` : null}
                      />
                      <button
                        onClick={() => {
                          if (!isPublic) {
                            handleMakePublicAndCopy();
                            return;
                          }
                          handleCopyLink();
                        }}
                        className="flex items-center gap-1.5 text-xs text-ranni/60
                          hover:text-ranni transition-colors mt-1"
                      >
                        {isPublic ? <Link2 size={11} /> : <Globe size={11} />}
                        {isPublic ? "Share Profile" : "Make Public & Share"}
                      </button>
                    </div>
                  )}

                  {/* Smash list grouped by type */}
                  {stats.smashed.length > 0 && (
                    <div>
                      <h3 className="text-souls text-sm font-bold text-gold mb-4 flex items-center gap-2">
                        <Trophy size={14} />
                        Your Smash List
                      </h3>
                      {Object.entries(smashedByType).map(([type, chars]) => {
                        const colors = CHARACTER_TYPE_COLORS[type as CharacterType];
                        return (
                          <div key={type} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="type-pill"
                                style={{
                                  background: colors.bg,
                                  color: colors.text,
                                  border: `1px solid ${colors.border}`,
                                }}
                              >
                                {CHARACTER_TYPE_LABELS[type as CharacterType]}
                              </span>
                              <span className="text-[10px] text-ash/50 tabular-nums">{chars.length}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {chars.map((char) => (
                                <LazyCharCard key={char.id} char={char} imgSize="w-9 h-9" />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reject pile */}
                  {stats.passed.length > 0 && (
                    <div>
                      <h3 className="text-souls text-sm font-bold text-pass/60 mb-3 flex items-center gap-2">
                        <Skull size={14} />
                        The Reject Pile
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.passed.map((char) => (
                          <span
                            key={char.id}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700/30
                              text-priscilla/25 border border-dark-700/20 hover:text-priscilla/45 transition-colors"
                          >
                            {char.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ SETTINGS TAB ══ */}
          {tab === "settings" && isAuthenticated && (
            <div className="space-y-6 animate-fade-in">

              {/* ── Profile info ── */}
              <section>
                <h3 className="text-[10px] font-semibold text-ash/40 uppercase tracking-widest mb-3">
                  Your Profile
                </h3>
                <div className="card-dark p-4 space-y-4">
                  {/* Display name */}
                  <div>
                    <label className="block text-[11px] text-ash/50 mb-1.5" htmlFor="edit-name">
                      Display name
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={50}
                      placeholder="Tarnished"
                      className="w-full bg-dark-700/50 border border-dark-600/60 rounded-lg px-3 py-2
                        text-sm text-priscilla/80 placeholder:text-ash/25
                        focus:outline-none focus:border-gold/40 focus:bg-dark-700/80
                        transition-colors"
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-[11px] text-ash/50 mb-1.5" htmlFor="edit-tagline">
                      Tagline <span className="text-ash/30">(shown on your public profile)</span>
                    </label>
                    <input
                      id="edit-tagline"
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      maxLength={60}
                      placeholder="e.g. Ranni is my queen"
                      className="w-full bg-dark-700/50 border border-dark-600/60 rounded-lg px-3 py-2
                        text-sm text-priscilla/80 placeholder:text-ash/25
                        focus:outline-none focus:border-gold/40 focus:bg-dark-700/80
                        transition-colors"
                    />
                    <p className="text-[10px] text-ash/25 mt-1 text-right tabular-nums">
                      {editTagline.length}/60
                    </p>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                      bg-gold/15 text-gold border border-gold/25
                      hover:bg-gold/25 hover:border-gold/40 transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingProfile
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Check size={11} />}
                    {savingProfile ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </section>

              {/* ── Privacy ── */}
              <section>
                <h3 className="text-[10px] font-semibold text-ash/40 uppercase tracking-widest mb-3">
                  Privacy
                </h3>
                <div className="card-dark p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isPublic
                          ? <Globe size={13} className="text-smash shrink-0" />
                          : <Lock size={13} className="text-ash/40 shrink-0" />}
                        <span className={`text-sm font-medium ${isPublic ? "text-smash" : "text-priscilla/60"}`}>
                          {isPublic ? "Public profile" : "Private profile"}
                        </span>
                      </div>
                      <p className="text-[11px] text-ash/40 leading-relaxed">
                        {isPublic
                          ? "Anyone with your link can view your smash picks."
                          : "Only you can see your picks. Enable to get a shareable link."}
                      </p>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={handleTogglePublic}
                      disabled={togglingPublic}
                      role="switch"
                      aria-checked={isPublic}
                      aria-label={isPublic ? "Make profile private" : "Make profile public"}
                      className={`relative inline-flex shrink-0 w-11 h-6 rounded-full
                        transition-colors duration-200 cursor-pointer
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isPublic ? "bg-smash/70" : "bg-dark-600/80"}`}
                    >
                      {togglingPublic
                        ? <Loader2 size={10} className="m-auto animate-spin text-white/60" />
                        : <span
                            className={`pointer-events-none absolute top-0.5 left-0.5
                              h-5 w-5 rounded-full bg-white shadow
                              transition-transform duration-200
                              ${isPublic ? "translate-x-5" : "translate-x-0"}`}
                          />
                      }
                    </button>
                  </div>

                  {/* Copy link */}
                  {isPublic && (
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 text-xs text-ranni/60
                        hover:text-ranni transition-colors"
                    >
                      <Link2 size={11} />
                      Copy profile link
                    </button>
                  )}
                </div>
              </section>

              {/* ── Account ── */}
              <section>
                <h3 className="text-[10px] font-semibold text-ash/40 uppercase tracking-widest mb-3">
                  Account
                </h3>
                <div className="card-dark p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-priscilla/60 mb-0.5">Signed in as</p>
                      <p className="text-sm font-medium text-priscilla/80">
                        {user?.email ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Danger zone ── */}
              <section>
                <h3 className="text-[10px] font-semibold text-pass/40 uppercase tracking-widest mb-3">
                  Danger Zone
                </h3>
                <div className="card-dark p-4 border border-pass/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-priscilla/60 mb-0.5">Erase all history</p>
                      <p className="text-[11px] text-ash/35 leading-relaxed">
                        Permanently deletes all your picks. Cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                        text-pass/50 border border-pass/20 hover:bg-pass/10 hover:text-pass/80
                        hover:border-pass/40 transition-all"
                    >
                      <Trash2 size={11} />
                      Erase
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* ── Reset confirmation overlay ── */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-dark-900/70 backdrop-blur-sm rounded-2xl">
          <div className="card-dark p-6 rounded-2xl w-full max-w-sm border border-pass/20 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2.5 mb-3">
              <AlertTriangle size={18} className="text-pass shrink-0" />
              <h3 className="text-souls text-sm font-bold text-pass">Erase All History?</h3>
            </div>
            <p className="text-xs text-ash/60 mb-5 leading-relaxed">
              This permanently deletes all your smash and pass picks.
              Your votes are archived but won&apos;t be recoverable from the UI.
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg border border-dark-600/50 text-xs text-priscilla/50
                  hover:text-priscilla/80 hover:border-dark-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 py-2 rounded-lg border border-pass/40 text-xs text-pass/80
                  hover:bg-pass/10 hover:border-pass/60 transition-all flex items-center justify-center gap-1.5
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                {resetting ? "Erasing…" : "Yes, erase everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab button sub-component ──────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold tracking-wide
        border-b-2 transition-all -mb-px
        ${active
          ? "border-gold text-gold"
          : "border-transparent text-ash/40 hover:text-ash/70 hover:border-dark-600"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
