import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CharacterImage } from "@/components/CharacterImage";
import {
  characters,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
} from "@/data/characters";
import { getAllVotes } from "@/lib/firebase-db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eldensmash.com";

const PAGE_SIZE = 48;
const MIN_PERCENT_RANK_VOTES = 25;
const MAX_SEARCH_LENGTH = 80;

export const revalidate = 60;

type SortMode =
  | "smash_pct"
  | "total_votes"
  | "most_smashed"
  | "most_passed"
  | "divisive";

type TypeFilter = "all" | "boss" | "npc" | "mob" | "summon";

export const metadata: Metadata = {
  title: "All Elden Ring Characters | Elden Smash",
  description:
    "Browse Elden Ring characters by smash percentage, votes, and other rankings on Elden Smash.",
  alternates: {
    canonical: `${SITE_URL}/characters`,
  },
  openGraph: {
    title: "All Elden Ring Characters | Elden Smash",
    description:
      "Browse Elden Ring characters by smash percentage, votes, and other rankings on Elden Smash.",
    url: `${SITE_URL}/characters`,
    siteName: "Elden Smash",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All Elden Ring Characters | Elden Smash",
    description:
      "Browse Elden Ring characters by smash percentage, votes, and other rankings on Elden Smash.",
  },
};

function toSingularTypeLabel(type: "boss" | "npc" | "mob" | "summon") {
  const singularLabels: Record<"boss" | "npc" | "mob" | "summon", string> = {
    boss: "Boss",
    npc: "NPC",
    mob: "Creature",
    summon: "Summon",
  };

  return singularLabels[type] ?? "Character";
}

function getSortLabel(sort: SortMode) {
  switch (sort) {
    case "smash_pct":
      return "Highest Smash %";
    case "total_votes":
      return "Most Votes";
    case "most_smashed":
      return "Most Smashed";
    case "most_passed":
      return "Most Passed";
    case "divisive":
      return "Most Divisive";
    default:
      return "Highest Smash %";
  }
}

function sanitizeSearchQuery(input: string | undefined): string {
  if (!input) return "";
  return input.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_LENGTH);
}

function buildCharactersHref({
  page,
  sort,
  type,
  q,
}: {
  page?: number;
  sort?: SortMode;
  type?: TypeFilter;
  q?: string;
}) {
  const params = new URLSearchParams();

  if (page && page > 1) params.set("page", String(page));
  if (sort && sort !== "smash_pct") params.set("sort", sort);
  if (type && type !== "all") params.set("type", type);
  if (q && q.trim()) params.set("q", sanitizeSearchQuery(q));

  const query = params.toString();
  return query ? `/characters?${query}` : "/characters";
}

