/**
 * Reset a Firebase user's game state for testing.
 *
 * Usage:
 *   bun run reset-user                  # resets the default UID from .env.local
 *   bun run reset-user <uid>            # resets a specific user
 *   bun run reset-user --hard           # also deletes archived vote snapshots
 *
 * What it does:
 *   1. Archives current votes to /deleted/{uid}/{timestamp}  (unless --hard)
 *   2. Wipes /users/{uid}/votes
 *   3. Resets currentId, runConfig, lastReset
 *   4. Clears the /deleted/{uid} archive tree  (only with --hard)
 *
 * Requires the same FIREBASE_ADMIN_* env vars as the API routes.
 * Reads .env.local automatically via Bun.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(import.meta.dir, "../.env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env.local might not exist
  }
}

loadEnv();

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const hard = args.includes("--hard");
const uid = args.find((a) => !a.startsWith("--")) ?? process.env.TEST_USER_UID;

if (!uid) {
  console.error("Usage: bun run reset-user [uid] [--hard]");
  console.error("  Or set TEST_USER_UID in .env.local");
  process.exit(1);
}

// ── Init Firebase Admin ──────────────────────────────────────────────────────
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const databaseURL = process.env.FIREBASE_DATABASE_URL;

if (!projectId || !clientEmail || !privateKey || !databaseURL) {
  console.error("Missing FIREBASE_ADMIN_* env vars. Check .env.local.");
  process.exit(1);
}

const app = getApps().length > 0
  ? getApps()[0]
  : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
const db = getDatabase(app);

// ── Reset ────────────────────────────────────────────────────────────────────
async function main() {
  const userRef = db.ref(`users/${uid}`);
  const snap = await userRef.child("votes").get();
  const voteCount = snap.exists() ? Object.keys(snap.val()).length : 0;

  console.log(`\nUser: ${uid}`);
  console.log(`Votes to clear: ${voteCount}`);

  // Archive votes (unless --hard or no votes)
  if (!hard && snap.exists()) {
    await db.ref(`deleted/${uid}/${Date.now()}`).set(snap.val());
    console.log("  → Archived votes to /deleted");
  }

  // Wipe votes + reset metadata
  await userRef.update({
    votes: null,
    currentId: 0,
    runConfig: null,
    lastReset: Date.now(),
  });
  console.log("  → Cleared votes, currentId, runConfig");

  // Hard mode: also nuke archives
  if (hard) {
    await db.ref(`deleted/${uid}`).remove();
    console.log("  → Deleted vote archives");
  }

  console.log("\nDone. Clear localStorage in the browser to complete the reset.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
