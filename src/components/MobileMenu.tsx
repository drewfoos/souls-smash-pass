"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import {
  Menu,
  X,
  BarChart3,
  LogIn,
  LogOut,
  BookOpen,
  Settings,
  Loader2,
  Shield,
  FileText,
} from "lucide-react";
import {
  type CharacterType,
  CHARACTER_TYPE_LABELS,
  CHARACTER_TYPE_COLORS,
  getAvailableTypes,
} from "@/data/characters";
import type { ProfileTab } from "./SignInButton";
import toast from "react-hot-toast";

// Representative character image for each type
const TYPE_IMAGES: Record<CharacterType, string> = {
  boss: "/characters/er_malenia.webp",
  npc: "/characters/er_ranni.webp",
  mob: "/characters/er_soldier_of_godrick.webp",
  mc: "/characters/er_melina.webp",
  merchant: "/characters/er_melina.webp",
  summon: "/characters/er_spirit_jellyfish.webp",
};

interface MobileMenuProps {
  onOpenLeaderboard: () => void;
  onOpenProfile: (tab: ProfileTab) => void;
  currentTypes: CharacterType[] | null;
  onFilterApply: (types?: CharacterType[]) => void;
}

export function MobileMenu({
  onOpenLeaderboard,
  onOpenProfile,
  currentTypes,
  onFilterApply,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { flushPendingVotes } = useGame();
  const [signingIn, setSigningIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const availableTypes = getAvailableTypes();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleSignIn = () => {
    setSigningIn(true);
    signInWithGoogle()
      .then((displayName) => {
        const firstName = displayName.split(" ")[0];
        toast.success(`Welcome, ${firstName}!`, { duration: 3000 });
        setSigningIn(false);
        setOpen(false);
      })
      .catch((err) => {
        console.error("Sign-in failed:", err);
        if (err?.code !== "auth/popup-closed-by-user") {
          toast.error("Sign-in failed. Please try again.");
        }
        setSigningIn(false);
      });
  };

  const handleSignOut = async () => {
    setOpen(false);
    await flushPendingVotes();
    await signOutUser();
    toast("Signed out", { duration: 2000 });
  };

  const handleFilter = (type: CharacterType | "all") => {
    setOpen(false);
    if (type === "all") {
      onFilterApply(undefined);
    } else {
      onFilterApply([type]);
    }
  };

  const firstName = user?.displayName?.split(" ")[0] ?? "Tarnished";

  return (
    <div className="fixed top-2 right-2 z-50 md:hidden landscape-short:!block" ref={menuRef}>
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-10 h-10 rounded-lg
          bg-dark-800/90 border border-dark-600/40 backdrop-blur-sm
          hover:bg-dark-700/90 transition-all"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X size={18} className="text-priscilla/70" /> : <Menu size={18} className="text-priscilla/70" />}
      </button>

      {/* Menu panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-dark-800/95 border border-dark-600/40 backdrop-blur-md shadow-2xl overflow-hidden animate-fade-in landscape-short:max-h-[calc(100dvh-3.5rem)] landscape-short:overflow-y-auto">

          {/* User section */}
          {!loading && user && (
            <div className="px-3 py-2.5 border-b border-dark-700/50">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={firstName}
                    className="w-7 h-7 rounded-full object-cover border border-gold/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ranni to-moonlight flex items-center justify-center text-[10px] font-black text-white">
                    {firstName[0]?.toUpperCase() ?? "T"}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-priscilla/80 truncate">
                    {user.displayName ?? "Tarnished"}
                  </div>
                  <div className="text-[10px] text-ash/50 truncate">{user.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="py-1">
            {/* Stats */}
            <button
              onClick={() => { setOpen(false); onOpenLeaderboard(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-smash font-semibold
                hover:bg-dark-700/40 transition-all"
            >
              <BarChart3 size={14} />
              Leaderboard
            </button>

            {/* Profile / Settings (signed in only) */}
            {user && (
              <>
                <button
                  onClick={() => { setOpen(false); onOpenProfile("profile"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/60
                    hover:bg-dark-700/40 hover:text-gold transition-all"
                >
                  <BookOpen size={14} />
                  My Profile
                </button>
                <button
                  onClick={() => { setOpen(false); onOpenProfile("settings"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/60
                    hover:bg-dark-700/40 hover:text-ranni transition-all"
                >
                  <Settings size={14} />
                  Settings
                </button>
              </>
            )}

            {/* Sign in / out */}
            {!loading && !user && (
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/50
                  hover:bg-dark-700/40 hover:text-priscilla/80 transition-all
                  disabled:opacity-50"
              >
                {signingIn ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                {signingIn ? "Signing in…" : "Sign in with Google"}
              </button>
            )}
            {user && (
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/40
                  hover:bg-dark-700/40 hover:text-pass transition-all"
              >
                <LogOut size={14} />
                Sign out
              </button>
            )}
          </div>

          {/* Filter section */}
          <div className="border-t border-dark-700/50 py-1">
            <div className="px-3 py-1.5 text-[10px] text-priscilla/30 uppercase tracking-widest font-semibold">
              Filter Characters
            </div>
            <button
              onClick={() => handleFilter("all")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors
                hover:bg-dark-700/40 ${!currentTypes ? "text-gold font-semibold" : "text-priscilla/60"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/characters/er_malenia.webp" alt="" className="w-6 h-6 rounded object-cover border border-gold/30" draggable={false} />
              All Characters
              {!currentTypes && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />}
            </button>
            {availableTypes.map(({ type, count }) => {
              const colors = CHARACTER_TYPE_COLORS[type];
              const isActive = currentTypes?.includes(type) && currentTypes.length === 1;
              return (
                <button
                  key={type}
                  onClick={() => handleFilter(type)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors
                    hover:bg-dark-700/40 ${isActive ? "font-semibold" : "text-priscilla/60"}`}
                  style={isActive ? { color: colors.text } : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TYPE_IMAGES[type]} alt="" className="w-6 h-6 rounded object-cover" style={{ border: `2px solid ${colors.border}` }} draggable={false} />
                  {CHARACTER_TYPE_LABELS[type]}
                  <span className="text-[10px] text-priscilla/30 ml-0.5">{count}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.text }} />}
                </button>
              );
            })}
          </div>

          {/* Footer links */}
          <div className="border-t border-dark-700/50 py-1">
            <Link
              href="/privacy"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-priscilla/40
                hover:bg-dark-700/40 hover:text-priscilla/60 transition-all"
            >
              <Shield size={14} />
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-priscilla/40
                hover:bg-dark-700/40 hover:text-priscilla/60 transition-all"
            >
              <FileText size={14} />
              Terms of Service
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
