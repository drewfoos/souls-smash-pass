"use client";

import { useState, useMemo } from "react";
import { type Character, type CharacterType, GAME_COLORS } from "@/data/characters";

interface CharacterImageProps {
  character: Character;
  className?: string;
  priority?: boolean;
}

// Deterministic hash from string → number
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Type-specific symbols (SVG paths)
const TYPE_ICONS: Record<CharacterType, string> = {
  boss: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z", // star/crown
  npc: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", // person
  mc: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", // shield
  merchant: "M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12V0L22 4l-4 4M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", // bag
  summon: "M12 3v18M5.636 5.636l12.728 12.728M3 12h18M5.636 18.364L18.364 5.636", // spirit cross
  mob: "M9.5 2A2.5 2.5 0 0 1 12 4.5v.793c.993.076 1.937.312 2.801.677l.553-.553a2.5 2.5 0 1 1 3.536 3.536l-.554.553A7.96 7.96 0 0 1 19.97 12h.53a2.5 2.5 0 0 1 0 5h-.53a7.96 7.96 0 0 1-1.632 2.793l.553.554a2.5 2.5 0 1 1-3.536 3.536l-.553-.554A7.96 7.96 0 0 1 12 24.96v.54a2.5 2.5 0 0 1-5 0v-.53A2.5 2.5 0 0 1 9.5 2z", // gear/creature
};

// Atmospheric patterns per game
const GAME_PATTERNS: Record<string, string[]> = {
  ER: ["#2e2a0e", "#161408", "#5a5020"],
};

export function CharacterImage({ character, className = "", priority = false }: CharacterImageProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const gameColor = GAME_COLORS[character.game];
  const hash = useMemo(() => hashStr(character.id), [character.id]);

  // Deterministic visual parameters from character ID
  const angle = (hash % 360);
  const patternColors = GAME_PATTERNS.ER;
  const accentShift = (hash % 40) - 20; // -20 to +20
  const orbX = 20 + (hash % 60); // 20-80%
  const orbY = 15 + ((hash >> 4) % 50); // 15-65%
  const orbSize = 30 + (hash % 40); // 30-70%

  const iconPath = TYPE_ICONS[character.type] || TYPE_ICONS.npc;

  const StylizedCard = (
    <div
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, ${patternColors[0]} 0%, ${patternColors[1]} 40%, ${patternColors[2]}30 100%)`,
      }}
    >
      {/* Atmospheric orb glow */}
      <div
        className="absolute rounded-full blur-3xl opacity-20"
        style={{
          left: `${orbX - orbSize / 2}%`,
          top: `${orbY - orbSize / 2}%`,
          width: `${orbSize}%`,
          height: `${orbSize}%`,
          background: `radial-gradient(circle, ${gameColor}60 0%, transparent 70%)`,
        }}
      />

      {/* Secondary glow */}
      <div
        className="absolute rounded-full blur-2xl opacity-10"
        style={{
          right: `${10 + (hash % 30)}%`,
          bottom: `${20 + ((hash >> 2) % 30)}%`,
          width: `${20 + (hash % 25)}%`,
          height: `${20 + (hash % 25)}%`,
          background: `radial-gradient(circle, ${gameColor}80 0%, transparent 70%)`,
        }}
      />

      {/* Decorative lines / rune pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        viewBox="0 0 400 530"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Vertical line */}
        <line
          x1="200"
          y1={50 + (hash % 40)}
          x2="200"
          y2={480 - (hash % 40)}
          stroke={gameColor}
          strokeWidth="0.5"
        />
        {/* Horizontal line */}
        <line
          x1={80 + (hash % 40)}
          y1="265"
          x2={320 - (hash % 40)}
          y2="265"
          stroke={gameColor}
          strokeWidth="0.5"
        />
        {/* Diamond shape */}
        <path
          d={`M200,${100 + accentShift} L${280 + accentShift},265 L200,${430 - accentShift} L${120 - accentShift},265 Z`}
          stroke={gameColor}
          strokeWidth="0.5"
          fill="none"
        />
        {/* Circle */}
        <circle
          cx="200"
          cy="265"
          r={120 + (hash % 30)}
          stroke={gameColor}
          strokeWidth="0.3"
          fill="none"
        />
      </svg>

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            filter: `drop-shadow(0 0 20px ${gameColor}30)`,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke={gameColor}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-30"
          >
            <path d={iconPath} />
          </svg>
        </div>
      </div>

      {/* Bottom vignette for text readability (handled by SwipeCard, but reinforce) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
    </div>
  );

  // Try local WebP, fall back to remote URL, then stylized card.
  // JPGs exist locally for the download-script cache check but are excluded
  // from Vercel deployments via .vercelignore — WebP is the only served format.
  const localWebp = `/characters/${character.id}.webp`;
  const remoteSrc = character.imageUrl || null;

  const [triedLocal, setTriedLocal] = useState(false);
  const imgSrc = !imgFailed ? (!triedLocal ? localWebp : remoteSrc) : null;

  if (imgSrc) {
    return (
      <div className={`w-full h-full relative ${className}`}>
        {/* Stylized card as background/fallback — always rendered behind */}
        {StylizedCard}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={character.name}
          className="absolute inset-0 w-full h-full object-cover object-top z-10"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => {
            if (!triedLocal) {
              // Local WebP missing, try remote
              setTriedLocal(true);
            } else {
              // Remote also failed, show stylized card
              setImgFailed(true);
            }
          }}
          loading="lazy"
          draggable={false}
        />
      </div>
    );
  }

  return StylizedCard;
}
