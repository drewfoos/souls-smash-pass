import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eldensmash.com";

export const metadata: Metadata = {
  title: "FAQ | Elden Ring Smash or Pass",
  description:
    "Frequently asked questions about Elden Smash, the Elden Ring Smash or Pass game. How to play, save progress, filter characters, and more.",
  keywords: [
    "elden ring smash or pass",
    "smash or pass elden ring",
    "elden ring smash or pass faq",
  ],
  openGraph: {
    title: "FAQ | Elden Ring Smash or Pass",
    description: "Frequently asked questions about Elden Smash.",
    url: `${SITE_URL}/faq`,
  },
  twitter: {
    card: "summary",
    title: "FAQ | Elden Ring Smash or Pass",
    description: "Frequently asked questions about Elden Smash.",
  },
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
};

const faqs = [
  {
    question: "What is Elden Smash?",
    answer:
      "Elden Smash is a free Smash or Pass game featuring over 500 characters from Elden Ring. Swipe right to smash or left to pass on bosses, NPCs, merchants, summons, and creatures from the Lands Between.",
  },
  {
    question: "How do I play Elden Ring Smash or Pass?",
    answer:
      "Drag the card to the right (or tap the heart button) to smash, and drag left (or tap the X button) to pass. You can also use arrow keys on desktop. Work through the entire deck or filter by character type.",
  },
  {
    question: "Is Elden Smash free?",
    answer:
      "Yes, Elden Smash is completely free to play. No account is required to start playing, but signing in with Google lets you save progress across devices.",
  },
  {
    question: "How many characters are in Elden Smash?",
    answer:
      "There are over 500 characters from Elden Ring including bosses like Malenia and Radahn, NPCs like Ranni and Melina, merchants, spirit summons, and creatures from the Lands Between.",
  },
  {
    question: "Can I save my progress?",
    answer:
      "Yes. Your progress is automatically saved in your browser. If you sign in with Google, your votes sync across all your devices and you appear on the global leaderboard.",
  },
  {
    question: "Why does the character order change?",
    answer:
      "The deck shuffles on a weekly rotation every Monday (UTC). All players see the same order during a given week. Your in-progress run keeps its original order until you finish or reset.",
  },
  {
    question: "Can I filter characters by type?",
    answer:
      "Yes. You can filter by bosses, NPCs, merchants, summons, main characters, and creatures. Use the filter button in the game to focus on the category you want.",
  },
  {
    question: "Is Elden Smash affiliated with FromSoftware?",
    answer:
      "No. Elden Smash is an independent fan project and is not affiliated with, endorsed by, or connected to FromSoftware or Bandai Namco. Elden Ring and all related characters are trademarks of their respective owners.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <div className="min-h-dvh py-8 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="max-w-2xl mx-auto">
        <PageHeader current="/faq" />

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-souls font-black text-gold text-3xl md:text-4xl mb-3 drop-shadow-[0_0_30px_rgba(255,215,0,0.15)]">
            Frequently Asked Questions
          </h1>
          <p className="text-ash/60">
            Elden Ring Smash or Pass — common questions answered
          </p>
        </div>

        {/* FAQ Accordions */}
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group card-dark overflow-hidden transition-colors hover:border-gold/15"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 select-none list-none [&::-webkit-details-marker]:hidden">
                <h2 className="text-souls font-bold text-gold/80 text-sm md:text-base pr-4">
                  {faq.question}
                </h2>
                <span className="text-gold/30 text-lg transition-transform duration-200 group-open:rotate-45 shrink-0">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5 pt-0">
                <div className="border-t border-ash/8 pt-4">
                  <p className="text-sm text-ash/65 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
          >
            <span className="relative z-10">Start Playing</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
