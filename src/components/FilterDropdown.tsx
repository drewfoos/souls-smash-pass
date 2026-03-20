"use client";

import { useState, useRef, useEffect } from "react";
import {
  type CharacterType,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
  getAvailableTypes,
} from "@/data/characters";

// Representative character image for each type
const TYPE_IMAGES: Record<CharacterType, string> = {
  boss: "/characters/er_malenia.jpg",
  npc: "/characters/er_ranni.jpg",
  mob: "/characters/er_soldier_of_godrick.jpg",
  mc: "/characters/er_melina.jpg",
  merchant: "/characters/er_melina.jpg",
  summon: "/characters/er_spirit_jellyfish.jpg",
};

interface FilterDropdownProps {
  currentTypes: CharacterType[] | null;
  onApply: (types?: CharacterType[]) => void;
}

export function FilterDropdown({ currentTypes, onApply }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const availableTypes = getAvailableTypes();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Current display — "All Characters" or the active filter
  const currentLabel = currentTypes
    ? currentTypes.map((t) => CHARACTER_TYPE_LABELS[t]).join(", ")
    : "All Characters";

  const currentImage = currentTypes?.length === 1
    ? TYPE_IMAGES[currentTypes[0]]
    : "/characters/er_malenia.jpg"; // default for "All"

  const handleSelect = (type: CharacterType | "all") => {
    setOpen(false);
    if (type === "all") {
      onApply(undefined);
    } else {
      onApply([type]);
    }
  };

  return (
    <div className="fixed top-2 left-2 z-50" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg
          bg-dark-800/90 border border-dark-600/40 backdrop-blur-sm
          hover:bg-dark-700/90 hover:border-dark-500/50 transition-all
          cursor-pointer select-none"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {/* Mini character thumbnail */}
        <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 border border-dark-600/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
        <span className="text-sm font-semibold text-priscilla/80 whitespace-nowrap">
          {currentLabel}
        </span>
        <svg
          aria-hidden="true"
          className={`w-3.5 h-3.5 text-priscilla/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Filter by character type"
          className="absolute top-full left-0 mt-1 min-w-[200px] rounded-xl bg-dark-800/95 border border-dark-600/40 backdrop-blur-md shadow-xl overflow-hidden animate-fade-in"
        >
          {/* All Characters option */}
          <button
            role="option"
            aria-selected={!currentTypes}
            onClick={() => handleSelect("all")}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors
              hover:bg-dark-700/60 ${!currentTypes ? "bg-dark-700/40" : ""}`}
          >
            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 border-2 border-gold/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/characters/er_malenia.jpg"
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-priscilla">All Characters</span>
              <span className="text-xs text-priscilla/40">{availableTypes.reduce((s, t) => s + t.count, 0)} total</span>
            </div>
            {!currentTypes && (
              <div className="ml-auto w-2 h-2 rounded-full bg-gold" aria-hidden="true" />
            )}
          </button>

          <div className="h-px bg-dark-600/30 mx-2" />

          {/* Per-type options */}
          {availableTypes.map(({ type, count }) => {
            const colors = CHARACTER_TYPE_COLORS[type];
            const isActive = currentTypes?.includes(type) && currentTypes.length === 1;
            return (
              <button
                key={type}
                role="option"
                aria-selected={isActive || false}
                onClick={() => handleSelect(type)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-left transition-colors
                  hover:bg-dark-700/60 ${isActive ? "bg-dark-700/40" : ""}`}
              >
                <div
                  className="w-8 h-8 rounded-md overflow-hidden shrink-0"
                  style={{ border: `2px solid ${colors.border}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={TYPE_IMAGES[type]}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold" style={{ color: colors.text }}>
                    {CHARACTER_TYPE_LABELS[type]}
                  </span>
                  <span className="text-xs text-priscilla/40">{count} characters</span>
                </div>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: colors.text }} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
