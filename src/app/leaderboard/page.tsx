import Link from "next/link";
import type { Metadata } from "next";
import { Heart, Flame, Trophy, Users } from "lucide-react";
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

// Revalidate every 60 seconds — keeps the page fresh without hammering Firebase
export const revalidate = 60;

function getMedalStyle(rank: number) {
  if (rank === 0)
    return "bg-gradient-to-br from-yellow-400/25 to-gold/10 text-gold border-gold/30 shadow-[0_0_16px_rgba(212,175,55,0.2)]";
  if (rank === 1)
    return "bg-gradient-to-br from-slate-300/20 to-slate-400/10 text-slate-300 border-slate-400/25";
  if (rank === 2)
    return "bg-gradient-to-br from-amber-600/20 to-amber-700/10 text-amber-500 border-amber-600/25";
  return "bg-dark-700/30 text-priscilla/55 border-transparent";
}

function TypeBadge({ type }: { type: CharacterType }) {
  const colors = CHARACTER_TYPE_COLORS[type];
  const label = CHARACTER_TYPE_LABELS[type];
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded"
      style={{ color: colors.text, backgroundColor: `${colors.bg}33` }}
    >
      {label}
    </span>
  );
}

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

function EntryRow({
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
  const pct =
    total > 0
      ? Math.round(
          ((mode === "smash" ? entry.smash : entry.pass) / total) * 100
        )
      : 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
        rank < 3
          ? "bg-dark-800/50 border border-dark-600/20"
          : "hover:bg-dark-800/30"
      }`}
    >
      {/* Rank */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${getMedalStyle(
          rank
        )}`}
      >
        {rank + 1}
      </div>

      {/* Thumbnail */}
      {char && (
        <div
          className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border ${
            rank === 0 ? "border-gold/25" : "border-dark-600/30"
          }`}
        >
          <CharacterImage character={char} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-priscilla/85 truncate">
          {char?.name || entry.characterId}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {char && <TypeBadge type={char.type} />}
          <div className="flex-1 h-1.5 rounded-full bg-dark-700/40 max-w-[80px] overflow-hidden">
            <div
              className={`h-full rounded-full ${
                mode === "smash" ? "bg-gold/50" : "bg-pass/50"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] text-priscilla/50 tabular-nums">
            {pct}%
          </span>
        </div>
      </div>

      {/* Votes */}
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-xs tabular-nums flex items-center gap-1 ${
            mode === "smash"
              ? "text-gold/70 font-semibold"
              : "text-priscilla/60"
          }`}
        >
          <Heart
            size={11}
            fill={mode === "smash" ? "currentColor" : "none"}
          />
          {entry.smash.toLocaleString()}
        </span>
        <span
          className={`text-xs tabular-nums flex items-center gap-1 ${
            mode === "pass"
              ? "text-pass/90 font-semibold"
              : "text-priscilla/60"
          }`}
        >
          <Flame size={11} />
          {entry.pass.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export default async function LeaderboardPage() {
  const [smashEntries, passEntries, totalVotes] = await Promise.all([
    getEnrichedLeaderboard("smash", 50),
    getEnrichedLeaderboard("pass", 50),
    getTotalVotes(),
  ]);

  // Top character names for SEO text
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
      <div className="max-w-3xl mx-auto">
        <PageHeader current="/leaderboard" />

        {/* Hero — keyword-rich for SEO */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/15 mb-4">
            <Trophy size={28} className="text-gold" />
          </div>
          <h1 className="text-souls font-black text-gold text-3xl md:text-4xl mb-3 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)]">
            Elden Ring Smash or Pass Leaderboard
          </h1>
          <p className="text-ash/60 max-w-lg mx-auto leading-relaxed">
            Live community rankings from{" "}
            <strong className="text-ash/90 tabular-nums">
              {totalVotes.toLocaleString()}
            </strong>{" "}
            votes on 500+ Elden Ring characters. See which bosses, NPCs, and
            summons the community smashed or passed.
          </p>
        </div>

        {/* SEO summary — visible, crawlable text with top character names */}
        <div className="flex items-start gap-3 rounded-xl bg-dark-800/40 border border-dark-600/15 p-4 mb-8">
          <Users size={16} className="text-ash/40 mt-0.5 shrink-0" />
          <p className="text-xs text-ash/50 leading-relaxed">
            <strong className="text-ash/70">Top smashed:</strong>{" "}
            {topSmashed.join(", ")}.{" "}
            <strong className="text-ash/70">Most passed:</strong>{" "}
            {topPassed.join(", ")}.{" "}
            Rankings update every minute based on real community votes.{" "}
            <Link href="/" className="text-gold/60 hover:text-gold underline underline-offset-2">
              Cast your own votes
            </Link>{" "}
            to influence the leaderboard.
          </p>
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Smashed */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Heart size={16} className="text-gold" fill="currentColor" />
              <h2 className="text-souls font-bold text-gold/80 text-lg">
                Most Smashed Elden Ring Characters
              </h2>
            </div>
            <div className="space-y-1.5">
              {smashEntries.map((entry, i) => (
                <EntryRow
                  key={entry.characterId}
                  entry={entry}
                  rank={i}
                  mode="smash"
                />
              ))}
            </div>
          </section>

          {/* Most Passed */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} className="text-pass" />
              <h2 className="text-souls font-bold text-pass text-lg">
                Most Passed Elden Ring Characters
              </h2>
            </div>
            <div className="space-y-1.5">
              {passEntries.map((entry, i) => (
                <EntryRow
                  key={entry.characterId}
                  entry={entry}
                  rank={i}
                  mode="pass"
                />
              ))}
            </div>
          </section>
        </div>

        {/* SEO-friendly bottom text + CTA */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-sm text-ash/60 max-w-md mx-auto">
            Think the rankings are wrong? Play Elden Ring Smash or Pass and
            vote on every character — from Ranni to the Grafted Scion.
          </p>
          <Link
            href="/"
            className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
          >
            <span className="relative z-10">Cast Your Votes</span>
          </Link>
        </div>
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
