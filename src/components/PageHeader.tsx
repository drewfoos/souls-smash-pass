"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function PageHeader({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <header className="flex items-center justify-between mb-12">
      <Link
        href="/"
        className="flex items-center gap-2 group"
      >
        <span className="text-gold/40 group-hover:text-gold/70 transition-colors text-lg" aria-hidden="true">✦</span>
        <span className="text-souls font-bold text-gold/80 group-hover:text-gold transition-colors text-sm tracking-wider">
          Elden Smash
        </span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden sm:flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              current === link.href
                ? "text-gold bg-gold/10"
                : "text-ash/50 hover:text-ash/80 hover:bg-dark-700/50"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="relative sm:hidden" ref={menuRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-center w-9 h-9 rounded-lg
            bg-dark-800/80 border border-dark-600/40 backdrop-blur-sm
            hover:bg-dark-700/80 transition-all"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? (
            <X size={16} className="text-priscilla/70" />
          ) : (
            <Menu size={16} className="text-priscilla/70" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-dark-800/95 border border-dark-600/40 backdrop-blur-md shadow-2xl overflow-hidden z-50 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-xs transition-colors ${
                  current === link.href
                    ? "text-gold bg-gold/10 font-semibold"
                    : "text-priscilla/60 hover:bg-dark-700/40 hover:text-priscilla/90"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-dark-700/40">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-xs text-gold/60 hover:bg-dark-700/40 hover:text-gold transition-colors"
              >
                ← Play Game
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
