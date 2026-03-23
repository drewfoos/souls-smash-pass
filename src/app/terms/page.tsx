import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Elden Smash or Pass.",
};

const sections = [
  {
    title: "About This Site",
    content: (
      <p>
        Elden Smash or Pass is an unofficial fan-made project created for entertainment
        purposes. It is not affiliated with, endorsed by, or sponsored by FromSoftware,
        Bandai Namco Entertainment, or any other rights holder. All Elden Ring characters,
        names, and assets are the intellectual property of their respective owners.
      </p>
    ),
  },
  {
    title: "Use of the Service",
    content: (
      <>
        <p className="mb-3">By using this site you agree to:</p>
        <ul className="space-y-1.5 pl-4 list-disc marker:text-gold/30">
          <li>Use the site for personal, non-commercial entertainment only.</li>
          <li>Not attempt to reverse-engineer, scrape, or abuse the site&apos;s APIs or infrastructure.</li>
          <li>Not submit votes or manipulate leaderboard data through automated means.</li>
          <li>Not use the site in any way that violates applicable laws.</li>
        </ul>
      </>
    ),
  },
  {
    title: "User Accounts",
    content: (
      <p>
        Accounts are created via Google OAuth. You are responsible for maintaining
        the security of your Google account. We reserve the right to suspend or
        terminate accounts that abuse the service.
      </p>
    ),
  },
  {
    title: "Public Profiles",
    content: (
      <p>
        If you enable a public profile, your display name, tagline, and vote history
        become publicly visible. You are responsible for the content of your profile.
        Do not include personal information you do not wish to share publicly.
      </p>
    ),
  },
  {
    title: "Intellectual Property",
    content: (
      <>
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
      </>
    ),
  },
  {
    title: "Disclaimer of Warranties",
    content: (
      <p>
        This site is provided &ldquo;as is&rdquo; without any warranty of any kind. We make
        no guarantees regarding uptime, data retention, or continued availability of
        the service. Vote data and progress may be lost if the service is discontinued.
      </p>
    ),
  },
  {
    title: "Limitation of Liability",
    content: (
      <p>
        To the fullest extent permitted by law, the site owner shall not be liable
        for any damages arising from your use of or inability to use the site.
      </p>
    ),
  },
  {
    title: "Changes",
    content: (
      <p>
        These terms may be updated at any time. The &ldquo;Last updated&rdquo; date above
        reflects the most recent revision. Continued use of the site after changes
        constitutes acceptance of the revised terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <PageHeader current="/terms" />

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-souls font-black text-gold text-3xl md:text-4xl mb-3 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)]">
            Terms of Service
          </h1>
          <p className="text-xs text-ash/40">Last updated: March 2026</p>
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
    </div>
  );
}
