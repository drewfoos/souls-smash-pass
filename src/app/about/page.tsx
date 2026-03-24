import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Swords, Users, Filter, Share2, Globe } from "lucide-react";
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

const features = [
  {
    icon: Swords,
    title: "Swipe or Tap",
    description: "Drag cards right to smash or left to pass — or use the buttons. Arrow keys work on desktop too.",
    color: "text-gold",
  },
  {
    icon: Users,
    title: "500+ Characters",
    description: "Every boss, NPC, merchant, summon, and creature from Elden Ring. From Ranni to the humble land octopus.",
    color: "text-ranni",
  },
  {
    icon: Flame,
    title: "Weekly Shuffle",
    description: "The deck order changes every Monday so the experience stays fresh. All players see the same order each week.",
    color: "text-ember",
  },
  {
    icon: Globe,
    title: "Sign In & Sync",
    description: "Sign in with Google to save progress across devices and appear on the global leaderboard.",
    color: "text-moonlight",
  },
  {
    icon: Filter,
    title: "Filter by Type",
    description: "Focus on just bosses, NPCs, or any other category. Mix and match to build your perfect run.",
    color: "text-smash",
  },
  {
    icon: Share2,
    title: "Share Results",
    description: "Show your friends which Elden Ring characters you smashed — if you dare.",
    color: "text-pass",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-dvh py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <PageHeader current="/about" />

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-souls font-black text-gold text-3xl md:text-4xl mb-3 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)]">
            About Elden Smash
          </h1>
          <p className="text-ash/60 max-w-md mx-auto leading-relaxed">
            The ultimate <strong className="text-ash/90">Elden Ring Smash or Pass</strong> game.
            Swipe through 500+ characters from the Lands Between.
          </p>
        </div>

        {/* What is it */}
        <div className="card-dark p-6 mb-8">
          <h2 className="text-souls font-bold text-gold/80 text-lg mb-3">
            What is Elden Smash?
          </h2>
          <p className="text-sm text-ash/70 leading-relaxed">
            Elden Smash is a free <strong className="text-ash/90">Smash or Pass</strong> game
            featuring over 500 characters from{" "}
            <strong className="text-ash/90">Elden Ring</strong> by FromSoftware. The roster includes
            fan-favorites like <span className="text-ranni">Ranni the Witch</span>,{" "}
            <span className="text-ember">Malenia, Blade of Miquella</span>,{" "}
            <span className="text-gold-dim">Radahn</span>,{" "}
            <span className="text-moonlight">Melina</span>,{" "}
            <span className="text-frost">Blaidd</span>, and hundreds more.
          </p>
        </div>

        {/* Features grid */}
        <h2 className="text-souls font-bold text-gold/80 text-lg mb-4">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-dark p-5 flex gap-4 items-start hover:border-gold/15 transition-colors"
            >
              <feature.icon className={`w-5 h-5 ${feature.color} shrink-0 mt-0.5`} />
              <div>
                <h3 className="text-souls font-bold text-sm text-priscilla/90 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs text-ash/75 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Built with */}
        <div className="card-dark p-6 mb-8">
          <h2 className="text-souls font-bold text-gold/80 text-lg mb-3">Built With</h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "Tailwind CSS", "Framer Motion", "Firebase", "Vercel"].map((tech) => (
              <span
                key={tech}
                className="text-xs px-3 py-1.5 rounded-full bg-dark-700/50 text-ash/75 border border-ash/10"
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="text-xs text-ash/65 mt-4">
            Created by{" "}
            <a
              href="https://github.com/drewfoos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/70 hover:text-gold transition-colors underline underline-offset-2"
            >
              drewfoos
            </a>
          </p>
        </div>

        {/* Disclaimer */}
        <div className="rounded-lg border border-ash/8 bg-dark-900/50 p-5">
          <h2 className="text-souls font-bold text-ash/65 text-sm mb-2">Disclaimer</h2>
          <p className="text-xs text-ash/60 leading-relaxed">
            Elden Smash is a fan project and is not affiliated with, endorsed by, or connected to
            FromSoftware or Bandai Namco. Elden Ring and all related characters are trademarks of
            their respective owners.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
          >
            <span className="relative z-10">Start Playing</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
