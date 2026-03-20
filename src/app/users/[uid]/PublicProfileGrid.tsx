"use client";

import { CharacterImage } from "@/components/CharacterImage";
import type { Character } from "@/data/characters";

interface Props {
  characters: Character[];
}

export function PublicProfileGrid({ characters }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {characters.map((char) => (
        <div
          key={char.id}
          className="card-dark p-2 flex items-center gap-2.5 hover:border-gold/15 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-dark-700/40">
            <CharacterImage character={char} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-priscilla/75 truncate">
              {char.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
