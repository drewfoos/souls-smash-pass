import Link from "next/link";
import type { Metadata } from "next";
import {
  Flame,
  Swords,
  Users,
  Filter,
  Share2,
  Globe,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eldensmash.com";

export const metadata: Metadata = {
  title: "About | Elden Ring Smash or Pass",
  description:
    "Elden Smash is the ultimate Elden Ring Smash or Pass game. Swipe through 500+ characters from the Lands Between — bosses, NPCs, merchants, summons, and creatures.",
  keywords: [
    "elden ring smash or pass",
    "smash or pass elden ring",
    "elden ring character tier list",
    "elden ring characters",
  ],
  openGraph: {
    title: "About | Elden Ring Smash or Pass",
    description:
      "Swipe through 500+ Elden Ring characters. Bosses, NPCs, merchants, summons, and creatures from the Lands Between.",
    url: `${SITE_URL}/about`,
  },
  twitter: {
    card: "summary_large_image",
    title: "About | Elden Ring Smash or Pass",
    description:
      "Swipe through 500+ Elden Ring characters. Bosses, NPCs, merchants, summons, and creatures from the Lands Between.",
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

const features: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  glow: string;
}[] = [
  {
    icon: Swords,
    title: "Swipe or Tap",
    description:
      "Drag right to smash, left to pass. Buttons and arrow keys work too.",
    accent: "text-gold",
    glow: "rgba(255,215,0,0.06)",
  },
  {
    icon: Users,
    title: "500+ Characters",
    description:
      "Every boss, NPC, merchant, summon, and creature. From Ranni to the humble land octopus.",
    accent: "text-ranni",
    glow: "rgba(167,139,250,0.06)",
  },
  {
    icon: Flame,
    title: "Weekly Shuffle",
    description:
      "The deck reshuffles every Monday. Same order for all players each week.",
    accent: "text-ember",
    glow: "rgba(255,107,53,0.06)",
  },
  {
    icon: Globe,
    title: "Sign In & Sync",
    description:
      "Google sign-in saves progress across devices and puts you on the leaderboard.",
    accent: "text-moonlight",
    glow: "rgba(107,140,206,0.06)",
  },
  {
    icon: Filter,
    title: "Filter by Type",
    description:
      "Focus on bosses, NPCs, or any category. Build your perfect run.",
    accent: "text-smash",
    glow: "rgba(46,232,154,0.06)",
  },
  {
    icon: Share2,
    title: "Share Results",
    description:
      "Show your friends which characters you smashed — if you dare.",
    accent: "text-pass",
    glow: "rgba(255,82,119,0.06)",
  },
];

/* Character portraits for the showcase strip */
const showcaseChars = [
  { src: "/characters/er_malenia.webp", name: "Malenia", border: "border-ember/30" },
  { src: "/characters/er_blaidd.webp", name: "Blaidd", border: "border-frost/30" },
  { src: "/characters/er_ranni.webp", name: "Ranni", border: "border-ranni/40", featured: true },
  { src: "/characters/er_radahn.webp", name: "Radahn", border: "border-gold-dim/30" },
  { src: "/characters/er_melina.webp", name: "Melina", border: "border-moonlight/30" },
];

export default function AboutPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <PageHeader current="/about" />

        {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative pt-4 pb-16">
          {/* Background glow — ranni purple tint blended with gold */}
          <div
            className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(167,139,250,0.04) 0%, rgba(255,215,0,0.03) 40%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative">
            {/* Eyebrow */}
            <p className="text-souls text-[11px] text-gold/50 tracking-[0.3em] uppercase mb-5 text-center animate-fade-in">
              The Lands Between Await
            </p>

            {/* Title */}
            <h1
              className="text-souls font-black text-gold leading-[1.05] mb-6 text-center animate-fade-in"
              style={{
                fontSize: "clamp(2.5rem, 7vw, 4rem)",
                textShadow: "0 0 80px rgba(255,215,0,0.15)",
                animationDelay: "50ms",
              }}
            >
              Smash or Pass
              <br />
              <span className="text-priscilla/90">Every Character</span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-ash/65 max-w-md mx-auto text-[15px] leading-relaxed mb-8 text-center animate-fade-in"
              style={{ animationDelay: "100ms" }}
            >
              500+ Elden Ring characters. One question each.
              <br className="hidden sm:block" />
              No account needed — just start swiping.
            </p>

            {/* CTA */}
            <div
              className="text-center animate-fade-in"
              style={{ animationDelay: "150ms" }}
            >
              <Link
                href="/"
                className="btn-primary px-10 py-3.5 text-sm inline-flex items-center gap-2.5 group"
              >
                <span className="relative z-10 flex items-center gap-2.5">
                  Start Playing
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </div>

            {/* ── Character showcase ── */}
            <div
              className="flex items-center justify-center gap-2.5 sm:gap-3 mt-12 animate-fade-in"
              style={{ animationDelay: "250ms" }}
            >
              {showcaseChars.map((char) => {
                const isFeatured = char.featured;
                return (
                  <div
                    key={char.name}
                    className={`relative group/card ${
                      isFeatured ? "z-10" : "z-0"
                    }`}
                  >
                    {/* Glow behind featured card */}
                    {isFeatured && (
                      <div
                        className="absolute -inset-3 rounded-2xl opacity-30 blur-xl pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%)",
                        }}
                        aria-hidden="true"
                      />
                    )}

                    <div
                      className={`relative overflow-hidden rounded-lg border-2 ${
                        char.border
                      } transition-transform duration-300 group-hover/card:scale-[1.04] ${
                        isFeatured
                          ? "w-[100px] h-[58px] sm:w-[140px] sm:h-[80px]"
                          : "w-[72px] h-[42px] sm:w-[108px] sm:h-[62px]"
                      }`}
                      style={{
                        boxShadow: isFeatured
                          ? "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(167,139,250,0.1)"
                          : "0 4px 16px rgba(0,0,0,0.4)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={char.src}
                        alt={char.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />

                      {/* Gradient overlay at bottom */}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

                      {/* Name label */}
                      <span
                        className={`absolute bottom-0.5 sm:bottom-1 inset-x-0 text-center text-priscilla/90 font-medium ${
                          isFeatured
                            ? "text-[9px] sm:text-[11px]"
                            : "text-[7px] sm:text-[9px]"
                        }`}
                        style={{
                          textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                        }}
                      >
                        {char.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats row */}
            <div
              className="flex items-center justify-center gap-6 sm:gap-10 mt-10 animate-fade-in"
              style={{ animationDelay: "350ms" }}
            >
              {[
                { value: "500+", label: "Characters" },
                { value: "Free", label: "No Ads" },
                { value: "Live", label: "Leaderboard" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-souls font-bold text-gold/80 text-lg leading-none">
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-ash/40 tracking-wider uppercase mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━ Divider ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex items-center gap-4 mb-16" aria-hidden="true">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
          <div className="text-gold/20 text-xs">✦</div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
        </div>

        {/* ━━ What is it ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8 md:gap-12 items-start">
            <div>
              <h2
                className="text-souls font-bold text-gold text-2xl md:text-3xl leading-tight"
                style={{ textShadow: "0 0 50px rgba(255,215,0,0.1)" }}
              >
                What is
                <br />
                Elden Smash?
              </h2>
              <div className="w-10 h-0.5 bg-gold/30 mt-4 rounded-full" />
            </div>

            <p className="text-[15px] text-ash/70 leading-[1.85]">
              A free{" "}
              <strong className="text-priscilla/90">Smash or Pass</strong> game
              with every character from{" "}
              <strong className="text-priscilla/90">Elden Ring</strong> by
              FromSoftware — bosses, NPCs, merchants, spirit summons, and
              creatures. The roster includes{" "}
              <span className="text-ranni font-medium">Ranni the Witch</span>,{" "}
              <span className="text-ember font-medium">
                Malenia, Blade of Miquella
              </span>
              , <span className="text-gold-dim font-medium">Radahn</span>,{" "}
              <span className="text-moonlight font-medium">Melina</span>,{" "}
              <span className="text-frost font-medium">Blaidd</span>, and
              hundreds more. Vote on every single one.
            </p>
          </div>
        </section>

        {/* ━━ Features ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <div className="text-center mb-10">
            <h2
              className="text-souls font-bold text-gold text-2xl md:text-3xl"
              style={{ textShadow: "0 0 50px rgba(255,215,0,0.1)" }}
            >
              How It Works
            </h2>
          </div>

          {/* Mobile: compact horizontal rows */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-lg border border-white/[0.05] bg-dark-800/40 p-3 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.06] bg-dark-900/60 ${feature.accent}`}
                >
                  <feature.icon size={14} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-souls font-bold text-[11px] text-priscilla/90 tracking-wide leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[10px] text-ash/55 leading-snug mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: card grid with colored glow */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative rounded-xl overflow-hidden animate-fade-in"
                style={{
                  animationDelay: `${i * 70}ms`,
                  background: `linear-gradient(to bottom, ${feature.glow}, transparent 60%)`,
                }}
              >
                <div className="relative rounded-xl border border-white/[0.05] bg-dark-800/50 p-5 h-full transition-all duration-300 group-hover:border-white/[0.1] group-hover:bg-dark-800/70">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/[0.06] bg-dark-900/60 ${feature.accent} transition-colors`}
                    >
                      <feature.icon size={18} />
                    </div>
                    <span className="text-souls text-[11px] text-ash/20 tracking-widest">
                      0{i + 1}
                    </span>
                  </div>

                  <h3 className="text-souls font-bold text-[13px] text-priscilla/90 mb-2 tracking-wide">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-ash/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ━━ Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <footer className="border-t border-white/[0.04] pt-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
            <div>
              <h2 className="text-souls font-bold text-ash/40 text-[10px] tracking-[0.2em] uppercase mb-2.5">
                Built With
              </h2>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {[
                  "Next.js",
                  "Tailwind CSS",
                  "Framer Motion",
                  "Firebase",
                  "Vercel",
                ].map((t, i, arr) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="text-xs text-ash/55">{t}</span>
                    {i < arr.length - 1 && (
                      <span className="text-ash/15 text-[8px]">/</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-ash/50 sm:text-right">
              Created by{" "}
              <a
                href="https://github.com/drewfoos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold/60 hover:text-gold transition-colors underline underline-offset-2 decoration-gold/20 hover:decoration-gold/50"
              >
                drewfoos
              </a>
            </p>
          </div>

          <p className="text-[11px] text-ash/35 leading-relaxed max-w-xl">
            Elden Smash is a fan project and is not affiliated with, endorsed by,
            or connected to FromSoftware or Bandai Namco. Elden Ring and all
            related characters are trademarks of their respective owners.
          </p>
        </footer>
      </div>
    </main>
  );
}
