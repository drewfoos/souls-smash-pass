import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Elden Smash",
  description: "What data Elden Smash collects and how it is used.",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-xs text-ash/40 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-ash/70 leading-relaxed">

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">Overview</h2>
            <p>
              Elden Smash or Pass is a fan-made game built by{" "}
              <a
                href="https://github.com/drewfoos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ranni hover:text-ranni/70 underline underline-offset-2 transition-colors"
              >
                drewfoos
              </a>
              . This policy explains what information is collected when you use the
              site and how it is stored and used.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Information We Collect
            </h2>

            <h3 className="text-sm font-semibold text-priscilla/60 mb-2">
              If you play without signing in
            </h3>
            <p className="mb-4">
              Your game progress (the order of characters and your smash / pass choices) is
              saved only in your browser&apos;s <code className="text-ranni/70">localStorage</code>.
              This data never leaves your device and is not sent to any server.
            </p>

            <h3 className="text-sm font-semibold text-priscilla/60 mb-2">
              If you sign in with Google
            </h3>
            <p className="mb-2">
              Signing in uses Google OAuth. We receive the following information from Google and
              store it in Firebase Realtime Database:
            </p>
            <ul className="space-y-1.5 pl-4 list-disc marker:text-gold/30">
              <li>Your Google display name</li>
              <li>Your Google profile photo URL</li>
              <li>Your Google account email address (used only to identify your account)</li>
              <li>
                Your smash / pass choices per character, so your history is preserved
                across devices and sessions
              </li>
              <li>
                Your current position in the deck (which character you are on),
                for cross-device sync
              </li>
              <li>A timestamp of when you last played</li>
              <li>
                Any display name or tagline you manually set in your Settings
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Vote Counts
            </h2>
            <p>
              Aggregate vote counts (total smashes and passes per character, with no personal
              identifiers) are stored in Firebase and used to power the live leaderboard and
              the &ldquo;What Others Chose&rdquo; display. These are not linked to your account.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Public Profiles
            </h2>
            <p>
              Your profile is private by default. If you opt in to a public profile in
              Settings, your display name, tagline, profile photo, and smash / pass history
              become visible to anyone with the link. You can turn this off at any time and
              your profile will immediately become private again.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              How We Use Your Data
            </h2>
            <p>
              Your data is used solely to provide the game experience: saving your progress,
              showing your history, and enabling cross-device sync. We do not sell your data,
              share it with third parties, or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Data Deletion
            </h2>
            <p>
              You can erase all your smash / pass history at any time from the Settings tab
              in your profile. This permanently removes your vote history from the database.
              To request full account deletion, contact us via GitHub.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Third-Party Services
            </h2>
            <p>
              The site uses the following third-party services, each with their own privacy
              policies:
            </p>
            <ul className="space-y-1.5 pl-4 list-disc marker:text-gold/30 mt-2">
              <li>
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ranni/70 hover:text-ranni underline underline-offset-2 transition-colors"
                >
                  Google (Authentication)
                </a>
              </li>
              <li>
                <a
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ranni/70 hover:text-ranni underline underline-offset-2 transition-colors"
                >
                  Firebase by Google (Database &amp; Hosting)
                </a>
              </li>
              <li>
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ranni/70 hover:text-ranni underline underline-offset-2 transition-colors"
                >
                  Vercel (Hosting &amp; Edge Functions)
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">
              Cookies &amp; Tracking
            </h2>
            <p>
              This site does not use advertising cookies, tracking pixels, or analytics
              beyond what Firebase and Vercel collect for infrastructure purposes (e.g. error
              reporting, request logs). No third-party ad networks are used.
            </p>
          </section>

          <section>
            <h2 className="text-souls text-base font-bold text-gold/80 mb-3">Changes</h2>
            <p>
              If this policy changes materially, the &ldquo;Last updated&rdquo; date above
              will be updated. Continued use of the site after changes constitutes acceptance
              of the revised policy.
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-12 pt-6 border-t border-dark-700/30 flex flex-wrap gap-4 text-xs text-ash/35">
          <Link href="/" className="hover:text-gold transition-colors">← Back to game</Link>
          <Link href="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
