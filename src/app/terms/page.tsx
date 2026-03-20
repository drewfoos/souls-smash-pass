import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Elden Smash",
  description: "Terms of service for Elden Smash or Pass.",
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ash/50 hover:text-gold
            transition-colors mb-8"
        >
          <span>←</span>
          <span className="text-souls tracking-wider">Elden Smash</span>
        </Link>

        <h1 className="text-souls font-black text-gold text-3xl md:text-4xl mb-2">
          Terms of Service
        </h1>
        <p className="text-xs text-ash/40 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-ash/70 leading-relaxed">

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              About This Site
            </h2>
            <p>
              Elden Smash or Pass is an unofficial fan-made project created for entertainment
              purposes. It is not affiliated with, endorsed by, or sponsored by FromSoftware,
              Bandai Namco Entertainment, or any other rights holder. All Elden Ring characters,
              names, and assets are the intellectual property of their respective owners.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Use of the Service
            </h2>
            <p className="mb-3">By using this site you agree to:</p>
            <ul className="space-y-1.5 pl-4 list-disc marker:text-gold/30">
              <li>Use the site for personal, non-commercial entertainment only.</li>
              <li>
                Not attempt to reverse-engineer, scrape, or abuse the site&apos;s APIs or
                infrastructure.
              </li>
              <li>
                Not submit votes or manipulate leaderboard data through automated means.
              </li>
              <li>Not use the site in any way that violates applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              User Accounts
            </h2>
            <p>
              Accounts are created via Google OAuth. You are responsible for maintaining
              the security of your Google account. We reserve the right to suspend or
              terminate accounts that abuse the service.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Public Profiles
            </h2>
            <p>
              If you enable a public profile, your display name, tagline, and vote history
              become publicly visible. You are responsible for the content of your profile.
              Do not include personal information you do not wish to share publicly.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Intellectual Property
            </h2>
            <p>
              Elden Ring and all associated characters, names, artwork, and lore are property
              of FromSoftware, Inc. and Bandai Namco Entertainment Inc. This site uses
              character names and imagery for fan, non-commercial purposes under principles
              of fair use. No claim of ownership over FromSoftware&apos;s intellectual property
              is made.
            </p>
            <p className="mt-3">
              The site&apos;s original code, design, and layout are created by drewfoos and are
              not licensed for redistribution without permission.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Disclaimer of Warranties
            </h2>
            <p>
              This site is provided &ldquo;as is&rdquo; without any warranty of any kind. We make
              no guarantees regarding uptime, data retention, or continued availability of
              the service. Vote data and progress may be lost if the service is discontinued.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Limitation of Liability
            </h2>
            <p>
              To the fullest extent permitted by law, the site owner shall not be liable
              for any damages arising from your use of or inability to use the site.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">Changes</h2>
            <p>
              These terms may be updated at any time. The &ldquo;Last updated&rdquo; date above
              reflects the most recent revision. Continued use of the site after changes
              constitutes acceptance of the revised terms.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-12 pt-6 border-t border-dark-700/30 flex flex-wrap gap-4 text-xs text-ash/35">
          <Link href="/" className="hover:text-gold transition-colors">← Back to game</Link>
          <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
