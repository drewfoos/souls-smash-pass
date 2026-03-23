"use client";

import { useState, useEffect, useRef } from "react";
import { CharacterImage } from "./CharacterImage";
import type { Character } from "@/data/characters";

interface LazyCharCardProps {
  char: Character;
  /** Tailwind size class for the image thumbnail (default: "w-10 h-10") */
  imgSize?: string;
}

/** Lazily renders CharacterImage only when the card scrolls into view. */
export function LazyCharCard({ char, imgSize = "w-10 h-10" }: LazyCharCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className="card-dark p-2 flex items-center gap-2.5 hover:border-gold/15 transition-colors"
    >
      <div className={`${imgSize} rounded-lg overflow-hidden shrink-0 border border-dark-700/40`}>
        {visible ? (
          <CharacterImage character={char} />
        ) : (
          <div className="w-full h-full bg-dark-700/40" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-priscilla/75 truncate">
          {char.name}
        </div>
      </div>
    </div>
  );
}
