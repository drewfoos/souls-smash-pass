// Firebase Realtime Database — server-side operations via Admin SDK
//
// Uses firebase-admin to bypass security rules for privileged writes.
// The /votes path has .write: false in public rules — only this server
// module can write to it.
//
// IMPORTANT — vote integrity model:
//   • Anonymous users  → increment-only (no decrements, no switching)
//   • Authenticated users → server reads /users/{uid}/votes for trusted
//     previous state, then computes correct deltas. Client-supplied
//     previousVotes are NEVER used.

import { characters } from "@/data/characters";
import { sanitizeFirebaseKey, unsanitizeFirebaseKey } from "./firebase-key";
import { getAdminDb } from "./firebase-admin";
import { ServerValue } from "firebase-admin/database";

// ---------------------------------------------------------------------------
// Character ID validation
// ---------------------------------------------------------------------------

const validCharacterIds = new Set(characters.map((c) => c.id));

export function isValidCharacterId(id: string): boolean {
  return validCharacterIds.has(id);
}

// ---------------------------------------------------------------------------
// Vote data types
// ---------------------------------------------------------------------------

interface VoteData {
  smash: number;
  pass: number;
}

type VotesSnapshot = Record<string, VoteData>;

// ---------------------------------------------------------------------------
// recordAnonymousVotes
//
// For unauthenticated users: increment-only. Each vote adds +1 to the chosen
// action. No vote-switching, no decrements. Simple and tamper-proof — the
// worst an attacker can do is inflate counts by +1 per request (which rate
// limiting already constrains).
// ---------------------------------------------------------------------------

export async function recordAnonymousVotes(
  batch: Array<{ characterId: string; action: "smash" | "pass" }>
): Promise<number> {
  if (batch.length === 0) return 0;

  const update: Record<string, unknown> = {};
  let count = 0;

  for (const { characterId, action } of batch) {
    if (!isValidCharacterId(characterId)) continue;
    const key = sanitizeFirebaseKey(characterId);
    update[`${key}/${action}`] = ServerValue.increment(1);
    count++;
  }

  if (count === 0) return 0;

  const db = getAdminDb();
  await db.ref("votes").update(update);
  return count;
}

// ---------------------------------------------------------------------------
// recordAuthenticatedVotes
//
// For authenticated users: reads their TRUSTED vote history from
// /users/{uid}/votes, computes correct deltas, and applies them.
//
// - If the user never voted on a character → +1 to chosen action
// - If the user already voted the same way → no-op (no duplicate counting)
// - If the user switched their vote → -1 old + +1 new
//
// The client's claim about previous votes is NEVER used. All prior state
// comes from the server-side database.
// ---------------------------------------------------------------------------

export async function recordAuthenticatedVotes(
  uid: string,
  batch: Array<{ characterId: string; action: "smash" | "pass" }>
): Promise<number> {
  if (batch.length === 0) return 0;

  const db = getAdminDb();

  // ── 1. Read trusted previous votes from /users/{uid}/votes ────────────
  const userVotesSnap = await db.ref(`users/${uid}/votes`).get();
  const trustedPrevVotes = (userVotesSnap.val() ?? {}) as Record<
    string,
    "smash" | "pass"
  >;

  // ── 2. Compute deltas using trusted state ─────────────────────────────
  const deltas: Record<string, { smash: number; pass: number }> = {};
  const newUserVotes: Record<string, "smash" | "pass"> = {};
  let changed = 0;

  for (const { characterId, action } of batch) {
    if (!isValidCharacterId(characterId)) continue;

    const sanitizedId = sanitizeFirebaseKey(characterId);
    // Check both raw and sanitized keys (legacy data may use either)
    const prev = trustedPrevVotes[characterId] ?? trustedPrevVotes[sanitizedId];

    // Already voted the same way — skip (no duplicate increment)
    if (prev === action) continue;

    if (!deltas[characterId]) deltas[characterId] = { smash: 0, pass: 0 };

    if (prev && (prev === "smash" || prev === "pass")) {
      // Vote switch: undo previous, apply new
      deltas[characterId][prev]--;
      deltas[characterId][action]++;
    } else {
      // First-time vote
      deltas[characterId][action]++;
    }

    // Track the new vote to write to user history
    newUserVotes[sanitizedId] = action;
    changed++;
  }

  if (changed === 0) return 0;

  // ── 3. Atomic multi-path update: aggregates + user history ────────────
  // Uses a root-level update so /votes/* and /users/{uid}/votes/* are
  // written in a single atomic operation. This ensures the trusted user
  // history stays in sync with aggregate totals — no consistency gap.
  const rootUpdate: Record<string, unknown> = {};

  // Aggregate vote deltas
  for (const [charId, { smash, pass }] of Object.entries(deltas)) {
    const key = sanitizeFirebaseKey(charId);
    if (smash !== 0) rootUpdate[`votes/${key}/smash`] = ServerValue.increment(smash);
    if (pass !== 0) rootUpdate[`votes/${key}/pass`] = ServerValue.increment(pass);
  }

  // User vote history — server is now authoritative for this too
  for (const [sanitizedId, action] of Object.entries(newUserVotes)) {
    rootUpdate[`users/${uid}/votes/${sanitizedId}`] = action;
  }

  // Also update lastPlayed timestamp
  rootUpdate[`users/${uid}/lastPlayed`] = Date.now();

  await db.ref().update(rootUpdate);
  return changed;
}

// ---------------------------------------------------------------------------
// getCharacterVotes — fetch smash/pass for a single character
// ---------------------------------------------------------------------------

export async function getCharacterVotes(characterId: string): Promise<VoteData> {
  const db = getAdminDb();
  const snap = await db.ref(`votes/${sanitizeFirebaseKey(characterId)}`).get();
  const data = snap.val() as VoteData | null;
  return {
    smash: data?.smash ?? 0,
    pass: data?.pass ?? 0,
  };
}

// ---------------------------------------------------------------------------
// getMultipleCharacterVotes — fetch a set of characters in one round-trip
// ---------------------------------------------------------------------------

export async function getMultipleCharacterVotes(
  ids: string[]
): Promise<Record<string, VoteData>> {
  if (ids.length === 0) return {};

  const db = getAdminDb();
  const snap = await db.ref("votes").get();
  const all = snap.val() as VotesSnapshot | null;

  const result: Record<string, VoteData> = {};
  for (const id of ids) {
    const key = sanitizeFirebaseKey(id);
    result[id] = { smash: all?.[key]?.smash ?? 0, pass: all?.[key]?.pass ?? 0 };
  }
  return result;
}

// ---------------------------------------------------------------------------
// getLeaderboard — top N characters sorted by smash or pass count
// ---------------------------------------------------------------------------

export async function getLeaderboard(
  sort: "smash" | "pass" = "smash",
  limit = 25
): Promise<Array<{ characterId: string; smash: number; pass: number }>> {
  const db = getAdminDb();
  const snap = await db.ref("votes").get();
  const all = snap.val() as VotesSnapshot | null;

  if (!all) return [];

  const entries = Object.entries(all).map(([key, data]) => ({
    characterId: unsanitizeFirebaseKey(key),
    smash: data?.smash ?? 0,
    pass: data?.pass ?? 0,
  }));

  entries.sort((a, b) => b[sort] - a[sort]);
  return entries.slice(0, limit);
}
