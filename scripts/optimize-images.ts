/**
 * Convert downloaded character images to WebP for faster serving.
 *
 * Usage:
 *   bun run optimize-images                     # All JPGs in public/characters
 *   bun run optimize-images --force             # Re-convert even if .webp already exists
 *   bun run optimize-images --game ER           # Only files matching er_* prefix
 *
 * Output: public/characters/{id}.webp alongside the original .jpg
 * The original .jpg files are preserved as browser fallbacks.
 *
 * Settings:
 *   Max dimension: 600px (width or height, preserving aspect ratio)
 *   Quality:       75  (transparent at card sizes; saves ~30% vs q82)
 *   Effort:        6   (0–6; max compression, slower encode)
 */

import sharp from "sharp";
import { readdir, stat, writeFile } from "fs/promises";
import { join, basename, extname } from "path";

const CHARACTERS_DIR = join(import.meta.dir, "..", "public", "characters");
const MAX_DIM = 600;
const QUALITY = 75;
const EFFORT = 6;
const CONCURRENCY = 6;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const forceMode = args.includes("--force");
const gameFilter = args.includes("--game")
  ? args[args.indexOf("--game") + 1].toLowerCase()
  : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function getFileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / (1024 * 1024)).toFixed(2)}MB`;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

type Result = { id: string; savedBytes: number; skipped: boolean; failed?: string };

async function convertOne(jpgPath: string): Promise<Result> {
  const id = basename(jpgPath, ".jpg");
  const webpPath = join(CHARACTERS_DIR, `${id}.webp`);

  if (!forceMode && (await fileExists(webpPath))) {
    return { id, savedBytes: 0, skipped: true };
  }

  const originalSize = await getFileSize(jpgPath);

  try {
    await sharp(jpgPath)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: EFFORT })
      .toFile(webpPath);

    const newSize = await getFileSize(webpPath);
    return { id, savedBytes: originalSize - newSize, skipped: false };
  } catch (err) {
    return { id, savedBytes: 0, skipped: false, failed: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const allFiles = await readdir(CHARACTERS_DIR);
let jpgFiles = allFiles
  .filter((f) => extname(f) === ".jpg")
  .map((f) => join(CHARACTERS_DIR, f));

if (gameFilter) {
  jpgFiles = jpgFiles.filter((p) =>
    basename(p).toLowerCase().startsWith(`${gameFilter}_`)
  );
}

if (jpgFiles.length === 0) {
  console.log("No JPG files found to convert.");
  process.exit(0);
}

console.log(
  `Converting ${jpgFiles.length} images → WebP (max ${MAX_DIM}px, q${QUALITY})${forceMode ? " [force]" : ""}${gameFilter ? ` [game=${gameFilter}]` : ""}\n`
);

// Process in batches
let done = 0;
let totalSaved = 0;
let skipped = 0;
const failed: string[] = [];

for (let i = 0; i < jpgFiles.length; i += CONCURRENCY) {
  const batch = jpgFiles.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(convertOne));

  for (const r of results) {
    done++;
    if (r.failed) {
      failed.push(`${r.id}: ${r.failed}`);
      process.stdout.write(`  ✗ ${r.id}\n`);
    } else if (r.skipped) {
      skipped++;
    } else {
      totalSaved += r.savedBytes;
      process.stdout.write(
        `  ✓ ${r.id}  ${r.savedBytes > 0 ? `-${formatBytes(r.savedBytes)}` : "larger (kept)"}\n`
      );
    }
  }

  // Progress line for large batches
  if (jpgFiles.length > 30) {
    process.stdout.write(`  [${done}/${jpgFiles.length}]\r`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${"─".repeat(50)}`);
console.log(`Converted : ${done - skipped - failed.length}`);
console.log(`Skipped   : ${skipped} (already exist, use --force to redo)`);
console.log(`Failed    : ${failed.length}`);
console.log(`Space saved: ${formatBytes(totalSaved)}`);

if (failed.length > 0) {
  console.log("\nFailed conversions:");
  failed.forEach((f) => console.log(`  ${f}`));
}
