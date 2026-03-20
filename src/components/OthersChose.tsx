"use client";

import { type Character, CHARACTER_TYPE_COLORS } from "@/data/characters";
import { CharacterImage } from "./CharacterImage";
import { useCharacterVotes } from "@/lib/firebase-realtime";

interface OthersChoseProps {
  character: Character;
}

export function OthersChose({ character }: OthersChoseProps) {
  // Live subscription — updates the moment anyone anywhere votes
  const votes = useCharacterVotes(character.id);

  const total = votes.smash + votes.pass;
  const typeColors = CHARACTER_TYPE_COLORS[character.type];
  const passPercent  = total > 0 ? (votes.pass  / total) * 100 : 50;
  const smashPercent = total > 0 ? (votes.smash / total) * 100 : 50;

  return (
    <div className="flex flex-col items-center gap-0.5 animate-fade-in" key={character.id}>
      <span className="text-lg font-semibold text-priscilla/80">
        What Others Chose for{" "}
        <span style={{ color: typeColors.text }}>{character.name}</span>...
      </span>

      <div className="flex flex-row w-full items-center justify-center gap-2">
        {/* Passes */}
        <div className="flex flex-col items-end w-1/3">
          <span className="font-semibold text-lg text-pass">Passes</span>
          <div
            className="rounded transition-all duration-700 ml-auto"
            style={{
              height: "32px",
              borderRadius: "4px",
              backgroundColor: "rgba(255, 82, 119, 0.5)",
              width: `${passPercent}%`,
              minWidth: total > 0 ? "4px" : "0px",
            }}
          />
          <span className="font-semibold text-lg text-priscilla/70 tabular-nums">
            {total > 0 ? votes.pass.toLocaleString() : "—"}
          </span>
        </div>

        {/* Thumbnail */}
        <div
          className="flex items-center justify-center w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0 my-1"
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
          <span className="font-semibold text-lg text-smash">Smashes</span>
          <div
            className="rounded transition-all duration-700"
            style={{
              height: "32px",
              borderRadius: "4px",
              backgroundColor: "rgba(46, 232, 154, 0.5)",
              width: `${smashPercent}%`,
              minWidth: total > 0 ? "4px" : "0px",
            }}
          />
          <span className="font-semibold text-lg text-priscilla/70 tabular-nums">
            {total > 0 ? votes.smash.toLocaleString() : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
