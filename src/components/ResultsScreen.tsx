"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { CHARACTER_TYPE_COLORS, CHARACTER_TYPE_LABELS, type CharacterType } from "@/data/characters";
import {
  Heart,
  X,
  RotateCcw,
  Trophy,
  Skull,
  BarChart3,
  Flame,
  BookOpen,
} from "lucide-react";
import { CharacterImage } from "./CharacterImage";
import { Leaderboard } from "./Leaderboard";
import { UserProfile } from "./UserProfile";
import { useAuth } from "@/context/AuthContext";

export function ResultsScreen() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuth();
  const { stats, startGame, state } = useGame();
  const total = stats.smashed + stats.passed;
  const smashPercent =
    total > 0 ? Math.round((stats.smashed / total) * 100) : 0;

  const smashedChars = stats.smashedCharacters;

  // Group smashed characters by type
  const smashedByType = smashedChars.reduce<Record<string, typeof smashedChars>>((acc, char) => {
    if (!acc[char.type]) acc[char.type] = [];
    acc[char.type].push(char);
    return acc;
  }, {});

  // Thirst level
  const thirstLevel =
    smashPercent >= 80
      ? "Maidenless Behavior"
      : smashPercent >= 60
        ? "Down Horrendous"
        : smashPercent >= 40
          ? "Perfectly Balanced"
          : smashPercent >= 20
            ? "Picky Tarnished"
            : "Heart of Stone";

  return (
    <div className="min-h-dvh flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in-up">
        <Flame
          size={28}
          className="mx-auto mb-3 text-ember animate-bonfire"
        />
        <h1 className="text-souls text-4xl md:text-5xl font-black text-gold mb-2 drop-shadow-[0_0_20px_rgba(240,192,64,0.3)]">
          YOU DIED
        </h1>
        <p className="text-ash text-sm">...of thirst, apparently</p>
      </div>

      {/* Big stats */}
      <div
        className="flex items-center gap-10 mb-8 animate-fade-in"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="text-center">
          <Heart
            size={20}
            className="mx-auto mb-1.5 text-gold"
            fill="currentColor"
          />
          <div className="text-4xl md:text-5xl font-black text-souls text-gold tabular-nums">
            {stats.smashed}
          </div>
          <div className="text-xs text-ash mt-1">Smashed</div>
        </div>
        <div className="text-2xl text-dark-600 text-souls select-none">/</div>
        <div className="text-center">
          <X size={20} className="mx-auto mb-1.5 text-crimson-bright" />
          <div className="text-4xl md:text-5xl font-black text-souls text-crimson-bright tabular-nums">
            {stats.passed}
          </div>
          <div className="text-xs text-ash mt-1">Passed</div>
        </div>
      </div>

      {/* Smash rate bar */}
      <div
        className="card-dark p-4 mb-8 w-full max-w-md animate-fade-in"
        style={{ animationDelay: "0.25s" }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span className="text-souls text-ash">{thirstLevel}</span>
          <span className="text-gold font-bold tabular-nums">
            {smashPercent}%
          </span>
        </div>
        <div className="h-3 bg-dark-700/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-crimson-bright via-ember to-gold rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${smashPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-priscilla/20 mt-1.5">
          <span>Picky</span>
          <span>Down Bad</span>
        </div>
      </div>

      {/* Smash list — grouped by type */}
      {smashedChars.length > 0 && (
        <div
          className="w-full max-w-2xl mb-8 animate-fade-in"
          style={{ animationDelay: "0.35s" }}
        >
          <h2 className="text-souls text-lg font-bold text-gold mb-4 flex items-center gap-2">
            <Trophy size={18} />
            Your Smash List
          </h2>

          {Object.entries(smashedByType).map(([type, chars]) => {
            const colors = CHARACTER_TYPE_COLORS[type as CharacterType];
            return (
              <div key={type} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="type-pill"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {CHARACTER_TYPE_LABELS[type as CharacterType]}
                  </span>
                  <span className="text-[10px] text-ash tabular-nums">{chars.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {chars.map((char) => (
                    <div
                      key={char.id}
                      className="card-dark p-2 flex items-center gap-2.5 hover:border-gold/15 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-dark-700/40">
                        <CharacterImage character={char} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-priscilla/75 truncate">
                          {char.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Passed characters */}
      {stats.passedCharacters.length > 0 && (
        <div
          className="w-full max-w-2xl mb-10 animate-fade-in"
          style={{ animationDelay: "0.45s" }}
        >
          <h2 className="text-souls text-lg font-bold text-crimson-bright/70 mb-3 flex items-center gap-2">
            <Skull size={18} />
            The Reject Pile
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {stats.passedCharacters.map((char) => (
              <span
                key={char.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700/30 text-priscilla/25
                  border border-dark-700/20 hover:text-priscilla/45 transition-colors"
              >
                {char.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex flex-wrap justify-center gap-3 animate-fade-in"
        style={{ animationDelay: "0.55s" }}
      >
        <button
          onClick={() => startGame(
            state.selectedGames ?? undefined,
            state.selectedTypes ?? undefined,
            { replay: true },
          )}
          className="btn-primary px-8 py-3 text-sm flex items-center gap-2"
        >
          <RotateCcw size={16} />
          <span className="relative z-10">Play Again</span>
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="px-8 py-3 rounded-xl border border-gold/25 text-gold/70
            hover:bg-gold/8 hover:border-gold/40 transition-all flex items-center gap-2 text-sm"
        >
          <BarChart3 size={16} />
          Leaderboard
        </button>
        {user && (
          <button
            onClick={() => setShowProfile(true)}
            className="px-8 py-3 rounded-xl border border-ranni/25 text-ranni/70
              hover:bg-ranni/8 hover:border-ranni/40 transition-all flex items-center gap-2 text-sm"
          >
            <BookOpen size={16} />
            My History
          </button>
        )}
      </div>

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
