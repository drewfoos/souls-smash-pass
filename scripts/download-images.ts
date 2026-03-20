/**
 * Download character images from multiple wiki sources.
 *
 * Usage:
 *   bun run scripts/download-images.ts              # All characters
 *   bun run scripts/download-images.ts --game ER    # Only Elden Ring
 *   bun run scripts/download-images.ts --retry       # Retry previously failed
 *
 * Sources tried in order:
 *   1. Elden Ring Fan API (eldenring.fanapis.com) — for ER characters
 *   2. Fandom wiki API (pageimages) — all games
 *   3. Fandom wiki API (alternate name forms)
 *   4. Fextralife page scrape — all games
 *
 * Characters that already have a downloaded image are skipped.
 * If all sources fail, the character keeps the stylized fallback card.
 */

import { mkdir, stat, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { characters, type Character } from "../src/data/characters";

const OUT_DIR = join(import.meta.dir, "..", "public", "characters");
const FAILED_LOG = join(import.meta.dir, "failed_images.json");
const CONCURRENCY = 4;
const TIMEOUT_MS = 12_000;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const gameFilter = args.includes("--game")
  ? args[args.indexOf("--game") + 1]
  : null;
const retryMode = args.includes("--retry");
const forceMode = args.includes("--force");

// ---------------------------------------------------------------------------
// Wiki URL helpers
// ---------------------------------------------------------------------------

const GAME_FANDOM: Record<string, string> = {
  DeS: "https://demonssouls.fandom.com",
  DS1: "https://darksouls.fandom.com",
  DS2: "https://darksouls.fandom.com",
  DS3: "https://darksouls.fandom.com",
  BB: "https://bloodborne.fandom.com",
  Sekiro: "https://sekiroshadowsdietwice.fandom.com",
  ER: "https://eldenring.fandom.com",
};

const GAME_FEXTRA: Record<string, string> = {
  DeS: "https://demonssouls.wiki.fextralife.com",
  DS1: "https://darksouls.wiki.fextralife.com",
  DS2: "https://darksouls2.wiki.fextralife.com",
  DS3: "https://darksouls3.wiki.fextralife.com",
  BB: "https://bloodborne.wiki.fextralife.com",
  Sekiro: "https://sekiroshadowsdietwice.wiki.fextralife.com",
  ER: "https://eldenring.wiki.fextralife.com",
};

function slugify(name: string): string {
  return name
    .replace(/['']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "+")
    .replace(/^\++|\++$/g, "");
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  ms = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SoulsSmashPass/1.0",
        Accept: "text/html,image/*,*/*",
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(url, 15_000);
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return false;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return false; // too small

    await Bun.write(dest, buf);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Source 1: Elden Ring Fan API (eldenring.fanapis.com)
// Has endpoints: /bosses, /creatures, /npcs, /spirits
// ---------------------------------------------------------------------------

let erApiCache: Map<string, string> | null = null;

async function buildErApiCache(): Promise<Map<string, string>> {
  if (erApiCache) return erApiCache;
  erApiCache = new Map();

  const endpoints = ["bosses", "creatures", "npcs", "spirits"];

  for (const endpoint of endpoints) {
    try {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const url = `https://eldenring.fanapis.com/api/v1/${endpoint}?limit=100&page=${page}`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) break;

        const data = await res.json();
        const items = data?.data || [];

        for (const item of items) {
          if (item.name && item.image) {
            // Normalize name for matching
            const key = item.name.toLowerCase().trim();
            erApiCache.set(key, item.image);
          }
        }

        hasMore = items.length === 100;
        page++;
      }
    } catch {
      // API might not have this endpoint, continue
    }
  }

  console.log(`  📦 ER Fan API cache: ${erApiCache.size} entries`);
  return erApiCache;
}

