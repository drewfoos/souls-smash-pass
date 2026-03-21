"use client";

import { useMemo, useState, useEffect } from "react";
import { characterById } from "@/data/characters";
import { useAllVotes } from "@/lib/firebase-realtime";
import { Trophy, Skull, Heart, X as XIcon, Loader2, Flame } from "lucide-react";
import { CharacterImage } from "./CharacterImage";

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const [sortBy, setSortBy] = useState<"smash" | "pass">("smash");

  // Live subscription — leaderboard updates in real-time as anyone votes
  const { allVotes, loading } = useAllVotes();

  // Derive sorted entries from the in-memory map
  const entries = useMemo(() => {
    return Object.entries(allVotes)
      .map(([characterId, data]) => ({
        characterId,
        smash: data?.smash ?? 0,
        pass:  data?.pass  ?? 0,
      }))
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, 25)
      .map((entry) => ({
        ...entry,
        character: characterById.get(entry.characterId) ?? null,
      }));
  }, [allVotes, sortBy]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Medal colors for top 3
  const getMedalStyle = (rank: number) => {
    if (rank === 0) return "bg-gradient-to-br from-yellow-400/25 to-gold/10 text-gold border-gold/30 shadow-[0_0_16px_rgba(212,175,55,0.2)]";
    if (rank === 1) return "bg-gradient-to-br from-slate-300/20 to-slate-400/10 text-slate-300 border-slate-400/25";
    if (rank === 2) return "bg-gradient-to-br from-amber-600/20 to-amber-700/10 text-amber-500 border-amber-600/25";
    return "bg-dark-700/30 text-priscilla/35 border-transparent";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Global Leaderboard"
    >
      <div className="w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-2xl bg-dark-900 border border-dark-600/40 shadow-2xl animate-fade-in-up">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative px-5 pt-5 pb-4">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.04] to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/15 flex items-center justify-center">
                <Trophy size={18} className="text-gold" />
              </div>
              <div>
                <h2 className="text-souls text-base font-bold text-priscilla/90">
                  Leaderboard
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {!loading && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-smash animate-pulse" />
                      <span className="text-[10px] text-smash/60 font-medium">LIVE</span>
                      <span className="text-[10px] text-priscilla/20 mx-0.5">·</span>
                    </>
                  )}
                  <span className="text-[10px] text-priscilla/25">Top 25 characters</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center
                text-priscilla/30 hover:text-priscilla/70 hover:bg-dark-700/50 transition-all"
              aria-label="Close leaderboard"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* ── Sort tabs ───────────────────────────────────────── */}
        <div className="flex mx-4 mb-3 rounded-lg bg-dark-800/80 p-1 border border-dark-700/30">
          <button
            onClick={() => setSortBy("smash")}
            className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              sortBy === "smash"
                ? "bg-gold/10 text-gold border border-gold/15 shadow-sm"
                : "text-priscilla/35 hover:text-priscilla/55 border border-transparent"
            }`}
          >
            <Heart size={12} fill={sortBy === "smash" ? "currentColor" : "none"} />
            Most Smashed
          </button>
          <button
            onClick={() => setSortBy("pass")}
            className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              sortBy === "pass"
                ? "bg-pass/10 text-pass border border-pass/15 shadow-sm"
                : "text-priscilla/35 hover:text-priscilla/55 border border-transparent"
            }`}
          >
            <Skull size={12} />
            Most Passed
          </button>
        </div>

        {/* ── Entries ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={24} className="text-gold/60 animate-spin" />
              <span className="text-priscilla/20 text-xs text-souls">Consulting the Erdtree...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Skull size={28} className="text-priscilla/12" />
              <p className="text-priscilla/25 text-xs">No votes yet. Be the first to play!</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map((entry, i) => {
                const char = entry.character;
                const total = entry.smash + entry.pass;
                const pct = total > 0 ? Math.round(((sortBy === "smash" ? entry.smash : entry.pass) / total) * 100) : 0;

                return (
                  <div
                    key={entry.characterId}
                    className={`group flex items-center gap-3 rounded-xl p-2.5 transition-all duration-200 animate-fade-in
                      ${i < 3
                        ? "bg-dark-800/50 border border-dark-600/20 hover:border-dark-600/40"
                        : "hover:bg-dark-800/30"
                      }`}
                    style={{ animationDelay: `${i * 0.025}s` }}
                  >
                    {/* Rank */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 border ${getMedalStyle(i)}`}>
                      {i + 1}
                    </div>

                    {/* Thumbnail */}
                    {char && (
                      <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border ${
                        i === 0 ? "border-gold/25" : "border-dark-600/30"
                      }`}>
                        <CharacterImage character={char} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-priscilla/85 truncate group-hover:text-priscilla transition-colors">
                        {char?.name || entry.characterId}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-priscilla/30 capitalize">{char?.type || "Unknown"}</span>
                        <span className="text-priscilla/10">·</span>
                        {/* Mini bar */}
                        <div className="flex-1 h-1 rounded-full bg-dark-700/40 max-w-[60px] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              sortBy === "smash" ? "bg-gold/50" : "bg-pass/50"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-priscilla/25 tabular-nums">{pct}%</span>
                      </div>
                    </div>

                    {/* Vote counts */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-xs tabular-nums flex items-center gap-1 ${
                        sortBy === "smash" ? "text-gold/70 font-semibold" : "text-priscilla/25"
                      }`}>
                        <Heart size={10} fill={sortBy === "smash" ? "currentColor" : "none"} />
                        {entry.smash.toLocaleString()}
                      </span>
                      <span className={`text-xs tabular-nums flex items-center gap-1 ${
                        sortBy === "pass" ? "text-pass/70 font-semibold" : "text-priscilla/25"
                      }`}>
                        <Flame size={10} />
                        {entry.pass.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
