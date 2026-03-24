"use client";

import { useEffect, useCallback, useState } from "react";
import { useGame } from "@/context/GameContext";
import { type CharacterType } from "@/data/characters";
import { CardStack } from "./CardStack";
import { ActionButtons } from "./ActionButtons";
import { FilterDropdown } from "./FilterDropdown";
import { OthersChose } from "./OthersChose";
import { SignInButton, type ProfileTab } from "./SignInButton";
import { UserProfile } from "./UserProfile";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { MobileMenu } from "./MobileMenu";
import { SignInPrompt } from "./SignInPrompt";

export function GameScreen() {
  const {
    swipe,
    currentCharacter,
    filteredProgress,
    setViewFilter,
    state,
    isAtFrontier,
    isFilterExhausted,
    navigateBack,
    navigateForward,
  } = useGame();
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");

  // Back button is disabled when there's no voted matching character behind us
  const backDisabled = filteredProgress.viewing <= 1;

  // Forward button is disabled when there's nowhere meaningful to go:
  const forwardDisabled =
    // At the frontier with unvoted characters ahead — must vote first
    (isAtFrontier && !isFilterExhausted) ||
    // Filter exhausted and already viewing the last character in the category
    (isFilterExhausted && filteredProgress.viewing >= filteredProgress.total) ||
    // Game fully complete and at the very last character in the deck
    (state.gameComplete && state.viewingIndex >= state.deck.length - 1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture keys when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      // Disable all keybinds when a popup/modal is open
      if (showProfile) return;

      if (!state.gameActive && !state.gameComplete) return;

      // Navigation: up/down arrows move between characters
      if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateForward();
        return;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateBack();
        return;
      }

      if (isAtFrontier) {
        // Normal voting mode: left/right vote
        if (!currentCharacter) return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          swipe("smash");
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          swipe("pass");
        }
      } else {
        // Browsing history: left/right navigate
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigateBack();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          navigateForward();
        }
      }
    },
    [swipe, currentCharacter, state.gameActive, state.gameComplete, isAtFrontier, navigateBack, navigateForward, showProfile]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleFilterApply = (types?: CharacterType[]) => {
    setViewFilter(types);
  };

  // Show OthersChose for the character currently on screen.
  // In history-browsing mode, show the character at viewingIndex.
  // At the frontier, show the most recently voted character.
  const displayChar =
    !isAtFrontier
      ? state.deck[state.viewingIndex] ?? null
      : state.history.length > 0
        ? state.history[state.history.length - 1].character
        : null;

  return (
    <div className="h-dvh flex flex-col items-center overflow-hidden relative overscroll-none" role="main" aria-label="Elden Smash or Pass Game">
      {/* Screen reader announcement for current character */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentCharacter
          ? `Now showing: ${currentCharacter.name}, character ${Math.min(filteredProgress.viewing, filteredProgress.total)} of ${filteredProgress.total}`
          : "No more characters"}
      </div>

      {/* ── Fixed overlays (out of flow, like pokesmash) ────────────────────── */}

      {/* Mobile hamburger menu — replaces all controls on small screens */}
      <MobileMenu
        onOpenProfile={(tab) => { setProfileTab(tab); setShowProfile(true); }}
        currentTypes={state.viewFilter}
        onFilterApply={handleFilterApply}
      />

      {/* Filter dropdown — desktop only, hidden in phone landscape */}
      <div className="hidden md:block landscape-short:!hidden">
        <FilterDropdown
          currentTypes={state.viewFilter}
          onApply={handleFilterApply}
        />
      </div>

      {/* Nav links + sign-in — desktop only, hidden in phone landscape */}
      <div className="hidden md:flex landscape-short:!hidden pointer-events-none fixed right-0 top-0 z-20 flex-row items-center justify-end gap-2 px-4 py-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link href="/leaderboard" className="px-3 py-1.5 rounded-lg text-xs text-ash/50 hover:text-ash/80 hover:bg-dark-700/50 transition-all">
            Leaderboard
          </Link>
          <Link href="/about" className="px-3 py-1.5 rounded-lg text-xs text-ash/50 hover:text-ash/80 hover:bg-dark-700/50 transition-all">
            About
          </Link>
          <Link href="/faq" className="px-3 py-1.5 rounded-lg text-xs text-ash/50 hover:text-ash/80 hover:bg-dark-700/50 transition-all">
            FAQ
          </Link>
          <SignInButton onOpenProfile={(tab) => { setProfileTab(tab); setShowProfile(true); }} />
        </div>
      </div>

      {/* Made by badge — desktop only, hidden in phone landscape */}
      <div className="hidden md:flex landscape-short:!hidden fixed bottom-4 left-4 z-20 items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-800/80 border border-dark-600/30 backdrop-blur-sm">
        <span className="text-xs text-priscilla/40 hidden md:inline">A </span>
        <a
          href="https://github.com/drewfoos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-ranni hover:text-ranni/80 transition-colors"
        >
          drewfoos
        </a>
        <span className="text-xs text-priscilla/40 hidden md:inline"> app</span>
      </div>

      {/* Privacy / Terms — desktop only, hidden in phone landscape */}
      <div className="hidden md:flex landscape-short:!hidden items-center gap-3 fixed bottom-4 right-4 z-20">
        <Link href="/privacy" className="text-[11px] text-ash/60 hover:text-gold transition-colors">
          Privacy
        </Link>
        <span className="text-ash/30">·</span>
        <Link href="/terms" className="text-[11px] text-ash/60 hover:text-gold transition-colors">
          Terms
        </Link>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}

      {/* Title — hidden in phone landscape */}
      <h1
        className="game-title text-souls font-black text-center leading-none mt-4 mb-2 select-none landscape-short:mt-1 landscape-short:mb-0"
      >
        <span className="text-gold drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
          Elden
        </span>{" "}
        <span className="text-pass">
          SMASH
        </span>
        <span className="sr-only"> — Elden Ring Smash or Pass</span>
      </h1>

      {/* Layout wrapper — vertical in portrait, horizontal in landscape */}
      <div className="flex flex-col landscape-short:flex-row landscape-short:items-center landscape-short:justify-center landscape-short:gap-6 items-center w-full flex-1 min-h-0 landscape-short:py-2 landscape-short:px-6">

        {/* Card */}
        <div className="game-card w-full max-w-[90vw] sm:max-w-[450px] landscape-short:w-auto landscape-short:max-w-none landscape-short:flex-shrink-0">
          <CardStack />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center justify-between w-full flex-1 mt-2 md:mt-4 pb-2 landscape-short:flex-1 landscape-short:min-w-0 landscape-short:justify-center landscape-short:gap-4 landscape-short:mt-0 landscape-short:pb-0">
          {/* Counter */}
          <div className="flex items-center gap-1.5 text-lg md:text-xl lg:text-2xl xl:text-3xl landscape-short:text-sm text-priscilla/70 font-bold">
            <button
              onClick={navigateBack}
              disabled={backDisabled}
              className="p-1 rounded-md text-priscilla/40 hover:text-priscilla/80 hover:bg-dark-700/40
                disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              aria-label="Previous character"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="landscape-short:hidden">Character</span>
            <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-lg bg-dark-700/60 text-priscilla font-bold tabular-nums min-w-[2.5rem] text-center">
              {Math.min(filteredProgress.viewing, filteredProgress.total)}
            </span>
            <span>of {filteredProgress.total}</span>
            <button
              onClick={navigateForward}
              disabled={forwardDisabled}
              className="p-1 rounded-md text-priscilla/40 hover:text-priscilla/80 hover:bg-dark-700/40
                disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              aria-label="Next character"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Buttons — min-h prevents layout shift when switching voting/history mode */}
          <div className="relative w-full landscape-short:w-auto flex items-center justify-center" style={{ minHeight: "calc(1.5em + 5dvh)" }}>
            <ActionButtons />
            {/* Keybinds — desktop only */}
            <div className="hidden lg:flex landscape-short:!hidden absolute right-0 top-1/2 -translate-y-1/2 flex-col gap-2.5 rounded-l-xl bg-dark-800/60 border border-r-0 border-dark-600/25 backdrop-blur-sm px-4 py-3.5">
              <h5 className="text-souls text-xs font-bold text-priscilla/45">Keybinds:</h5>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-priscilla/35">Next Character</span>
                <kbd className="w-7 h-7 rounded-md bg-dark-700/60 border border-dark-600/40 flex items-center justify-center text-priscilla/45">
                  <ArrowUp size={12} />
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-priscilla/35">Previous Character</span>
                <kbd className="w-7 h-7 rounded-md bg-dark-700/60 border border-dark-600/40 flex items-center justify-center text-priscilla/45">
                  <ArrowDown size={12} />
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-priscilla/35">Pass</span>
                <kbd className="w-7 h-7 rounded-md bg-dark-700/60 border border-dark-600/40 flex items-center justify-center text-priscilla/45">
                  <ArrowLeft size={12} />
                </kbd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-priscilla/35">Smash</span>
                <kbd className="w-7 h-7 rounded-md bg-dark-700/60 border border-dark-600/40 flex items-center justify-center text-priscilla/45">
                  <ArrowRight size={12} />
                </kbd>
              </div>
            </div>
          </div>

          {/* What Others Chose */}
          <div className="w-full max-w-xl px-4 min-h-0 landscape-short:max-w-none landscape-short:px-0">
            {displayChar && <OthersChose character={displayChar} />}
          </div>
        </div>
      </div>

      <SignInPrompt />
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} defaultTab={profileTab} />}
    </div>
  );
}

