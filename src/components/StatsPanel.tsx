"use client";

import { useEffect } from "react";
import { useGame } from "@/context/GameContext";
import { Heart, X as XIcon, Flame, BarChart3 } from "lucide-react";

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const { stats, progress } = useGame();
  const total = stats.smashed + stats.passed;
  const smashRate = total > 0 ? Math.round((stats.smashed / total) * 100) : 0;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Game Statistics"
    >
      <div className="card-dark w-full max-w-sm p-6 animate-fade-in-up space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-souls text-lg font-bold text-gold flex items-center gap-2">
            <BarChart3 size={18} />
            Stats
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center
              text-priscilla/30 hover:text-priscilla hover:bg-dark-700/50 transition-all"
            aria-label="Close stats"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-ash mb-1.5">
            <span>Progress</span>
            <span className="tabular-nums">{progress.current} / {progress.total}</span>
          </div>
          <div className="h-2 bg-dark-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-dim to-gold rounded-full transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* Smash rate */}
        {total >= 2 && (
          <div>
            <div className="flex justify-between text-xs text-ash mb-1.5">
              <span>Smash rate</span>
              <span className="text-gold font-semibold tabular-nums">{smashRate}%</span>
            </div>
            <div className="h-2 bg-dark-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-crimson-bright via-ember to-gold rounded-full transition-all duration-700"
                style={{ width: `${smashRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark-700/30 rounded-xl p-4 text-center border border-gold/8">
            <Heart size={16} className="mx-auto mb-2 text-gold/70" fill="currentColor" />
            <div className="text-3xl font-bold text-gold text-souls tabular-nums">
              {stats.smashed}
            </div>
            <div className="text-[10px] text-ash mt-1">Smashed</div>
          </div>
          <div className="bg-dark-700/30 rounded-xl p-4 text-center border border-crimson-bright/8">
            <XIcon size={16} className="mx-auto mb-2 text-crimson-bright/70" />
            <div className="text-3xl font-bold text-crimson-bright text-souls tabular-nums">
              {stats.passed}
            </div>
            <div className="text-[10px] text-ash mt-1">Passed</div>
          </div>
        </div>

        {/* Recent smashes */}
        {stats.smashedCharacters.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-ash mb-2">
              <Flame size={11} className="text-ember/50" />
              <span>Recent smashes</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {stats.smashedCharacters
                .slice(-6)
                .reverse()
                .map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 text-xs text-priscilla/50 bg-dark-700/20 rounded-lg px-2.5 py-1.5"
                  >
                    <Heart size={9} className="text-gold/50 shrink-0" fill="currentColor" />
                    <span className="truncate">{char.name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
