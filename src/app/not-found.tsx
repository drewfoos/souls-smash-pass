import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Elden Smash",
};

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center select-none">
      {/* Decorative rune */}
      <div
        className="text-5xl md:text-7xl text-gold/20 mb-6 animate-float"
        aria-hidden="true"
      >
        ✦
      </div>

      {/* YOU DIED treatment */}
      <h1
        className="text-souls font-black text-gold leading-none mb-2"
        style={{
          fontSize: "clamp(3rem, 12vw, 7rem)",
          textShadow: "0 0 60px rgba(255,215,0,0.2)",
        }}
      >
        YOU DIED
      </h1>

      <p className="text-ash/60 text-sm mb-1">
        This page doesn&apos;t exist.
      </p>
      <p className="text-[11px] text-ash/30 mb-10">
        404 — Not Found
      </p>

      <Link
        href="/"
        className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
      >
        <span className="relative z-10">Return to Grace</span>
      </Link>

      <p className="mt-6 text-[10px] text-ash/20">
        Touch grace to continue your journey
      </p>
    </div>
  );
}
