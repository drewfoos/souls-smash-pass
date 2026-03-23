# Elden Smash

> Be honest. You've thought about it.
>
> Would you smash Ranni the Witch? What about Malenia, Blade of Miquella? The Dung Eater?
>
> **529 characters. No skipping. No mercy.**

![Next.js](https://img.shields.io/badge/Next.js_15-black?logo=next.js)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-DD2C00?logo=firebase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)

---

## What Is This

Smash or pass every character in Elden Ring. Swipe through the full roster — from fan favorites like Ranni and Malenia to the Runebears and Revenants nobody asked about — and see how the rest of the world voted in real time.

No account needed. Just start swiping.

## The Roster

**529 characters** pulled from Elden Ring and Shadow of the Erdtree:

| Type | Count | You'll See... |
|------|------:|---------------|
| Creatures | 163 | Runebears, Revenants, Crucible Knights, Land Octopi |
| Bosses | 157 | Malenia, Radahn, Messmer, Godrick, Mohg |
| NPCs | 127 | Ranni, Alexander, Millicent, Blaidd, Patches |
| Summons | 82 | Mimic Tear, Dung Eater, Jellyfish, Lhutel |

Yes, the Grafted Scion is in here. Good luck.

## Features

**Gameplay**
- Tinder-style swipe cards or keyboard controls to smash/pass
- Filter by type — play just bosses, just NPCs, whatever — without losing progress
- Browse your full voting history while keeping your place in the deck
- Animated card stack with swipe gestures and directional visual feedback

**Live Community Votes**
- Real-time "Others chose" bar on every character — see if you're with the majority or unhinged
- Global leaderboard of the most smashed and most passed characters
- Shareable public profiles — show the world your taste (or lack of it)

**Play Your Way**
- No sign-in required — full anonymous voting with session cookies
- Sign in with Google to sync votes across devices
- Anonymous votes merge into your account when you sign in later

## Controls

| Input | Voting | Browsing History |
|-------|--------|-----------------|
| Swipe right / `->` | Smash | Next character |
| Swipe left / `<-` | Pass | Previous character |
| `Up` | Jump forward | Jump forward |
| `Down` | Jump back | Jump back |
| Tap buttons | Smash / Pass | — |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager & runtime)
- A Firebase project with Realtime Database + Authentication (Google provider)

### Setup

```bash
bun install
cp .env.example .env.local   # Fill in your Firebase keys
bun dev                       # Starts on localhost:3000
```

### Environment Variables

See [`.env.example`](.env.example) for the full list. The key ones:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client SDK config (public) |
| `FIREBASE_ADMIN_*` | Firebase Admin SDK credentials (secret) |
| `APP_URL` | Production origin for CORS validation |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO (sitemap, OG images) |
| `ANON_SESSION_SECRET` | Signs anonymous voting session cookies |
| `ADMIN_EMAIL` | Email with access to the `/admin` dashboard |

### Scripts

```bash
bun dev                  # Dev server with Turbopack
bun run build            # Production build
bun run lint             # ESLint
bun test                 # Run tests
bun run download-images  # Scrape character art from wiki sources
bun run optimize-images  # Convert images to optimized WebP
bun run reset-user       # Reset a user's voting history
```

## Character Images

Works without any images — each character gets a unique stylized fallback card with gradient + rune patterns.

To add real artwork:

- **Automatic:** `bun run download-images` scrapes Fextralife and Fandom wikis, then `bun run optimize-images` converts to WebP.
- **Manual:** Drop images into `public/characters/` as `{character_id}.webp`. IDs are in [`src/data/characters.ts`](src/data/characters.ts).

## Deploy

```bash
vercel deploy --prod
```

Vercel auto-detects Next.js + Bun. Set the environment variables in your Vercel project settings before deploying.

## Tech Stack

