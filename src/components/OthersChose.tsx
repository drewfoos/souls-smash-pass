"use client";

import { type Character, CHARACTER_TYPE_COLORS } from "@/data/characters";
import { CharacterImage } from "./CharacterImage";
import { useCharacterVotes } from "@/lib/firebase-realtime";
import { useGame } from "@/context/GameContext";

interface OthersChoseProps {
  character: Character;
}

export function OthersChose({ character }: OthersChoseProps) {
  // Two data sources:
  //  1. Firebase realtime subscription — eventually consistent, live updates
  //  2. GameContext voteCounts cache — updated immediately from API response
  // Use whichever has more votes (higher total = more recent data).
  const { votes: realtimeVotes } = useCharacterVotes(character.id);
  const { voteCounts } = useGame();
  const cached = voteCounts[character.id];

  const realtimeTotal = realtimeVotes.smash + realtimeVotes.pass;
  const cachedTotal = cached ? cached.smash + cached.pass : 0;

  // Pick the source with the higher total — that's the most up-to-date
  const raw = cachedTotal >= realtimeTotal && cached ? cached : realtimeVotes;
  // Clamp to 0 — race conditions during vote-switching can briefly go negative
  const votes = { smash: Math.max(0, raw.smash), pass: Math.max(0, raw.pass) };
  const total = votes.smash + votes.pass;

  const typeColors = CHARACTER_TYPE_COLORS[character.type];
  const passPercent  = total > 0 ? (votes.pass  / total) * 100 : 50;
  const smashPercent = total > 0 ? (votes.smash / total) * 100 : 50;

  // Show skeleton until real votes exist.
  const loading = total === 0;

  return (
    <div className="flex flex-col items-center gap-0.5 landscape-short:gap-0">
      <span className="text-lg landscape-short:text-xs font-semibold text-priscilla/80">
        What Others Chose for{" "}
        <span style={{ color: typeColors.text }}>{character.name}</span>...
      </span>

      <div className="flex flex-row w-full items-center justify-center gap-2 landscape-short:gap-1">
        {/* Passes */}
        <div className="flex flex-col items-end w-1/3">
          <span className="font-semibold text-lg landscape-short:text-xs text-pass">Passes</span>
          {loading ? (
            <>
              <div className="h-[32px] landscape-short:h-[16px] w-full rounded bg-pass/10 animate-pulse" />
              <div className="h-[28px] landscape-short:h-[16px] w-10 rounded bg-dark-700/40 animate-pulse mt-0.5" />
            </>
          ) : (
            <>
              <div
                className="rounded transition-all duration-700 ml-auto h-[32px] landscape-short:h-[16px]"
                style={{
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 82, 119, 0.5)",
                  width: `${passPercent}%`,
                  minWidth: "4px",
                }}
              />
              <span className="font-semibold text-lg landscape-short:text-xs text-priscilla/70 tabular-nums">
                {votes.pass.toLocaleString()}
              </span>
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div
          className="flex items-center justify-center w-24 h-24 md:w-32 md:h-32 landscape-short:w-12 landscape-short:h-12 rounded-xl landscape-short:rounded-lg overflow-hidden shrink-0 my-1 landscape-short:my-0"
          style={{
            border: `4px solid ${typeColors.border}`,
            background: "rgba(20,20,28,0.9)",
          }}
        >
          <div className="w-full h-full">
            <CharacterImage character={character} />
          </div>
        </div>

        {/* Smashes */}
        <div className="flex flex-col items-start w-1/3">
          <span className="font-semibold text-lg landscape-short:text-xs text-smash">Smashes</span>
          {loading ? (
            <>
              <div className="h-[32px] landscape-short:h-[16px] w-full rounded bg-smash/10 animate-pulse" />
              <div className="h-[28px] landscape-short:h-[16px] w-10 rounded bg-dark-700/40 animate-pulse mt-0.5" />
            </>
          ) : (
            <>
              <div
                className="rounded transition-all duration-700 h-[32px] landscape-short:h-[16px]"
                style={{
                  borderRadius: "4px",
                  backgroundColor: "rgba(46, 232, 154, 0.5)",
                  width: `${smashPercent}%`,
                  minWidth: "4px",
                }}
              />
              <span className="font-semibold text-lg landscape-short:text-xs text-priscilla/70 tabular-nums">
                {votes.smash.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
