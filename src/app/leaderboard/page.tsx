import Link from "next/link";
import type { Metadata } from "next";
import { Heart, X, Trophy, ArrowRight, Crown, Medal, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CharacterImage } from "@/components/CharacterImage";
import {
  characterById,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
  type Character,
  type CharacterType,
} from "@/data/characters";
import { getLeaderboard, getTotalVotes } from "@/lib/firebase-db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eldensmash.com";

export const metadata: Metadata = {
  title: "Elden Ring Smash or Pass Leaderboard — Most Smashed Characters",
  description:
    "See which Elden Ring characters get smashed the most. Live community rankings from thousands of Smash or Pass votes — Ranni, Malenia, Radahn, Messmer, and 500+ more Elden Ring bosses, NPCs, and summons ranked by the community.",
  keywords: [
    "elden ring smash or pass leaderboard",
    "elden ring smash or pass results",
    "most smashed elden ring characters",
    "elden ring character ranking",
    "elden ring tier list",
    "elden ring community vote",
    "elden ring popularity ranking",
    "ranni smash or pass",
    "malenia smash or pass",
  ],
  openGraph: {
    title: "Elden Ring Smash or Pass Leaderboard — Most Smashed Characters",
    description:
      "Live community rankings — see which Elden Ring characters get smashed the most. Updated every minute from thousands of votes.",
    url: `${SITE_URL}/leaderboard`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Elden Ring Smash or Pass Leaderboard — Most Smashed Characters",
    description:
      "Live community rankings — see which Elden Ring characters get smashed the most.",
  },
  alternates: {
    canonical: `${SITE_URL}/leaderboard`,
  },
};

export const revalidate = 60;

type LeaderboardEntry = {
  characterId: string;
  smash: number;
  pass: number;
  character: Character | null;
};

async function getEnrichedLeaderboard(
  sort: "smash" | "pass",
  limit: number
): Promise<LeaderboardEntry[]> {
  const entries = await getLeaderboard(sort, limit);
  return entries.map((entry) => ({
    ...entry,
    character: characterById.get(entry.characterId) ?? null,
  }));
}

/* ── Helpers ── */

