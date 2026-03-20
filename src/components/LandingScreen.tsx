"use client";

import { useState } from "react";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import {
  characters,
  getAvailableTypes,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
  type CharacterType,
} from "@/data/characters";
import { Flame, Swords, Crown, Users, Skull, Bug, Sparkles } from "lucide-react";

const TYPE_ICONS: Record<CharacterType, React.ReactNode> = {
  boss: <Crown size={14} />,
  npc: <Users size={14} />,
  mob: <Bug size={14} />,
  summon: <Sparkles size={14} />,
  mc: <Swords size={14} />,
  merchant: <Users size={14} />,
};

export function LandingScreen() {
  const { startGame } = useGame();
  const [selectedTypes, setSelectedTypes] = useState<Set<CharacterType>>(new Set());
  const availableTypes = getAvailableTypes();

  const toggleType = (type: CharacterType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Count how many characters match current filter
  const filteredCount =
    selectedTypes.size === 0
      ? characters.length
      : characters.filter((c) => selectedTypes.has(c.type)).length;

  const handleStart = () => {
    const types = selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined;
    startGame(undefined, types);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-grace-glow pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(240,192,64,0.10) 0%, rgba(200,176,96,0.03) 40%, transparent 70%)",
        }}
      />

      {/* Title block */}
      <div className="text-center mb-10 relative z-10">
        <div
          className="flex items-center justify-center gap-4 mb-5 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <Flame size={24} className="text-ember animate-bonfire" />
          <Swords size={28} className="text-gold animate-float" />
          <Flame
            size={24}
            className="text-ember animate-bonfire"
            style={{ animationDelay: "-1.5s" }}
          />
        </div>

        <h1
          className="text-souls font-black animate-fade-in-up leading-none"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="text-5xl sm:text-6xl md:text-7xl text-gold drop-shadow-[0_0_30px_rgba(240,192,64,0.3)]">
            ELDEN
          </span>
          <span className="block text-4xl sm:text-5xl md:text-6xl mt-1">
            <span className="text-crimson-bright">SMASH</span>
          </span>
        </h1>

        <p
          className="text-priscilla/35 text-sm mt-4 max-w-sm mx-auto leading-relaxed animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          Every boss, NPC, and creature from the Lands Between.
          Swipe right to smash, left to pass.
        </p>
      </div>

      {/* Type filter */}
      <div
        className="w-full max-w-md mb-8 animate-fade-in"
        style={{ animationDelay: "0.5s" }}
      >
        <p className="text-xs text-ash text-center mb-3 uppercase tracking-widest">
          Filter by type
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {availableTypes.map(({ type, count }) => {
            const colors = CHARACTER_TYPE_COLORS[type];
            const isSelected = selectedTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="type-pill transition-all duration-200"
                style={{
                  background: isSelected ? colors.bg : "rgba(42,42,56,0.6)",
                  color: isSelected ? colors.text : "rgba(224,218,232,0.35)",
                  border: `1.5px solid ${isSelected ? colors.border : "rgba(58,58,74,0.6)"}`,
                  boxShadow: isSelected ? `0 0 12px ${colors.glow}` : "none",
                }}
              >
                {TYPE_ICONS[type]}
                <span>{CHARACTER_TYPE_LABELS[type]}</span>
                <span
                  className="text-[10px] opacity-60 ml-0.5"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Character count */}
      <div
        className="flex items-center gap-2 text-ash text-sm mb-8 animate-fade-in"
        style={{ animationDelay: "0.6s" }}
      >
        <Skull size={14} className="opacity-50" />
        <span className="tabular-nums">{filteredCount} characters</span>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={filteredCount === 0}
        className="btn-primary text-lg md:text-xl tracking-widest animate-fade-in-up relative z-10
          disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
        style={{ animationDelay: "0.7s" }}
      >
        <span className="flex items-center gap-3 relative z-10">
          <Flame size={18} />
          TOUCH GRACE
          <Flame size={18} />
        </span>
      </button>

      {/* Privacy / Terms */}
      <div
        className="flex items-center gap-4 mt-6 animate-fade-in"
        style={{ animationDelay: "0.9s" }}
      >
        <Link href="/privacy" className="text-xs text-ash/40 hover:text-gold transition-colors">
          Privacy Policy
        </Link>
        <span className="text-priscilla/20">·</span>
        <Link href="/terms" className="text-xs text-ash/40 hover:text-gold transition-colors">
          Terms of Service
        </Link>
      </div>

      {/* Footer */}
      <div
        className="mt-auto pt-12 animate-fade-in"
        style={{ animationDelay: "1s" }}
      >
        <p className="text-[10px] text-priscilla/10 text-center">
          Character images sourced from community wikis. All rights belong to
          FromSoftware / Bandai Namco.
        </p>
      </div>
    </div>
  );
}