export default async function CharactersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    sort?: string;
    type?: string;
    q?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const rawPage = Number(resolvedSearchParams.page || "1");
  const currentPage = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

  const allowedSorts: SortMode[] = [
    "smash_pct",
    "total_votes",
    "most_smashed",
    "most_passed",
    "divisive",
  ];
  const sort: SortMode = allowedSorts.includes(
    resolvedSearchParams.sort as SortMode
  )
    ? (resolvedSearchParams.sort as SortMode)
    : "smash_pct";

  const allowedTypes: TypeFilter[] = ["all", "boss", "npc", "mob", "summon"];
  const typeFilter: TypeFilter = allowedTypes.includes(
    resolvedSearchParams.type as TypeFilter
  )
    ? (resolvedSearchParams.type as TypeFilter)
    : "all";

  const searchQuery = sanitizeSearchQuery(resolvedSearchParams.q);
  const normalizedQuery = searchQuery.toLowerCase();

  // Single snapshot instead of 500+ individual reads
  const allVotes = await getAllVotes();

  const charactersWithVotes = characters
    .filter(
      (char): char is typeof char & { type: "boss" | "npc" | "mob" | "summon" } =>
        char.type === "boss" ||
        char.type === "npc" ||
        char.type === "mob" ||
        char.type === "summon"
    )
    .map((char) => {
      const votes = allVotes[char.id] ?? { smash: 0, pass: 0 };
      const total = votes.smash + votes.pass;
      const smashPct = total > 0 ? Math.round((votes.smash / total) * 100) : 0;
      const divisiveScore = total > 0 ? Math.abs(smashPct - 50) : 999;

      return {
        ...char,
        votes,
        total,
        smashPct,
        divisiveScore,
        eligibleForPctRanking: total >= MIN_PERCENT_RANK_VOTES,
      };
    });

  const filteredByType =
    typeFilter === "all"
      ? charactersWithVotes
      : charactersWithVotes.filter((char) => char.type === typeFilter);

  const filteredCharacters = normalizedQuery
    ? filteredByType.filter((char) => {
        const haystack = [
          char.name,
          char.id,
          char.description,
          CHARACTER_TYPE_LABELS[char.type],
          toSingularTypeLabel(char.type),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
    : filteredByType;

  const sortedCharacters = [...filteredCharacters].sort((a, b) => {
    switch (sort) {
      case "smash_pct": {
        if (a.eligibleForPctRanking !== b.eligibleForPctRanking) {
          return a.eligibleForPctRanking ? -1 : 1;
        }
        if (a.eligibleForPctRanking && b.eligibleForPctRanking) {
          if (b.smashPct !== a.smashPct) return b.smashPct - a.smashPct;
          if (b.total !== a.total) return b.total - a.total;
          return a.name.localeCompare(b.name);
        }
        if (b.total !== a.total) return b.total - a.total;
        if (b.smashPct !== a.smashPct) return b.smashPct - a.smashPct;
        return a.name.localeCompare(b.name);
      }

      case "total_votes":
        if (b.total !== a.total) return b.total - a.total;
        if (b.smashPct !== a.smashPct) return b.smashPct - a.smashPct;
        return a.name.localeCompare(b.name);

      case "most_smashed":
        if (b.votes.smash !== a.votes.smash) return b.votes.smash - a.votes.smash;
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);

      case "most_passed":
        if (b.votes.pass !== a.votes.pass) return b.votes.pass - a.votes.pass;
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);

      case "divisive":
        if (a.divisiveScore !== b.divisiveScore) return a.divisiveScore - b.divisiveScore;
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);

      default:
        return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedCharacters.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCharacters = sortedCharacters.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <main className="min-h-dvh py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <PageHeader current="/characters" />

        <section className="mb-8 mt-2 text-center max-w-3xl mx-auto">
          <h1 className="text-souls font-black text-gold text-3xl sm:text-4xl mb-3">
            All Elden Ring Characters
          </h1>
          <p className="text-sm sm:text-base text-priscilla/55 leading-relaxed">
            Browse characters by smash percentage, vote totals, and more.
          </p>
        </section>

        <section className="mb-6 flex flex-col gap-4">
          <form action="/characters" method="get" className="w-full">
            <div className="relative max-w-xl">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-priscilla/35"
              />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                maxLength={MAX_SEARCH_LENGTH}
                placeholder="Search characters, IDs, descriptions..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] pl-10 pr-4 py-3 text-sm text-priscilla/85 placeholder:text-priscilla/30 outline-none focus:border-gold/30 focus:bg-white/[0.03]"
              />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="type" value={typeFilter} />
            </div>
          </form>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-priscilla/35 mb-1.5">
                  Sort by
                </label>
                <div className="flex flex-wrap gap-2">
                  {allowedSorts.map((mode) => {
                    const active = sort === mode;
                    return (
                      <Link
                        key={mode}
                        href={buildCharactersHref({
                          sort: mode,
                          type: typeFilter,
                          q: searchQuery,
                        })}
                        className={`px-3 py-2 rounded-xl border text-xs transition-all ${
                          active
                            ? "border-gold/30 bg-gold/[0.06] text-gold/80"
                            : "border-white/[0.08] text-priscilla/55 hover:bg-white/[0.03] hover:border-white/[0.12]"
                        }`}
                      >
                        {getSortLabel(mode)}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-priscilla/35 mb-1.5">
                  Filter
                </label>
                <div className="flex flex-wrap gap-2">
                  {allowedTypes.map((type) => {
                    const active = typeFilter === type;
                    const label =
                      type === "all" ? "All" : CHARACTER_TYPE_LABELS[type];

                    return (
                      <Link
                        key={type}
                        href={buildCharactersHref({
                          sort,
                          type,
                          q: searchQuery,
                        })}
                        className={`px-3 py-2 rounded-xl border text-xs transition-all ${
                          active
                            ? "border-gold/30 bg-gold/[0.06] text-gold/80"
                            : "border-white/[0.08] text-priscilla/55 hover:bg-white/[0.03] hover:border-white/[0.12]"
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {searchQuery && (
              <div className="text-xs text-priscilla/45">
                Search: <span className="text-priscilla/70">{searchQuery}</span>
              </div>
            )}
          </div>
        </section>

        {paginatedCharacters.length === 0 ? (
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <h2 className="text-lg font-semibold text-priscilla/85 mb-2">
              No characters found
            </h2>
            <p className="text-sm text-priscilla/45">
              Try a different search or remove some filters.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5">
            {paginatedCharacters.map((char, index) => {
              const typeColors = CHARACTER_TYPE_COLORS[char.type];
              const typeLabel = toSingularTypeLabel(char.type);
              const overallIndex = startIndex + index + 1;

              return (
                <Link
                  key={char.id}
                  href={`/characters/${char.id}`}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
                >
                  <div className="relative aspect-square bg-dark-800 isolate">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                      <CharacterImage character={char} contain />
                    </div>

                    <div
                      className="absolute top-2 left-2 z-10 text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm"
                      style={{
                        color: typeColors.text,
                        backgroundColor: `${typeColors.bg}D9`,
                        border: `1px solid ${typeColors.border}`,
                      }}
                    >
                      {typeLabel}
                    </div>

                    <div className="absolute bottom-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-dark-900/85 text-priscilla/85 border border-white/[0.08] backdrop-blur-sm tabular-nums">
                      #{overallIndex}
                    </div>
                  </div>

                  <div className="p-3">
                    <h2 className="text-sm font-semibold text-priscilla/90 leading-snug line-clamp-2 mb-2 group-hover:text-gold transition-colors">
                      {char.name}
                    </h2>

                    <p className="text-[11px] text-priscilla/45 line-clamp-2 mb-3 leading-relaxed">
                      {char.description}
                    </p>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-priscilla/35">Votes</span>
                        <span className="text-priscilla/65 tabular-nums">
                          {char.total.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-priscilla/35">Smash %</span>
                        <span className="text-gold/75 tabular-nums font-semibold">
                          {char.smashPct}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-priscilla/35">Smashed</span>
                        <span className="text-priscilla/65 tabular-nums">
                          {char.votes.smash.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        <nav className="mt-10 flex items-center justify-center gap-3">
          {safePage > 1 ? (
            <Link
              href={buildCharactersHref({
                page: safePage - 1,
                sort,
                type: typeFilter,
                q: searchQuery,
              })}
              className="px-4 py-2 rounded-xl border border-white/[0.08] text-priscilla/60 text-sm hover:bg-white/[0.03] hover:border-white/[0.12] transition-all inline-flex items-center gap-2"
            >
              <ArrowLeft size={14} />
              Previous
            </Link>
          ) : (
            <span className="px-4 py-2 rounded-xl border border-white/[0.04] text-priscilla/20 text-sm inline-flex items-center gap-2 cursor-default">
              <ArrowLeft size={14} />
              Previous
            </span>
          )}

          <div className="px-4 py-2 text-sm text-priscilla/45">
            {safePage} / {totalPages}
          </div>

          {safePage < totalPages ? (
            <Link
              href={buildCharactersHref({
                page: safePage + 1,
                sort,
                type: typeFilter,
                q: searchQuery,
              })}
              className="px-4 py-2 rounded-xl border border-white/[0.08] text-priscilla/60 text-sm hover:bg-white/[0.03] hover:border-white/[0.12] transition-all inline-flex items-center gap-2"
            >
              Next
              <ArrowRight size={14} />
            </Link>
          ) : (
            <span className="px-4 py-2 rounded-xl border border-white/[0.04] text-priscilla/20 text-sm inline-flex items-center gap-2 cursor-default">
              Next
              <ArrowRight size={14} />
            </span>
          )}
        </nav>
      </div>
    </main>
  );
}