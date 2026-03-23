"use client";

import { LazyCharCard } from "@/components/LazyCharCard";
import type { Character } from "@/data/characters";

interface Props {
  characters: Character[];
}

export function PublicProfileGrid({ characters }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {characters.map((char) => (
        <LazyCharCard key={char.id} char={char} imgSize="w-9 h-9" />
      ))}
    </div>
  );
}