- **Framework** — Next.js 15 (App Router, React 19)
- **Animations** — Framer Motion (swipe gestures, card transitions)
- **Styling** — Tailwind CSS v4 (custom dark gothic theme)
- **Database** — Firebase Realtime Database
- **Auth** — Firebase Authentication (Google)
- **Icons** — Lucide React
- **Images** — Sharp (optimization pipeline)
- **Deployment** — Vercel

## Project Structure

```
src/
├── app/                       # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── vote/              # Vote recording endpoint
│   │   ├── leaderboard/       # Global leaderboard endpoint
│   │   └── admin/             # Admin dashboard endpoints
│   ├── users/[uid]/           # Public profile pages (SSR)
│   ├── admin/                 # Admin dashboard
│   ├── privacy/               # Privacy policy
│   ├── terms/                 # Terms of service
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing / game page
│   ├── not-found.tsx          # 404 page
│   ├── globals.css            # Global styles
│   ├── manifest.ts            # PWA manifest
│   ├── sitemap.ts             # Dynamic sitemap
│   ├── robots.ts              # Robots.txt generation
│   └── opengraph-image.tsx    # Dynamic OG image
├── components/
│   ├── CardStack.tsx          # Animated 3-card swipe stack
│   ├── SwipeCard.tsx          # Individual draggable card
│   ├── GameScreen.tsx         # Main gameplay layout
│   ├── LandingScreen.tsx      # Landing / start screen
│   ├── ResultsScreen.tsx      # End-of-run results
│   ├── CelebrationScreen.tsx  # Celebration animations
│   ├── Leaderboard.tsx        # Real-time leaderboard modal
│   ├── UserProfile.tsx        # Profile & settings modal
│   ├── StatsPanel.tsx         # Voting statistics panel
│   ├── FilterDropdown.tsx     # Character type filter
│   ├── FilterModal.tsx        # Full-screen filter modal
│   ├── ActionButtons.tsx      # Smash / Pass buttons
│   ├── CharacterImage.tsx     # Character image with fallback
│   ├── LazyCharCard.tsx       # Lazy-loaded character card
│   ├── ShareButtons.tsx       # Social sharing buttons
│   ├── SignInButton.tsx       # Auth sign-in button
│   ├── SignInPrompt.tsx       # Sign-in prompt overlay
│   ├── OthersChose.tsx        # "Others chose…" display
│   ├── MobileMenu.tsx         # Mobile navigation menu
│   ├── ConsoleMessage.tsx     # Dev console easter egg
│   └── Providers.tsx          # Context providers wrapper
├── context/
│   ├── GameContext.tsx        # Game state, voting, navigation, filters
│   └── AuthContext.tsx        # Firebase auth + anonymous session
├── data/
│   └── characters.ts         # 529 character definitions
└── lib/                       # Firebase clients, rate limiting, utilities
    ├── firebase.ts            # Firebase client init
    ├── firebase-admin.ts      # Firebase Admin SDK
    ├── firebase-db.ts         # Database helpers
    ├── firebase-realtime.ts   # Realtime Database helpers
    ├── firebase-user.ts       # User management
    ├── firebase-key.ts        # Key utilities
    ├── admin-auth.ts          # Admin authentication
    ├── anon-session.ts        # Anonymous session handling
    ├── rate-limit.ts          # API rate limiting
    ├── vote-queue.ts          # Vote batching queue
    ├── idempotency.ts         # Idempotent request handling
    ├── idempotency-key.ts     # Idempotency key generation
    ├── store.ts               # Local storage state
    ├── get-client-ip.ts       # Client IP extraction
    ├── validate-url.ts        # URL validation
    └── utils.ts               # Shared utilities
scripts/
├── download-images.ts         # Wiki image scraper
├── download_images.py         # Python image scraper (alt)
├── optimize-images.ts         # JPG → WebP converter
├── reset-user.ts              # Firebase user reset tool
├── cleanup-images.sh          # Image cleanup (Unix)
└── cleanup-images.ps1         # Image cleanup (Windows)
```

## License

MIT

---

Built by [@drewfoos](https://github.com/drewfoos)
