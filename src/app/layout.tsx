import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

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
    default: "Elden Smash — Smash or Pass Elden Ring",
    template: "%s — Elden Smash",
  },
  description:
    "The ultimate Smash or Pass game featuring 500+ characters from Elden Ring. Would you smash Malenia? What about Ranni? Touch grace and find out.",
  keywords: [
    "Elden Ring",
    "smash or pass",
    "Elden Ring characters",
    "Ranni",
    "Malenia",
    "Lands Between",
    "FromSoftware",
    "souls game",
  ],
  openGraph: {
    title: "Elden Smash — Smash or Pass Elden Ring",
    description: "Would you smash Malenia? What about Ranni? 500+ Elden Ring characters. Touch grace and find out.",
    type: "website",
    url: SITE_URL,
    siteName: "Elden Smash",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Elden Smash — Smash or Pass Elden Ring" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elden Smash — Smash or Pass Elden Ring",
    description: "Would you smash Malenia? What about Ranni? 500+ Elden Ring characters. Touch grace and find out.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* Subtle animated fog */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 animate-fog bg-gradient-to-br from-gold/[0.015] via-transparent to-crimson-bright/[0.01]" />
          <div
            className="absolute inset-0 animate-fog bg-gradient-to-tl from-moonlight/[0.01] via-transparent to-ember/[0.008]"
            style={{ animationDelay: "-10s" }}
          />
        </div>
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
