import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Heart, X, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CharacterImage } from "@/components/CharacterImage";
import {
  characters,
  characterById,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
} from "@/data/characters";
import { getCharacterVotes } from "@/lib/firebase-db";
import { CHARACTER_LORE } from "./lore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eldensmash.com";
const MIN_PERCENT_RANK_VOTES = 25;

export const revalidate = 60;

// ── Data fetching ───────────────────────────────────────────────────────────

const fetchCharacterStats = cache(async function fetchCharacterStats(id: string) {
  const [votes, allCharacters] = await Promise.all([
    getCharacterVotes(id),
    Promise.all(
      characters.map(async (char) => {
        const v = await getCharacterVotes(char.id);
        const total = v.smash + v.pass;
        const smashPct = total > 0 ? Math.round((v.smash / total) * 100) : 0;

        return {
          characterId: char.id,
          smash: v.smash,
          pass: v.pass,
          total,
          smashPct,
        };
      })
    ),
  ]);

  const total = votes.smash + votes.pass;
  const smashPct = total > 0 ? Math.round((votes.smash / total) * 100) : 0;

  const percentRankBoard = allCharacters
    .filter((entry) => entry.total >= MIN_PERCENT_RANK_VOTES)
    .sort((a, b) => {
      if (b.smashPct !== a.smashPct) return b.smashPct - a.smashPct;
      return b.total - a.total;
    });

  const smashRank = percentRankBoard.findIndex((entry) => entry.characterId === id) + 1;

  return {
    votes,
    total,
    smashPct,
    smashRank: smashRank > 0 ? smashRank : null,
    isRankedByPercent: total >= MIN_PERCENT_RANK_VOTES,
  };
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function toSingularTypeLabel(type: keyof typeof CHARACTER_TYPE_LABELS) {
  const singularLabels: Record<keyof typeof CHARACTER_TYPE_LABELS, string> = {
    boss: "Boss",
    npc: "NPC",
    mob: "Creature",
    mc: "Main Character",
    merchant: "Merchant",
    summon: "Summon",
  };

  return singularLabels[type] ?? "Character";
}

// ── Static params ───────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return characters.map((c) => ({ id: c.id }));
}

// ── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const char = characterById.get(id);
  if (!char) return { title: "Character not found — Elden Smash" };

  const { smashPct, total } = await fetchCharacterStats(id);
  const singularType = toSingularTypeLabel(char.type).toLowerCase();

  const title = `${char.name} — Smash or Pass? ${smashPct}% Smash Rate | Elden Smash`;
  const description = `${char.name} has a ${smashPct}% smash rate from ${total} votes on Elden Smash. Read ${char.name}'s Elden Ring lore, see why players smash or pass, and compare this ${singularType} against 500+ Elden Ring characters.`;

  return {
    title,
    description,
    keywords: [
      `${char.name.toLowerCase()} smash or pass`,
      `${char.name.toLowerCase()} elden ring`,
      `${char.name.toLowerCase()} lore`,
      `${char.name.toLowerCase()} ranking`,
      `elden ring ${char.name.toLowerCase()}`,
      `elden ring ${char.name.toLowerCase()} lore`,
      "elden ring smash or pass",
      "elden ring character ranking",
      "elden ring characters ranked",
      "elden ring characters",
      "elden ring bosses",
      "elden ring npcs",
      "elden ring lore",
    ],
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/characters/${id}`,
      siteName: "Elden Smash",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${char.name} — ${smashPct}% Smash Rate`,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/characters/${id}`,
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const char = characterById.get(id);
  if (!char) notFound();

  const { votes, smashRank, total, smashPct, isRankedByPercent } =
    await fetchCharacterStats(id);

  const passPct = 100 - smashPct;
  const typeColors = CHARACTER_TYPE_COLORS[char.type];
  const singularTypeLabel = toSingularTypeLabel(char.type);
  const customLore = CHARACTER_LORE[id];
  const shortName = char.name.split(",")[0];

  const lore = customLore ?? {
    lore: [
      `${char.name} is a ${singularTypeLabel.toLowerCase()} in Elden Ring. ${char.description}`,
      `${char.name} is one of over 500 characters featured on Elden Smash, where players can vote smash or pass and compare community rankings across bosses, NPCs, enemies, summons, and creatures from the Lands Between.`,
    ],
    whySmash: [
      `A memorable ${singularTypeLabel.toLowerCase()} design that stands out in Elden Ring`,
      "Strong visual identity, lore presence, or overall vibe",
      "Popularity with players can make them a community favorite",
    ],
    whyPass: [
      "Some players are influenced by difficulty, hostility, or unsettling lore",
      "Others may simply prefer different Elden Ring character types or designs",
      "Community votes often reflect both meme value and actual character appeal",
    ],
  };

  const verdict =
    smashPct >= 80
      ? { label: "Fan Favorite", tone: "text-gold" }
      : smashPct >= 60
        ? { label: "Mostly Smashed", tone: "text-gold/70" }
        : smashPct >= 40
          ? { label: "Divisive", tone: "text-priscilla/60" }
          : smashPct >= 20
            ? { label: "Mostly Passed", tone: "text-pass/70" }
            : { label: "Hard Pass", tone: "text-pass" };

  const relatedCharacters = characters
    .filter((c) => c.id !== char.id && c.type === char.type)
    .slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${char.name} — Smash or Pass?`,
        url: `${SITE_URL}/characters/${id}`,
        description: `${char.name} has a ${smashPct}% smash rate from ${total} votes on Elden Smash.`,
      },
      {
        "@type": "Thing",
        name: char.name,
        description: char.description,
        url: `${SITE_URL}/characters/${id}`,
        additionalProperty: [
          { "@type": "PropertyValue", name: "Smash Rate", value: `${smashPct}%` },
          { "@type": "PropertyValue", name: "Pass Rate", value: `${passPct}%` },
          { "@type": "PropertyValue", name: "Total Votes", value: total.toString() },
          ...(isRankedByPercent && smashRank
            ? [
                {
                  "@type": "PropertyValue",
                  name: "Smash Percentage Rank",
                  value: smashRank.toString(),
                },
              ]
            : []),
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Characters",
            item: `${SITE_URL}/characters`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: char.name,
            item: `${SITE_URL}/characters/${id}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-dvh py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <PageHeader current="/leaderboard" />

        <nav className="text-[11px] text-priscilla/35 mb-4 mt-2">
          <Link href="/" className="hover:text-priscilla/60 transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/characters" className="hover:text-priscilla/60 transition-colors">
            Characters
          </Link>
          <span className="mx-2">/</span>
          <span className="text-priscilla/55">{char.name}</span>
        </nav>

        <section className="flex gap-5 sm:gap-6 mb-8">
          <div className="shrink-0 w-40 sm:w-52">
            <div className="relative aspect-square rounded-xl overflow-hidden border border-white/[0.08] bg-dark-800 isolate">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <CharacterImage character={char} contain />
              </div>

              <div className="absolute inset-0 z-30 pointer-events-none">
                <div
                  className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm shadow-sm"
                  style={{
                    color: typeColors.text,
                    backgroundColor: `${typeColors.bg}D9`,
                    border: `1px solid ${typeColors.border}`,
                  }}
                >
                  {singularTypeLabel}
                </div>

                {isRankedByPercent && smashRank && smashRank <= 50 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-dark-900/90 text-priscilla/90 border border-white/[0.12] backdrop-blur-sm tabular-nums whitespace-nowrap shadow-md">
                    #{smashRank} by smash %
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 py-1">
            <h1
              className="text-souls font-black text-gold leading-tight mb-2"
              style={{ fontSize: "clamp(1.25rem, 4vw, 1.75rem)" }}
            >
              {char.name}
            </h1>

            <p className="text-[13px] text-priscilla/50 leading-relaxed mb-4 line-clamp-3">
              {char.description}
            </p>

            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl sm:text-3xl font-black tabular-nums text-gold"
                style={{ fontFamily: "var(--font-cinzel)" }}
              >
                {smashPct}%
              </span>
              <span className={`text-xs font-medium ${verdict.tone}`}>
                {verdict.label}
              </span>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="w-full h-2 rounded-full overflow-hidden flex mb-2.5">
            <div
              className="h-full bg-gold/60 rounded-l-full"
              style={{ width: `${smashPct}%` }}
            />
            <div
              className="h-full bg-pass/40 rounded-r-full"
              style={{ width: `${passPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] mb-5">
            <span className="flex items-center gap-1 text-gold/60">
              <Heart size={9} fill="currentColor" />
              {votes.smash.toLocaleString()} smashed
            </span>
            <span className="text-priscilla/20 tabular-nums text-[10px]">
              {total.toLocaleString()} total
            </span>
            <span className="flex items-center gap-1 text-pass/50">
              <X size={9} />
              {votes.pass.toLocaleString()} passed
            </span>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
            <h2 className="text-souls font-bold text-gold/70 text-xs mb-3 uppercase tracking-[0.15em]">
              {char.name} Smash Rate
            </h2>
            <div className="text-sm text-priscilla/55 leading-relaxed space-y-3">
              <p>
                {char.name} currently has a <strong>{smashPct}% smash rate</strong> based on{" "}
                <strong>{total.toLocaleString()} total votes</strong>
                {isRankedByPercent && smashRank ? (
                  <>
                    , placing them at <strong>#{smashRank}</strong> on the smash percentage
                    leaderboard.
                  </>
                ) : total < MIN_PERCENT_RANK_VOTES ? (
                  <>
                    . They need at least <strong>{MIN_PERCENT_RANK_VOTES}</strong> total votes
                    to enter the smash percentage rankings.
                  </>
                ) : (
                  <>.</>
                )}
              </p>
              <p>
                Community votes reflect a mix of lore, design, difficulty, meme value, and
                overall popularity within Elden Ring.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lore.whySmash && lore.whySmash.length > 0 && (
              <div className="rounded-xl border border-gold/10 bg-gold/[0.03] p-4">
                <h3 className="text-[11px] font-semibold text-gold/60 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <Heart size={10} fill="currentColor" />
                  Why Players Smash {shortName}
                </h3>
                <ul className="space-y-1.5">
                  {lore.whySmash.map((point, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13px] text-priscilla/50 leading-relaxed"
                    >
                      <span className="text-gold/30 mt-0.5 shrink-0">&#8226;</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lore.whyPass && lore.whyPass.length > 0 && (
              <div className="rounded-xl border border-pass/10 bg-pass/[0.03] p-4">
                <h3 className="text-[11px] font-semibold text-pass/60 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                  <X size={10} />
                  Why Players Pass {shortName}
                </h3>
                <ul className="space-y-1.5">
                  {lore.whyPass.map((point, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13px] text-priscilla/50 leading-relaxed"
                    >
                      <span className="text-pass/30 mt-0.5 shrink-0">&#8226;</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
            <h2 className="text-souls font-bold text-gold/70 text-xs mb-3 uppercase tracking-[0.15em]">
              Elden Ring Lore
            </h2>
            <div className="text-sm text-priscilla/55 leading-relaxed space-y-3">
              {lore.lore.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {relatedCharacters.length > 0 && (
          <section className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
            <h2 className="text-souls font-bold text-gold/70 text-xs mb-3 uppercase tracking-[0.15em]">
              Related Characters
            </h2>

            <div className="flex flex-wrap gap-2">
              {relatedCharacters.map((related) => (
                <Link
                  key={related.id}
                  href={`/characters/${related.id}`}
                  className="px-3 py-2 rounded-lg border border-white/[0.08] text-xs text-priscilla/60 hover:bg-white/[0.03] hover:border-white/[0.12] transition-all"
                >
                  {related.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="text-center pt-2 pb-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />

          <div className="max-w-xl mx-auto mb-5 space-y-2">
            <p className="text-sm text-priscilla/35 leading-relaxed">
              Ready to rate more characters? Jump back in and see how the community votes.
            </p>
          </div>

          <p className="text-sm text-priscilla/35 mb-5">
            Would you smash or pass {shortName}?
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="btn-primary px-7 py-2.5 text-xs inline-flex items-center gap-2 group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Play Now
                <ArrowRight
                  size={13}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
            <Link
              href="/leaderboard"
              className="px-6 py-2.5 rounded-xl border border-white/[0.08] text-priscilla/50 text-xs hover:bg-white/[0.03] hover:border-white/[0.12] transition-all"
            >
              Leaderboard
            </Link>
          </div>
        </section>
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