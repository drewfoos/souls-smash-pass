import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/Providers";
import { ConsoleMessage } from "@/components/ConsoleMessage";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-cinzel-loaded",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body-loaded",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eldensmash.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Elden Ring Smash or Pass | Vote on 500+ Characters | Elden Smash",
    template: "%s | Elden Smash",
  },
  description:
    "Play Elden Ring Smash or Pass and vote on 500+ characters including bosses, NPCs, enemies, summons, and wildlife. See community results from thousands of votes.",
  keywords: [
    "elden ring smash or pass",
    "smash or pass elden ring",
    "elden ring characters",
    "elden ring voting game",
    "malenia smash or pass",
    "ranni smash or pass",
    "elden ring bosses",
    "fromsoftware characters",
  ],
  openGraph: {
    title: "Elden Ring Smash or Pass | Vote on 500+ Characters",
    description:
      "Vote on 500+ Elden Ring characters and see community Smash or Pass results.",
    type: "website",
    url: SITE_URL,
    siteName: "Elden Smash",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Elden Ring Smash or Pass | Elden Smash" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elden Ring Smash or Pass | Vote on 500+ Characters",
    description:
      "Vote on 500+ Elden Ring characters and see community Smash or Pass results.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Elden Smash",
  url: SITE_URL,
  description:
    "Play Elden Ring Smash or Pass and vote on 500+ characters including bosses, NPCs, enemies, summons, and wildlife. See community results from thousands of votes.",
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Person",
    name: "drewfoos",
    url: "https://github.com/drewfoos",
  },
  inLanguage: "en-US",
  keywords: "elden ring smash or pass, smash or pass elden ring, elden ring characters",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {/* Subtle animated fog */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 animate-fog bg-gradient-to-br from-gold/[0.015] via-transparent to-crimson-bright/[0.01]" />
          <div
            className="absolute inset-0 animate-fog bg-gradient-to-tl from-moonlight/[0.01] via-transparent to-ember/[0.008]"
            style={{ animationDelay: "-10s" }}
          />
        </div>
        <div className="relative z-10">
          <ConsoleMessage />
          <Providers>{children}</Providers>
          <Analytics />
        </div>
      </body>
    </html>
  );
}
