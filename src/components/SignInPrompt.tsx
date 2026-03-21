"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { LogIn, X } from "lucide-react";
import toast from "react-hot-toast";

/** Number of swipes before showing the prompt. */
const SWIPE_THRESHOLD = 5;

/** LocalStorage key so we don't nag after dismissal. */
const LS_DISMISSED_KEY = "signin-prompt-dismissed";

export function SignInPrompt() {
  const { user, signInWithGoogle } = useAuth();
  const { state } = useGame();
  const [visible, setVisible] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    // Don't show if signed in, or already dismissed this session
    if (user) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(LS_DISMISSED_KEY)) return;

    if (state.currentIndex >= SWIPE_THRESHOLD) {
      setVisible(true);
    }
  }, [user, state.currentIndex]);

  // Hide once signed in
  useEffect(() => {
    if (user) setVisible(false);
  }, [user]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(LS_DISMISSED_KEY, "1");
  };

  const handleSignIn = () => {
    setSigningIn(true);
    signInWithGoogle()
      .then((name) => {
        toast(`Welcome, ${name}`, { icon: "🔥", duration: 2500 });
        setVisible(false);
      })
      .catch(() => {
        toast.error("Sign-in failed");
      })
      .finally(() => setSigningIn(false));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-50 animate-slideUp">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3
        px-4 py-3.5 sm:py-3 rounded-2xl sm:rounded-xl bg-dark-800/95 border border-dark-600/40
        backdrop-blur-md shadow-lg shadow-black/40 sm:max-w-sm">
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="absolute -top-2 -right-2 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-dark-700 border border-dark-600/50
            flex items-center justify-center text-priscilla/50 hover:text-priscilla/80 active:scale-90 transition-all"
          aria-label="Dismiss"
        >
          <X size={14} className="sm:w-3 sm:h-3" />
        </button>

        {/* Text */}
        <div className="flex-1 min-w-0 pr-4 sm:pr-0">
          <p className="text-sm font-semibold text-priscilla/90">Save your progress</p>
          <p className="text-xs text-priscilla/50 mt-0.5 leading-relaxed">
            Sign in to sync across devices and share your profile (yes, that you smashed Ranni).
          </p>
        </div>

        {/* Sign in button — full width on mobile */}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-1.5
            px-4 py-2.5 sm:px-3 sm:py-1.5 rounded-lg text-sm sm:text-xs font-bold
            bg-ranni/20 text-ranni border border-ranni/30
            hover:bg-ranni/30 hover:border-ranni/50 active:scale-[0.97] transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn size={14} className="sm:w-[13px] sm:h-[13px]" />
          {signingIn ? "..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
