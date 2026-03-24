"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { LogIn, LogOut, User, ChevronDown, Loader2, Settings, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

export type ProfileTab = "profile" | "settings";

interface SignInButtonProps {
  /** Called when the user picks a menu item that opens the profile modal. */
  onOpenProfile: (tab: ProfileTab) => void;
}

export function SignInButton({ onOpenProfile }: SignInButtonProps) {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();
  const { flushPendingVotes } = useGame();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
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
    setDropdownOpen(false);
    // Flush buffered votes while the auth token is still valid.
    // After signOut(), auth.currentUser is null and votes would be sent anonymously.
    await flushPendingVotes();
    await signOutUser();
    toast("Signed out", { duration: 2000 });
  };

  const open = (tab: ProfileTab) => {
    setDropdownOpen(false);
    onOpenProfile(tab);
  };

  // Loading skeleton
  if (loading) return <div className="w-8 h-8 rounded-full bg-dark-700/60 animate-pulse" />;

  // Signed out
  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={signingIn}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          text-smash/70 border border-smash/25
          hover:text-smash hover:border-smash/50 hover:bg-smash/10
          disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        aria-label="Sign in with Google"
      >
        {signingIn ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
        {signingIn ? "Signing in…" : "Sign in"}
      </button>
    );
  }

  // Signed in — avatar + dropdown
  const firstName = user.displayName?.split(" ")[0] ?? "Tarnished";
  const initial = firstName[0]?.toUpperCase() ?? "T";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold
          text-priscilla/70 border border-dark-600/40
          hover:text-priscilla hover:border-gold/30 hover:bg-dark-700/30
          transition-all"
        aria-label="Account menu"
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={firstName}
            className="w-5 h-5 rounded-full object-cover border border-gold/20"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-ranni to-moonlight
            flex items-center justify-center text-[9px] font-black text-white">
            {initial}
          </div>
        )}
        <span className="hidden sm:inline max-w-[80px] truncate">{firstName}</span>
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute right-0 top-full mt-1.5 w-52 card-dark border border-dark-600/50
            rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in"
          role="menu"
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-dark-700/50">
            <div className="text-xs font-semibold text-priscilla/80 truncate">
              {user.displayName ?? "Tarnished"}
            </div>
            <div className="text-[10px] text-ash/50 truncate mt-0.5">{user.email}</div>
          </div>

          {/* Profile */}
          <button
            onClick={() => open("profile")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/60
              hover:bg-dark-700/40 hover:text-gold transition-all"
            role="menuitem"
          >
            <BookOpen size={13} />
            My Profile
          </button>

          {/* Settings */}
          <button
            onClick={() => open("settings")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/60
              hover:bg-dark-700/40 hover:text-ranni transition-all"
            role="menuitem"
          >
            <Settings size={13} />
            Settings
          </button>

          {/* Divider + Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-priscilla/40
              hover:bg-dark-700/40 hover:text-pass transition-all border-t border-dark-700/50"
            role="menuitem"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// Small standalone icon (kept for any future use)
export function UserIcon({ onViewProfile }: { onViewProfile: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <button
      onClick={onViewProfile}
      className="p-1.5 rounded-lg text-priscilla/40 hover:text-gold transition-colors"
      title="My Profile"
    >
      <User size={15} />
    </button>
  );
}
