"use client";

import { AnimatePresence } from "framer-motion";
import { SwipeCard } from "./SwipeCard";
import { useGame } from "@/context/GameContext";
import { CHARACTER_TYPE_LABELS, CHARACTER_TYPE_COLORS } from "@/data/characters";
import { CheckCircle } from "lucide-react";

export function CardStack() {
  const { state, currentCharacter, swipe, previousVotes, isAtFrontier, isFilterExhausted, setViewFilter, filteredProgress } = useGame();

  // ----- Filter exhausted -----
  // All characters in the active filter have been voted on, but the overall
  // game isn't complete. Show a "category complete" card instead of nothing.
  if (isFilterExhausted && state.viewFilter && state.viewFilter.length > 0) {
    const filterLabels = state.viewFilter.map((t) => CHARACTER_TYPE_LABELS[t]).join(" & ");
    const colors = CHARACTER_TYPE_COLORS[state.viewFilter[0]];

    // If we're on a voted character, show it as the background card
    const viewChar = state.deck[state.viewingIndex];
    const historyEntry = viewChar
      ? state.history.find((h) => h.character.id === viewChar.id)
      : undefined;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative h-full mx-auto"
          style={{ aspectRatio: "3/4", maxWidth: "100%" }}
        >
          {/* Show the last voted card dimmed behind the overlay */}
          {viewChar && (
            <SwipeCard
              key={viewChar.id + "-exhausted"}
              character={viewChar}
              onSmash={() => {}}
              onPass={() => {}}
              isTop={true}
              index={0}
              previousVote={previousVotes[viewChar.id]}
              historyVote={historyEntry?.action}
            />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 rounded-2xl bg-dark-900/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6 z-10">
            <CheckCircle size={48} style={{ color: colors.text }} />
            <h3 className="text-2xl font-bold text-priscilla text-center">
              All <span style={{ color: colors.text }}>{filterLabels}</span> Done!
            </h3>
            <p className="text-sm text-priscilla/60 text-center max-w-[250px]">
              You voted on all {filteredProgress.total} characters in this category.
            </p>
            <div className="flex flex-col gap-2 mt-2 w-full max-w-[200px]">
              <button
                onClick={() => setViewFilter(undefined)}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-gold/20 text-gold border border-gold/30
                  hover:bg-gold/30 hover:border-gold/50 transition-all"
              >
                Show All Characters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  // characters were skipped). Collect the next 3 unvoted cards that match the
  // active filter so preview cards behind the top card are correct.
  const frontierStart = state.viewingIndex >= state.currentIndex
    ? state.viewingIndex
    : state.currentIndex;

  const votedIds = new Set(state.history.map((h) => h.character.id));
  const visibleCards: typeof state.deck = [];
  const filter = state.viewFilter;
  for (let i = frontierStart; i < state.deck.length && visibleCards.length < 3; i++) {
    const c = state.deck[i];
    if (filter && filter.length > 0 && !filter.includes(c.type)) continue;
    if (votedIds.has(c.id)) continue;
    visibleCards.push(c);
  }

  if (!currentCharacter) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative h-full mx-auto"
        style={{ aspectRatio: "3/4", maxWidth: "100%" }}
      >
        <AnimatePresence>
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