function formatVotes(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function TypeBadge({ type }: { type: CharacterType }) {
  const colors = CHARACTER_TYPE_COLORS[type];
  const label = CHARACTER_TYPE_LABELS[type];
  return (
    <span
      className="text-[10px] leading-none px-1.5 py-0.5 rounded font-medium"
      style={{ color: colors.text, backgroundColor: `${colors.bg}22` }}
    >
      {label}
    </span>
  );
}

/* ── Split ratio bar — the core visual ── */

function RatioBar({
  smash,
  pass,
  mode,
  height = "h-1.5",
}: {
  smash: number;
  pass: number;
  mode: "smash" | "pass";
  height?: string;
}) {
  const total = smash + pass;
  const smashPct = total > 0 ? (smash / total) * 100 : 50;
  return (
    <div className={`w-full ${height} rounded-full overflow-hidden flex`}>
      <div
        className={`${height} transition-all duration-500 ${
          mode === "smash"
            ? "bg-gold/50 rounded-l-full"
            : "bg-gold/20 rounded-l-full"
        }`}
        style={{ width: `${smashPct}%` }}
      />
      <div
        className={`${height} transition-all duration-500 ${
          mode === "pass"
            ? "bg-pass/50 rounded-r-full"
            : "bg-pass/20 rounded-r-full"
        }`}
        style={{ width: `${100 - smashPct}%` }}
      />
    </div>
  );
}

/* ── Top 3 entry (hero treatment) ── */

function TopEntry({
  entry,
  rank,
  mode,
}: {
  entry: LeaderboardEntry;
  rank: number;
  mode: "smash" | "pass";
}) {
  const char = entry.character;
  const total = entry.smash + entry.pass;
  const votes = mode === "smash" ? entry.smash : entry.pass;
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
  const isFirst = rank === 0;

  const rankIcon =
    rank === 0 ? (
      <Crown size={14} className="text-gold" />
    ) : (
      <Medal size={14} className={rank === 1 ? "text-priscilla/60" : "text-amber-500/70"} />
    );

  return (
    <div
      className={`rounded-xl border transition-all group ${
        isFirst
          ? "bg-gold/[0.04] border-gold/12 hover:border-gold/20"
          : "bg-white/[0.015] border-white/[0.05] hover:border-white/[0.08]"
      }`}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        {/* Rank badge */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isFirst
              ? "bg-gold/12 border border-gold/20"
              : rank === 1
                ? "bg-white/[0.04] border border-white/[0.08]"
                : "bg-amber-600/8 border border-amber-600/15"
          }`}
        >
          {rankIcon}
        </div>

        {/* Thumbnail */}
        {char && (
          <div
            className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border ${
              isFirst ? "border-gold/15" : "border-white/[0.06]"
            }`}
          >
            <CharacterImage character={char} />
          </div>
        )}

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold truncate ${
              isFirst ? "text-gold" : "text-priscilla/90"
            }`}
          >
            {char?.name || entry.characterId}
          </div>
          <div className="mt-0.5">
            {char && <TypeBadge type={char.type} />}
          </div>
        </div>

        {/* Percentage — the hero number */}
        <div className="text-right shrink-0">
          <div
            className={`text-lg font-bold tabular-nums leading-none ${
              mode === "smash" ? "text-gold" : "text-pass"
            }`}
          >
            {pct}%
          </div>
          <div className="text-[10px] text-priscilla/30 mt-0.5">
            {mode === "smash" ? "smash" : "pass"} rate
          </div>
        </div>
      </div>

      {/* Ratio bar + vote breakdown */}
      <div className="px-4 pb-3.5">
        <RatioBar smash={entry.smash} pass={entry.pass} mode={mode} height="h-1.5" />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] tabular-nums flex items-center gap-1 text-gold/50">
            <Heart size={9} fill="currentColor" />
            {entry.smash.toLocaleString()}
          </span>
          <span className="text-[10px] text-priscilla/20 tabular-nums">
            {total.toLocaleString()} total
          </span>
          <span className="text-[11px] tabular-nums flex items-center gap-1 text-pass/50">
            <X size={9} />
            {entry.pass.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── List row (rank 4+) ── */

function EntryRow({
  entry,
  rank,
  mode,
  even,
}: {
  entry: LeaderboardEntry;
  rank: number;
  mode: "smash" | "pass";
  even: boolean;
}) {
  const char = entry.character;
  const total = entry.smash + entry.pass;
  const votes = mode === "smash" ? entry.smash : entry.pass;
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

  return (
    <div
      className={`flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 transition-colors group ${
        even ? "bg-white/[0.012]" : ""
      } hover:bg-white/[0.03]`}
    >
      {/* Rank */}
      <span className="w-5 text-right text-[11px] tabular-nums text-priscilla/25 font-medium shrink-0 group-hover:text-priscilla/45 transition-colors">
        {rank + 1}
      </span>

      {/* Thumbnail */}
      {char && (
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/[0.05]">
          <CharacterImage character={char} />
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-priscilla/80 truncate">
          {char?.name || entry.characterId}
        </div>
      </div>

      {/* Ratio bar — desktop only */}
      <div className="hidden sm:block w-20 shrink-0">
        <RatioBar smash={entry.smash} pass={entry.pass} mode={mode} height="h-1" />
      </div>

      {/* Percentage */}
      <span
        className={`text-xs tabular-nums font-semibold w-10 text-right shrink-0 ${
          mode === "smash" ? "text-gold/75" : "text-pass/75"
        }`}
      >
        {pct}%
      </span>

      {/* Vote counts — compact */}
      <div className="flex items-center gap-2 shrink-0 w-[88px] sm:w-[104px] justify-end">
        <span className="text-[11px] tabular-nums flex items-center gap-0.5 text-gold/40">
          <Heart size={8} fill="currentColor" />
          {formatVotes(entry.smash)}
        </span>
        <span className="text-[11px] tabular-nums flex items-center gap-0.5 text-pass/40">
          <X size={8} />
          {formatVotes(entry.pass)}
        </span>
      </div>
    </div>
  );
}

/* ── Section ── */

function LeaderboardSection({
  title,
  entries,
  mode,
  icon,
}: {
  title: string;
  entries: LeaderboardEntry[];
  mode: "smash" | "pass";
  icon: React.ReactNode;
}) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4 px-1">
        {icon}
        <h2 className="text-souls font-bold text-base tracking-wide">
          <span className={mode === "smash" ? "text-gold/90" : "text-pass/90"}>
            {title}
          </span>
        </h2>
        <span className="text-[10px] text-priscilla/25 tabular-nums ml-auto">
          {entries.length} ranked
        </span>
      </div>

      {/* Top 3 — card treatment */}
      <div className="space-y-2 mb-4">
        {top3.map((entry, i) => (
          <TopEntry
            key={entry.characterId}
            entry={entry}
            rank={i}
            mode={mode}
          />
        ))}
      </div>

      {/* Column headers */}
      {rest.length > 0 && (
        <div className="rounded-xl border border-white/[0.04] overflow-hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 border-b border-white/[0.04]">
            <span className="w-5 shrink-0" />
            <span className="w-8 shrink-0" />
            <span className="flex-1 text-[10px] text-priscilla/25 uppercase tracking-wider font-medium">Character</span>
            <span className="hidden sm:block w-20 shrink-0 text-[10px] text-priscilla/25 uppercase tracking-wider font-medium text-center">Ratio</span>
            <span className="w-10 shrink-0 text-[10px] text-priscilla/25 uppercase tracking-wider font-medium text-right">Rate</span>
            <span className="w-[88px] sm:w-[104px] shrink-0 text-[10px] text-priscilla/25 uppercase tracking-wider font-medium text-right">Votes</span>
          </div>
          {rest.map((entry, i) => (
            <EntryRow
              key={entry.characterId}
              entry={entry}
              rank={i + 3}
              mode={mode}
              even={i % 2 === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Page ── */

export default async function LeaderboardPage() {
  const [smashEntries, passEntries, totalVotes] = await Promise.all([
    getEnrichedLeaderboard("smash", 50),
    getEnrichedLeaderboard("pass", 50),
    getTotalVotes(),
  ]);

  const topSmashed = smashEntries
    .slice(0, 5)
    .map((e) => e.character?.name)
    .filter(Boolean);
  const topPassed = passEntries
    .slice(0, 3)
    .map((e) => e.character?.name)
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Elden Ring Smash or Pass Leaderboard — Most Smashed Characters",
    description: `Community rankings from ${totalVotes.toLocaleString()} votes on 500+ Elden Ring characters.`,
    numberOfItems: smashEntries.length,
    itemListElement: smashEntries.slice(0, 10).map((entry, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: entry.character?.name || entry.characterId,
      description: `${entry.smash.toLocaleString()} smashes, ${entry.pass.toLocaleString()} passes`,
    })),
  };

  return (
    <main className="min-h-dvh py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <PageHeader current="/leaderboard" />

        {/* ━━ Hero ━━ */}
        <section className="relative text-center pt-8 pb-10 mb-8 overflow-hidden">
          {/* Atmospheric background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[100px] opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #ffd700 0%, transparent 70%)" }}
            />
          </div>

          <div className="relative">
            {/* Eyebrow with live indicator */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-priscilla/35 font-medium">
                Live Leaderboard
              </span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
            </div>

            <h1
              className="text-souls font-black leading-[1.1] mb-4"
              style={{
                fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              }}
            >
              <span className="text-priscilla/90">Community</span>{" "}
              <span
                className="text-gold"
                style={{ textShadow: "0 0 40px rgba(255,215,0,0.15)" }}
              >
                Rankings
              </span>
            </h1>

            <p className="text-priscilla/45 max-w-sm mx-auto text-sm leading-relaxed mb-8">
              Did you smash Ranni? So did everyone else. See where your
              picks stack up.
            </p>

            {/* Stats strip */}
            <div className="inline-flex items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 sm:px-7 py-3 gap-5 sm:gap-8 mb-8">
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-priscilla/85 tabular-nums">{totalVotes.toLocaleString()}</div>
                <div className="text-[10px] text-priscilla/30 mt-0.5">Votes</div>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-priscilla/85">500+</div>
                <div className="text-[10px] text-priscilla/30 mt-0.5">Characters</div>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="text-center">
                <div className="text-base sm:text-lg font-bold text-priscilla/85">60s</div>
                <div className="text-[10px] text-priscilla/30 mt-0.5">Refresh</div>
              </div>
            </div>

            <div>
              <Link
                href="/"
                className="btn-primary px-7 py-2.5 text-xs inline-flex items-center gap-2 group"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Cast Your Votes
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ━━ Leaderboard columns ━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
          <LeaderboardSection
            title="Most Smashed"
            entries={smashEntries}
            mode="smash"
            icon={
              <div className="w-6 h-6 rounded-md bg-gold/10 border border-gold/15 flex items-center justify-center">
                <TrendingUp size={12} className="text-gold" />
              </div>
            }
          />
          <LeaderboardSection
            title="Most Passed"
            entries={passEntries}
            mode="pass"
            icon={
              <div className="w-6 h-6 rounded-md bg-pass/10 border border-pass/15 flex items-center justify-center">
                <TrendingDown size={12} className="text-pass" />
              </div>
            }
          />
        </div>

        {/* ━━ Bottom CTA ━━ */}
        <div className="text-center mt-16 mb-4">
          <div className="flex items-center gap-6 mb-8" aria-hidden="true">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <Trophy size={10} className="text-gold/20" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
          </div>
          <p className="text-sm text-priscilla/45 max-w-sm mx-auto mb-6">
            Think the rankings are wrong? Vote on every character.
          </p>
          <Link
            href="/"
            className="btn-primary px-9 py-3 text-sm inline-flex items-center gap-2 group"
          >
            <span className="relative z-10 flex items-center gap-2">
              Start Playing
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </div>

        {/* SEO summary — crawlable text, visually subtle at bottom */}
        <p className="text-[11px] text-priscilla/30 leading-relaxed text-center max-w-lg mx-auto mt-10">
          <span className="text-priscilla/45">Top smashed:</span>{" "}
          {topSmashed.join(", ")}.{" "}
          <span className="text-priscilla/45">Most passed:</span>{" "}
          {topPassed.join(", ")}.{" "}
          Updated every minute from real community votes.
        </p>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}
