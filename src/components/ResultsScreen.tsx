"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import { getUserData } from "@/lib/firebase-user";
import { CHARACTER_TYPE_COLORS, CHARACTER_TYPE_LABELS, type CharacterType } from "@/data/characters";
import {
  Heart,
  X,
  RotateCcw,
  Trophy,
  Skull,
  BarChart3,
  Flame,
  LogIn,
  Link2,
} from "lucide-react";
import { LazyCharCard } from "./LazyCharCard";
import { Leaderboard } from "./Leaderboard";
import { UserProfile } from "./UserProfile";
import { ShareButtons } from "./ShareButtons";
import { SignInButton, type ProfileTab } from "./SignInButton";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export function ResultsScreen() {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const { user, signInWithGoogle } = useAuth();
  const [isPublic, setIsPublic] = useState(false);
  const { stats, startGame, state } = useGame();

  useEffect(() => {
    if (!user) return;
    getUserData(user.uid).then((data) => {
      if (data?.isPublic) setIsPublic(true);
    });
  }, [user]);

  const handleShareSignIn = useCallback(() => {
    setShowSignInModal(true);
  }, []);

  const handleSignIn = useCallback(() => {
    setSigningIn(true);
    signInWithGoogle()
      .then((name) => {
        toast(`Welcome, ${name}! Your profile is ready to share.`, { icon: "\uD83D\uDD25", duration: 3000 });
        setShowSignInModal(false);
      })
      .catch(() => {
        toast.error("Sign-in failed");
      })
      .finally(() => setSigningIn(false));
  }, [signInWithGoogle]);

  const handleShareProfile = useCallback(() => {
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    if (!isPublic) {
      toast("Your profile is private. Enable public profile in Settings to share.", { icon: "\uD83D\uDD12", duration: 3500 });
      return;
    }
    const url = `https://eldensmash.com/users/${user.uid}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Profile link copied!", { duration: 2000 });
    }).catch(() => {
      toast(`Your link: /users/${user.uid}`, { duration: 5000 });
    });
  }, [user, isPublic]);
  const total = stats.smashed + stats.passed;
  const smashPercent =
    total > 0 ? Math.round((stats.smashed / total) * 100) : 0;

  const smashedChars = stats.smashedCharacters;

  // Group smashed characters by type — memoized to avoid recomputing on every render
  const smashedByType = useMemo(
    () => smashedChars.reduce<Record<string, typeof smashedChars>>((acc, char) => {
      if (!acc[char.type]) acc[char.type] = [];
      acc[char.type].push(char);
      return acc;
    }, {}),
    [smashedChars],
  );

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
    <div className="min-h-dvh flex flex-col items-center py-8 px-4 relative">
      {/* Top-right sign-in / user dropdown */}
      <div className="fixed top-3 right-3 z-40">
        <SignInButton onOpenProfile={(tab) => { setProfileTab(tab); setShowProfile(true); }} />
      </div>

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

      {/* Share */}
      <div
        className="flex flex-col items-center gap-2 mb-8 animate-fade-in"
        style={{ animationDelay: "0.3s" }}
      >
        <span className="text-[10px] text-priscilla/30 uppercase tracking-widest">Share your shame</span>
        <ShareButtons
          smashed={stats.smashed}
          passed={stats.passed}
          total={total}
          smashPercent={smashPercent}
          profileUrl={user && isPublic ? `https://eldensmash.com/users/${user.uid}` : null}
          onSignInRequired={!user ? handleShareSignIn : undefined}
        />
        <button
          onClick={handleShareProfile}
          className="flex items-center gap-1.5 text-xs text-ranni/60
            hover:text-ranni transition-colors mt-1"
        >
          <Link2 size={11} />
          Share Profile
        </button>
      </div>

      {/* Actions */}
      <div
        className="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in"
        style={{ animationDelay: "0.35s" }}
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
      </div>

      {/* Smash list — grouped by type */}
      {smashedChars.length > 0 && (
        <div
          className="w-full max-w-2xl mb-8 animate-fade-in"
          style={{ animationDelay: "0.4s" }}
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
                    <LazyCharCard key={char.id} char={char} />
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
          style={{ animationDelay: "0.5s" }}
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

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} defaultTab={profileTab} />
      )}

      {/* Sign-in modal for anonymous share */}
      {showSignInModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowSignInModal(false)}
        >
          <div
            className="relative mx-4 w-full max-w-sm rounded-2xl bg-dark-800 border border-dark-600/50 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-dark-700 border border-dark-600/50
                flex items-center justify-center text-priscilla/50 hover:text-priscilla/80 active:scale-90 transition-all"
              aria-label="Close"
            >
              <X size={14} />
            </button>

            <h3 className="text-souls text-gold font-bold text-lg mb-2">Share your profile</h3>
            <p className="text-sm text-priscilla/50 mb-5 leading-relaxed">
              Sign in to create your public profile and share your picks. Your progress will be saved automatically.
            </p>

            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold
                bg-ranni/20 text-ranni border border-ranni/30
                hover:bg-ranni/30 hover:border-ranni/50 active:scale-[0.97] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={16} />
              {signingIn ? "Signing in..." : "Sign in with Google"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
