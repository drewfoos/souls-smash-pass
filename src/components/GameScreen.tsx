"use client";

import { useEffect, useCallback, useState } from "react";
import { useGame } from "@/context/GameContext";
import { type CharacterType } from "@/data/characters";
import { CardStack } from "./CardStack";
import { ActionButtons } from "./ActionButtons";
import { Leaderboard } from "./Leaderboard";
import { FilterDropdown } from "./FilterDropdown";
import { OthersChose } from "./OthersChose";
import { SignInButton, type ProfileTab } from "./SignInButton";
import { UserProfile } from "./UserProfile";
import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react";
import { MobileMenu } from "./MobileMenu";

export function GameScreen() {
  const {
    swipe,
    currentCharacter,
    progress,
    filteredProgress,
    startGame,
    setViewFilter,
    state,
    isAtFrontier,
    navigateBack,
    navigateForward,
  } = useGame();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture keys when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      // Disable all keybinds when a popup/modal is open
      if (showLeaderboard || showProfile) return;

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
    [swipe, currentCharacter, state.gameActive, state.gameComplete, isAtFrontier, navigateBack, navigateForward, showLeaderboard, showProfile]
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
    <div className="h-dvh flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden relative py-0 lg:py-2 xl:py-4" role="main" aria-label="Elden Smash or Pass Game">
      {/* Screen reader announcement for current character */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {currentCharacter
          ? `Now showing: ${currentCharacter.name}, character ${Math.min(filteredProgress.viewing, filteredProgress.total)} of ${filteredProgress.total}`
          : "No more characters"}
      </div>

      {/* ── Fixed overlays (out of flow, like pokesmash) ────────────────────── */}

      {/* Mobile hamburger menu — replaces all controls on small screens */}
      <MobileMenu
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenProfile={(tab) => { setProfileTab(tab); setShowProfile(true); }}
        currentTypes={state.viewFilter}
        onFilterApply={handleFilterApply}
      />

      {/* Filter dropdown — fixed top-left, desktop only */}
      <div className="hidden md:block">
        <FilterDropdown
          currentTypes={state.viewFilter}
          onApply={handleFilterApply}
        />
      </div>

      {/* Controls — fixed top-right, desktop only */}
      <div className="hidden md:flex pointer-events-none fixed right-0 top-0 z-20 flex-row items-center justify-end gap-2 px-4 py-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-smash border border-smash/40
              hover:bg-smash/10 hover:border-smash/60 transition-all flex items-center gap-1.5"
          >
            <BarChart3 size={13} />
            LEADERBOARD
          </button>
          <SignInButton onOpenProfile={(tab) => { setProfileTab(tab); setShowProfile(true); }} />
        </div>
      </div>

      {/* Made by badge — fixed bottom-left, desktop only */}
      <div className="hidden md:flex fixed bottom-4 left-4 z-20 items-center gap-1.5 px-3 py-1.5 rounded-full bg-dark-800/80 border border-dark-600/30 backdrop-blur-sm">
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

      {/* Privacy / Terms — fixed bottom-right, desktop only (in hamburger on mobile) */}
      <div className="hidden md:flex items-center gap-3 fixed bottom-4 right-4 z-20">
        <Link href="/privacy" className="text-[11px] text-ash/60 hover:text-gold transition-colors">
          Privacy
        </Link>
        <span className="text-ash/30">·</span>
        <Link href="/terms" className="text-[11px] text-ash/60 hover:text-gold transition-colors">
          Terms
        </Link>
      </div>

      {/* ── Main content (centered, like pokesmash's Box) ───────────────────── */}

      {/* Title — matches pokesmash: mt-4, gutterBottom, 4vh → calc(1rem+4vh) on desktop */}
      <h2
        className="text-souls font-black text-center leading-none mt-4 mb-2 select-none"
        style={{ fontSize: "clamp(1.5rem, 4vh, 2.5rem)" }}
      >
        <span className="text-gold drop-shadow-[0_0_20px_rgba(255,215,0,0.3)]">
          Elden
        </span>{" "}
        <span className="text-pass">
          SMASH
        </span>
      </h2>

      {/* Card — matches pokesmash: 52.5vh mobile, max 600px desktop, 3:4 aspect ratio */}
      <div
        className="w-full max-w-[90vw] sm:max-w-[450px]"
        style={{
          height: "52.5vh",
          minHeight: "300px",
          maxHeight: "600px",
          aspectRatio: "3/4",
        }}
      >
        <CardStack />
      </div>

      {/* Controls stack — fixed height with even spacing, like pokesmash's Stack(h:400, mt:'1rem', spacing:4) */}
      <div className="flex flex-col items-center justify-between w-full" style={{ height: "400px", marginTop: "1rem" }}>
        {/* Counter with navigation arrows */}
        <div className="flex items-center gap-1.5 text-lg md:text-xl lg:text-2xl xl:text-3xl text-priscilla/70 font-bold">
          {/* Back arrow */}
          <button
            onClick={navigateBack}
            disabled={state.viewingIndex === 0}
            className="p-1 rounded-md text-priscilla/40 hover:text-priscilla/80 hover:bg-dark-700/40
              disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            aria-label="Previous character"
          >
            <ChevronLeft size={20} />
          </button>

          <span>Character</span>
          <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-lg bg-dark-700/60 text-priscilla font-bold tabular-nums min-w-[2.5rem] text-center">
            {Math.min(filteredProgress.viewing, filteredProgress.total)}
          </span>
          <span>of {filteredProgress.total}</span>

          {/* Forward arrow */}
          <button
            onClick={navigateForward}
            disabled={isAtFrontier || (state.gameComplete && state.viewingIndex >= state.deck.length - 1)}
            className="p-1 rounded-md text-priscilla/40 hover:text-priscilla/80 hover:bg-dark-700/40
              disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            aria-label="Next character"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* PASS and SMASH buttons + Keybinds */}
        <div className="relative w-full flex items-center justify-center">
          <ActionButtons />
          {/* Keybinds — flush right, aligned with buttons, desktop only */}
          <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 flex-col gap-2.5 rounded-l-xl bg-dark-800/60 border border-r-0 border-dark-600/25 backdrop-blur-sm px-4 py-3.5">
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

        {/* Swipe hint on mobile — only when at frontier */}
        {isAtFrontier && (
          <p className="text-[10px] text-priscilla/30 sm:hidden">
            swipe card or tap buttons
          </p>
        )}

        {/* What Others Chose */}
        <div className="w-full max-w-xl px-4">
          {displayChar ? (
            <OthersChose character={displayChar} />
          ) : (
            <div className="h-[100px]" />
          )}
        </div>
      </div>

      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
      {showProfile && <UserProfile onClose={() => setShowProfile(false)} defaultTab={profileTab} />}
    </div>
  );
}