async function tryErFanApi(char: Character): Promise<string | null> {
  if (char.game !== "ER") return null;

  const cache = await buildErApiCache();
  const nameKey = char.name.toLowerCase().trim();

  // Direct match
  if (cache.has(nameKey)) return cache.get(nameKey)!;

  // Try without location brackets
  const noLocation = nameKey.replace(/\s*\[.*?\]\s*/g, "").trim();
  if (cache.has(noLocation)) return cache.get(noLocation)!;

  // Try without parentheses
  const noParens = nameKey.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (cache.has(noParens)) return cache.get(noParens)!;

  // Try first part before comma
  if (nameKey.includes(",")) {
    const firstPart = nameKey.split(",")[0].trim();
    if (cache.has(firstPart)) return cache.get(firstPart)!;
  }

  // Try partial match (name contains or is contained)
  for (const [key, url] of cache) {
    if (key.length > 5 && (nameKey.includes(key) || key.includes(nameKey))) {
      return url;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Source 2: Fandom wiki API (pageimages)
// ---------------------------------------------------------------------------

async function tryFandomApi(
  char: Character,
  nameOverride?: string
): Promise<string | null> {
  try {
    const base = GAME_FANDOM[char.game];
    if (!base) return null;

    const title = nameOverride || char.name;
    const query = encodeURIComponent(title);
    const apiUrl = `${base}/api.php?action=query&titles=${query}&prop=pageimages&format=json&pithumbsize=800`;

    const res = await fetchWithTimeout(apiUrl);
    if (!res.ok) return null;
    const data = await res.json();

    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0] as any;
    if (page?.missing !== undefined) return null;

    const source = page?.thumbnail?.source;
    if (source) {
      // Bump thumbnail size
      return source.replace(
        /\/scale-to-width-down\/\d+/,
        "/scale-to-width-down/800"
      );
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 3: Fandom with alternate name forms
// ---------------------------------------------------------------------------

function getAlternateNames(name: string): string[] {
  const alts: string[] = [];

  // Remove [location]
  const noLoc = name.replace(/\s*\[.*?\]\s*/g, "").trim();
  if (noLoc !== name) alts.push(noLoc);

  // Remove (variation)
  const noParens = name.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (noParens !== name && noParens !== noLoc) alts.push(noParens);

  // First part before comma
  if (name.includes(",")) {
    alts.push(name.split(",")[0].trim());
  }

  // Handle "X / Y" dual names — try first half
  if (name.includes(" / ")) {
    alts.push(name.split(" / ")[0].trim());
  }

  // Handle "X & Y" — try first
  if (name.includes(" & ")) {
    alts.push(name.split(" & ")[0].trim());
  }

  // Remove "the" prefix
  if (name.toLowerCase().startsWith("the ")) {
    alts.push(name.slice(4));
  }

  return [...new Set(alts)];
}

async function tryFandomAlternates(char: Character): Promise<string | null> {
  const alts = getAlternateNames(char.name);
  for (const alt of alts) {
    const url = await tryFandomApi(char, alt);
    if (url) return url;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source 4: Fextralife page scrape
// ---------------------------------------------------------------------------

async function tryFextraImage(char: Character): Promise<string | null> {
  try {
    const base = GAME_FEXTRA[char.game];
    if (!base) return null;

    // Try the character name and alternates
    const names = [char.name, ...getAlternateNames(char.name)];

    for (const name of names) {
      const slug = slugify(name);
      const pageUrl = `${base}/${slug}`;

      try {
        const res = await fetchWithTimeout(pageUrl);
        if (!res.ok) continue;
        const html = await res.text();

        const imgMatches = html.match(
          /https?:\/\/[^"'\s]*fextralife\.com\/file\/[^"'\s]+\.(jpg|jpeg|png|webp)/gi
        );
        if (!imgMatches || imgMatches.length === 0) continue;

        // Filter out icons and logos
        for (const imgUrl of imgMatches) {
          const lower = imgUrl.toLowerCase();
          if (
            !lower.includes("icon") &&
            !lower.includes("logo") &&
            !lower.includes("banner")
          ) {
            return imgUrl;
          }
        }
        return imgMatches[0];
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Process a single character
// ---------------------------------------------------------------------------

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

type ProcessResult = {
  id: string;
  name: string;
  success: boolean;
  source: string;
};

async function processCharacter(char: Character): Promise<ProcessResult> {
  const dest = join(OUT_DIR, `${char.id}.jpg`);

  if (!forceMode && (await fileExists(dest))) {
    return { id: char.id, name: char.name, success: true, source: "cached" };
  }

  // Try each source in order
  const strategies: [string, () => Promise<string | null>][] = [
    ["er-fan-api", () => tryErFanApi(char)],
    ["fandom-api", () => tryFandomApi(char)],
    ["fandom-alt", () => tryFandomAlternates(char)],
    ["fextralife", () => tryFextraImage(char)],
  ];

  for (const [sourceName, trySource] of strategies) {
    const imageUrl = await trySource();
    if (imageUrl) {
      const ok = await downloadImage(imageUrl, dest);
      if (ok) {
        return {
          id: char.id,
          name: char.name,
          success: true,
          source: sourceName,
        };
      }
    }
  }

  return { id: char.id, name: char.name, success: false, source: "not-found" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let charList = [...characters];

  // Filter by game
  if (gameFilter) {
    charList = charList.filter((c) => c.game === gameFilter);
    console.log(`\nFiltered to ${charList.length} characters for game: ${gameFilter}`);
  }

  // Retry mode: only process previously failed
  if (retryMode) {
    try {
      const failedIds: string[] = JSON.parse(
        await readFile(FAILED_LOG, "utf-8")
      );
      const failedSet = new Set(failedIds);
      charList = charList.filter((c) => failedSet.has(c.id));
      console.log(`\nRetrying ${charList.length} previously failed characters`);
    } catch {
      console.log("\nNo failed_images.json found, processing all");
    }
  }

  console.log(
    `\n🔥 Downloading images for ${charList.length} characters...\n`
  );

  // Pre-build ER API cache if we have ER characters
  if (charList.some((c) => c.game === "ER")) {
    await buildErApiCache();
  }

  let success = 0;
  let cached = 0;
  let fail = 0;
  const failedIds: string[] = [];

  // Process in batches
  for (let i = 0; i < charList.length; i += CONCURRENCY) {
    const batch = charList.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processCharacter));

    for (const result of results) {
      if (result.success) {
        if (result.source === "cached") {
          cached++;
        } else {
          success++;
          console.log(
            `  [${i + results.indexOf(result) + 1}/${charList.length}] ✓ ${result.name} (${result.source})`
          );
        }
      } else {
        fail++;
        failedIds.push(result.id);
        console.log(
          `  [${i + results.indexOf(result) + 1}/${charList.length}] ✗ ${result.name}`
        );
      }
    }

    // Small delay between batches to be polite
    if (i + CONCURRENCY < charList.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Save failed list
  if (failedIds.length > 0) {
    await writeFile(FAILED_LOG, JSON.stringify(failedIds, null, 2));
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results:`);
  console.log(`  Already had: ${cached}`);
  console.log(`  Downloaded:  ${success}`);
  console.log(`  Failed:      ${fail}`);
  console.log(`  Total:       ${charList.length}`);
  console.log(`${"=".repeat(50)}`);

  if (fail > 0) {
    console.log(`\nFailed characters saved to scripts/failed_images.json`);
    console.log(`Run with --retry to try again\n`);
  }

  console.log(
    `\nMissing images will use stylized fallback cards.` +
      `\nYou can manually add images to public/characters/{character_id}.jpg\n`
  );
}

main().catch(console.error);
