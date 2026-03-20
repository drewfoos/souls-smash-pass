"use client";

import { GameProvider, useGame } from "@/context/GameContext";
import { GameScreen } from "@/components/GameScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { CelebrationScreen } from "@/components/CelebrationScreen";
import { useEffect, useRef, useState } from "react";

function GameRouter() {
  const { state, startGame, hasRestored } = useGame();

  // ── Celebration gate ────────────────────────────────────────────────────
  // Show the celebration only when the game completes DURING this session
  // (i.e. was active, then finished). If the page reloads into an already-
  // complete state (restored from localStorage), skip straight to results.
  const wasActiveRef = useRef(false);
  const [celebrationDone, setCelebrationDone] = useState(false);

  // Mark that the game was active, and reset the celebration gate on new games.
  useEffect(() => {
    if (state.gameActive) {
      wasActiveRef.current = true;
      setCelebrationDone(false);
    }
  }, [state.gameActive]);

  // Auto-start ONLY after GameProvider has finished its localStorage restore.
  //
  // Why this matters: React runs child effects BEFORE parent effects. Without
  // hasRestored, this effect would see gameActive:false (initial state) and
  // call startGame() — which calls clearProgress() — before GameProvider's
  // restore effect has had a chance to read the saved data from localStorage.
  // That race condition was wiping progress on every refresh.
  useEffect(() => {
    if (!hasRestored) return;                          // wait for restore
    if (!state.gameActive && !state.gameComplete) {
      startGame();                                     // nothing saved → fresh game
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRestored]); // re-run only when restore completes, not on every state change

  const showCelebration =
    state.gameComplete && !celebrationDone && wasActiveRef.current;

  if (showCelebration) {
    return <CelebrationScreen onComplete={() => setCelebrationDone(true)} />;
  }
  if (state.gameComplete) return <ResultsScreen />;
  if (state.gameActive) return <GameScreen />;

  // Blank while waiting for restore (one frame, imperceptible)
  return null;
}

export default function Home() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
