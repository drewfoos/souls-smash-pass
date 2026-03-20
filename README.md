# Smash or Pass — Soulsborne Edition

Rate 200+ characters from FromSoftware's legendary Soulsborne games. Swipe right to smash, left to pass.

## Games Included
- Elden Ring (+ DLC)

Includes bosses, NPCs, main characters, AND regular enemies (Silver Knights, Runebears, Winter Lanterns, etc.)

## Getting Started

```bash
# Install dependencies (using bun)
bun install

# (Optional) Download character images from wiki sources
bun run download-images

# Start dev server
bun dev

# Build for production
bun run build
```

## Character Images

The game works out of the box with stylized fallback cards (unique gradient + rune patterns for each character). To add actual character art:

**Automatic:** Run `bun run download-images` to scrape images from Fextralife and Fandom wikis. Not all images will be found — missing ones keep the stylized cards.

**Manual:** Drop images into `public/characters/` named `{character_id}.jpg` (e.g., `ds1_solaire.jpg`). Character IDs are in `src/data/characters.ts`.

The image priority is: local file → remote URL → stylized fallback card.

## Deploy to Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Vercel auto-detects Next.js + bun from `vercel.json`
4. Deploy!

For the global leaderboard to persist across deploys, set up Vercel KV:
- Go to your Vercel project → Storage → Create KV Database
- Replace `src/lib/store.ts` with a Vercel KV implementation

## Tech Stack
- Next.js 15 (App Router)
- Framer Motion (swipe gestures)
- Tailwind CSS v4 (dark gothic theme)
- TypeScript

## Controls
- **Swipe right** or **→ arrow** = Smash
- **Swipe left** or **← arrow** = Pass
- **Buttons** = Fallback for Smash/Pass
