import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Elden Smash collects and how it is used.",
};

const sections = [
  {
    title: "Overview",
    content: (
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
    ),
  },
  {
    title: "Information We Collect",
    content: (
      <>
        <h3 className="text-sm font-semibold text-priscilla/60 mb-2">
          If you play without signing in
        </h3>
        <p className="mb-4">
          Your game progress (the order of characters and your smash / pass choices) is
          saved only in your browser&apos;s{" "}
          <code className="text-ranni/70 bg-dark-700/50 px-1.5 py-0.5 rounded text-xs">localStorage</code>.
          This data never leaves your device and is not sent to any server.
        </p>
        <h3 className="text-sm font-semibold text-priscilla/60 mb-2">
          If you sign in with Google
        </h3>
        <p className="mb-3">
          Signing in uses Google OAuth. We receive the following information from Google and
          store it in Firebase Realtime Database:
        </p>
        <ul className="space-y-1.5 pl-4 list-disc marker:text-gold/30">
          <li>Your Google display name</li>
          <li>Your Google profile photo URL</li>
          <li>Your Google account email address (used only to identify your account)</li>
          <li>Your smash / pass choices per character, for cross-device sync</li>
          <li>Your current position in the deck</li>
          <li>A timestamp of when you last played</li>
          <li>Any display name or tagline you manually set in Settings</li>
        </ul>
      </>
    ),
  },
  {
    title: "Vote Counts",
    content: (
      <p>
        Aggregate vote counts (total smashes and passes per character, with no personal
        identifiers) are stored in Firebase and used to power the live leaderboard and
        the &ldquo;What Others Chose&rdquo; display. These are not linked to your account.
      </p>
    ),
  },
  {
    title: "Public Profiles",
    content: (
      <p>
        Your profile is private by default. If you opt in to a public profile in
        Settings, your display name, tagline, profile photo, and smash / pass history
        become visible to anyone with the link. You can turn this off at any time and
        your profile will immediately become private again.
      </p>
    ),
  },
  {
    title: "How We Use Your Data",
    content: (
      <p>
        Your data is used solely to provide the game experience: saving your progress,
        showing your history, and enabling cross-device sync. We do not sell your data,
        share it with third parties, or use it for advertising.
      </p>
    ),
  },
  {
    title: "Data Deletion",
    content: (
      <p>
        You can erase all your smash / pass history at any time from the Settings tab
        in your profile. This permanently removes your vote history from the database.
        To request full account deletion, contact us via GitHub.
      </p>
    ),
  },
  {
    title: "Third-Party Services",
    content: (
      <>
        <p className="mb-3">
          The site uses the following third-party services, each with their own privacy policies:
        </p>
        <ul className="space-y-1.5 pl-4 list-disc marker:text-gold/30">
          <li>
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
              className="text-ranni/70 hover:text-ranni underline underline-offset-2 transition-colors">
              Google (Authentication)
            </a>
          </li>
          <li>
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer"
              className="text-ranni/70 hover:text-ranni underline underline-offset-2 transition-colors">
              Firebase by Google (Database &amp; Hosting)
            </a>
          </li>
          <li>
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer"
              className="text-ranni/70 hover:text-ranni underline underline-offset-2 transition-colors">
              Vercel (Hosting &amp; Edge Functions)
            </a>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Cookies & Tracking",
    content: (
      <p>
        This site does not use advertising cookies, tracking pixels, or analytics
        beyond what Firebase and Vercel collect for infrastructure purposes (e.g. error
        reporting, request logs). No third-party ad networks are used.
      </p>
    ),
  },
  {
    title: "Changes",
    content: (
      <p>
        If this policy changes materially, the &ldquo;Last updated&rdquo; date above
        will be updated. Continued use of the site after changes constitutes acceptance
        of the revised policy.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <PageHeader current="/privacy" />

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-souls font-black text-gold text-3xl md:text-4xl mb-3 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)]">
            Privacy Policy
          </h1>
          <p className="text-xs text-ash/60">Last updated: March 2026</p>
        </div>

        {/* Accordion sections */}
        <div className="space-y-2">
          {sections.map((section, i) => (
            <details
              key={i}
              className="group card-dark overflow-hidden transition-colors hover:border-gold/15"
              {...(i === 0 ? { open: true } : {})}
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 select-none list-none [&::-webkit-details-marker]:hidden">
                <h2 className="text-souls font-bold text-gold/80 text-sm md:text-base pr-4">
                  {section.title}
                </h2>
                <span className="text-gold/30 text-lg transition-transform duration-200 group-open:rotate-45 shrink-0">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 pt-0">
                <div className="border-t border-ash/8 pt-4 text-sm text-ash/65 leading-relaxed">
                  {section.content}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
