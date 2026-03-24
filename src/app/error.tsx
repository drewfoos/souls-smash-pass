"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center select-none">
      {/* Decorative rune */}
      <div
        className="text-5xl md:text-7xl text-pass/20 mb-6 animate-float"
        aria-hidden="true"
      >
        ✦
      </div>

      {/* YOU DIED treatment */}
      <h1
        className="text-souls font-black text-pass leading-none mb-2"
        style={{
          fontSize: "clamp(3rem, 12vw, 7rem)",
          textShadow: "0 0 60px rgba(255,82,119,0.2)",
        }}
      >
        YOU DIED
      </h1>

      <p className="text-ash/60 text-sm mb-1">
        Something went wrong.
      </p>
      <p className="text-[11px] text-ash/30 mb-10">
        The Erdtree&apos;s grace faltered
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
        >
          <span className="relative z-10">Try Again</span>
        </button>
        <Link
          href="/"
          className="px-6 py-3 text-sm text-ash/50 hover:text-gold transition-colors"
        >
          Return to Grace
        </Link>
      </div>

      <p className="mt-6 text-[10px] text-ash/20">
        Touch grace to continue your journey
      </p>
    </div>
  );
}
