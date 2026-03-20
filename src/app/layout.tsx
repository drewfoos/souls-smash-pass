import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Elden Smash — Smash or Pass Elden Ring",
  description:
    "The ultimate Smash or Pass game featuring 250+ characters from Elden Ring. Swipe your way through the Lands Between.",
  openGraph: {
    title: "Elden Smash — Smash or Pass",
    description: "Would you smash Malenia? What about Ranni? Touch grace and find out.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
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
