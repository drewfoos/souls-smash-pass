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
    // History entries don't map 1:1 to deck indices when viewFilter skips
    // characters, so look up by character ID instead of position.
    const historyEntry = viewChar
      ? state.history.find((h) => h.character.id === viewChar.id)
      : undefined;
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
  // With viewFilter, the frontier card may be past currentIndex (non-matching
  // characters were skipped). Collect the next 3 cards that match the active
  // filter so preview cards behind the top card show the correct type.
  const frontierStart = state.viewingIndex >= state.currentIndex
    ? state.viewingIndex
    : state.currentIndex;

  const visibleCards: typeof state.deck = [];
  const filter = state.viewFilter;
  for (let i = frontierStart; i < state.deck.length && visibleCards.length < 3; i++) {
    const c = state.deck[i];
    if (filter && filter.length > 0 && !filter.includes(c.type)) continue;
    visibleCards.push(c);
  }

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
