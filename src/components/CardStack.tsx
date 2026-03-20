"use client";

import { AnimatePresence } from "framer-motion";
import { SwipeCard } from "./SwipeCard";
import { useGame } from "@/context/GameContext";

export function CardStack() {
  const { state, currentCharacter, swipe, previousVotes, isAtFrontier } = useGame();

  // ----- History-browsing mode -----
  // Show the single character at viewingIndex as a non-interactive card.
  if (!isAtFrontier) {
    const viewChar = state.deck[state.viewingIndex];
    const historyEntry = state.history[state.viewingIndex];
    if (!viewChar) return null;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative h-full mx-auto"
          style={{ aspectRatio: "3/4", maxWidth: "100%" }}
        >
          <SwipeCard
            key={viewChar.id + "-history"}
            character={viewChar}
            onSmash={() => {}}
            onPass={() => {}}
            isTop={true}
            index={0}
            previousVote={previousVotes[viewChar.id]}
            historyVote={historyEntry?.action}
          />
        </div>
      </div>
    );
  }

  // ----- Normal voting mode -----
  const visibleCards = state.deck.slice(
    state.currentIndex,
    state.currentIndex + 3
  );

  if (!currentCharacter) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative h-full mx-auto"
        style={{ aspectRatio: "3/4", maxWidth: "100%" }}
      >
        <AnimatePresence mode="popLayout">
          {visibleCards
            .map((char, i) => (
              <SwipeCard
                key={char.id}
                character={char}
                onSmash={() => swipe("smash")}
                onPass={() => swipe("pass")}
                isTop={i === 0}
                index={i}
                previousVote={previousVotes[char.id]}
              />
            ))
            .reverse()}
        </AnimatePresence>
      </div>
    </div>
  );
}
