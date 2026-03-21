"use client";

import { useGame } from "@/context/GameContext";

export function ActionButtons() {
  const { swipe, stats, state, isAtFrontier } = useGame();

  // ── History-browsing mode ──────────────────────────────────────────────────
  if (!isAtFrontier) {
    const viewChar = state.deck[state.viewingIndex];
    const entry = viewChar
      ? state.history.find((h) => h.character.id === viewChar.id)
      : undefined;
    if (!entry) return <div className="h-[52px]" />;

    const isSmash = entry.action === "smash";
    return (
      <div className="flex items-center justify-center gap-3">
        <div
          className={`flex items-center gap-2 px-8 py-2.5 rounded-xl border-2 text-sm font-black tracking-widest ${
            isSmash
              ? "border-gold/55 text-gold bg-gold/10"
              : "border-pass/55 text-pass/90 bg-pass/10"
          }`}
        >
          YOU {isSmash ? "SMASHED" : "PASSED"}
        </div>
      </div>
    );
  }

  // ── Normal voting mode ─────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-6 px-4 sm:px-6">
      {/* PASS */}
      <button
        onClick={() => swipe("pass")}
        className="btn-action btn-pass active:scale-95"
        aria-label="Pass on this character"
      >
        PASS
        <span
          className="vote-badge bg-pass/20 text-pass"
          key={`pass-${stats.passed}`}
        >
          {stats.passed}
        </span>
      </button>

      {/* SMASH */}
      <button
        onClick={() => swipe("smash")}
        className="btn-action btn-smash active:scale-95"
        aria-label="Smash this character"
      >
        <span
          className="vote-badge bg-smash/20 text-smash"
          key={`smash-${stats.smashed}`}
        >
          {stats.smashed}
        </span>
        SMASH
      </button>
    </div>
  );
}
