// Firebase Realtime Database — server-side operations via Admin SDK
//
// Uses firebase-admin to bypass security rules for privileged writes.
// The /votes path has .write: false in public rules — only this server
// module can write to it.
//
// IMPORTANT — vote integrity model:
//   • Anonymous users (session-tracked) → recordAnonymousSessionVotes()
//     Reads /anonVotes/{sessionKey} to find already-submitted votes, skips
//     duplicates. First-time votes are written atomically to /votes (aggregate)
//     and /anonVotes/{sessionKey}/{charId} (session record).
//   • Anonymous users (legacy / no session) → recordAnonymousVotes()
//     Increment-only, no dedup. Kept for backward compat; route.ts now always
//     uses the session-aware path for anonymous users.
//   • Authenticated users → recordAuthenticatedVotes()
//     Server reads /users/{uid}/votes for trusted previous state, then
//     computes correct deltas. Client-supplied previousVotes are NEVER used.

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

// Mirrors firebase-user.ts RunConfig — defined here to avoid importing the
// client-only firebase-user module into this server-only file.
interface RunConfig {
  seed: number;
  selectedGames?: string[] | null;
  selectedTypes?: string[] | null;
}

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
// recordAnonymousSessionVotes
//
// Session-aware anonymous voting. Uses the hashed session ID (from the
// httpOnly cookie) as a stable per-user key in /anonVotes/{sessionKey}/.
//
// Flow:
//   1. Read /anonVotes/{sessionKey} to get characters already voted on.
//   2. Filter the incoming batch to only new (not-yet-voted) characters.
//   3. Atomic multi-path update:
//       /votes/{charKey}/{action}               += 1   (aggregate)
//       /anonVotes/{sessionKey}/{charKey}        = action
//       /anonVotes/{sessionKey}/_lastSeen        = now
//
// Duplicate votes (same character, same session) are silently ignored and
// do NOT increment the aggregate count again.
// ---------------------------------------------------------------------------

/**
 * Pure helper — exported for unit testing.
 *
 * Given the existing session snapshot (keys are sanitized character IDs from
 * Firebase) and an incoming batch, returns only the votes for characters that
 * have not been voted on in this session yet.
 */
export function filterNewAnonVotes(
  existing: Record<string, unknown>,
  batch: Array<{ characterId: string; action: "smash" | "pass" }>
): Array<{ characterId: string; action: "smash" | "pass" }> {
  const newVotes: Array<{ characterId: string; action: "smash" | "pass" }> = [];
  for (const { characterId, action } of batch) {
    if (!isValidCharacterId(characterId)) continue;
    const key = sanitizeFirebaseKey(characterId);
    if (key in existing) continue; // already voted this session — skip
    newVotes.push({ characterId, action });
  }
  return newVotes;
}

export async function recordAnonymousSessionVotes(
  sessionKey: string,
  batch: Array<{ characterId: string; action: "smash" | "pass" }>
): Promise<number> {
  if (batch.length === 0) return 0;

  const db = getAdminDb();

  // ── 1. Read which characters this session has already voted on ──────────
  const snap = await db.ref(`anonVotes/${sessionKey}`).get();
  // Value is { [sanitizedCharKey]: "smash"|"pass", _lastSeen: number } | null
  const existing = (snap.val() ?? {}) as Record<string, unknown>;

  // ── 2. Filter to only new votes ─────────────────────────────────────────
  const newVotes = filterNewAnonVotes(existing, batch);

  if (newVotes.length === 0) return 0;

  // ── 3. Atomic root update: aggregate counts + session record ─────────────
  const rootUpdate: Record<string, unknown> = {};

  for (const { characterId, action } of newVotes) {
    const key = sanitizeFirebaseKey(characterId);
    rootUpdate[`votes/${key}/${action}`] = ServerValue.increment(1);
    rootUpdate[`anonVotes/${sessionKey}/${key}`] = action;
  }

  // Track last-seen for future cleanup (e.g. TTL Cloud Function)
  rootUpdate[`anonVotes/${sessionKey}/_lastSeen`] = Date.now();

  await db.ref().update(rootUpdate);
  return newVotes.length;
}

// ---------------------------------------------------------------------------
// computeAuthVoteDeltas  (pure helper, exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Given the server's trusted previous votes for a user and an incoming batch,
 * computes the aggregate deltas and the new per-user vote entries to write.
 *
 * Rules:
 *   - Same vote as before  → no-op (not included in output)
 *   - First-time vote      → +1 to chosen action
 *   - Vote switch          → -1 old action, +1 new action
 *   - Invalid character ID → skipped
 */
export function computeAuthVoteDeltas(
  trustedPrevVotes: Record<string, "smash" | "pass">,
  batch: Array<{ characterId: string; action: "smash" | "pass" }>
): {
  deltas: Record<string, { smash: number; pass: number }>;
  newUserVotes: Record<string, "smash" | "pass">;
  changed: number;
} {
  const deltas: Record<string, { smash: number; pass: number }> = {};
  const newUserVotes: Record<string, "smash" | "pass"> = {};
  let changed = 0;

  for (const { characterId, action } of batch) {
    if (!isValidCharacterId(characterId)) continue;

    const sanitizedId = sanitizeFirebaseKey(characterId);
    // Check both raw and sanitized keys — legacy data may use either.
    const prev = trustedPrevVotes[characterId] ?? trustedPrevVotes[sanitizedId];

    if (prev === action) continue; // same vote — skip

    if (!deltas[characterId]) deltas[characterId] = { smash: 0, pass: 0 };

    if (prev === "smash" || prev === "pass") {
      // Vote switch: undo previous, apply new
      deltas[characterId][prev]--;
      deltas[characterId][action]++;
    } else {
      // First-time vote
      deltas[characterId][action]++;
    }

    newUserVotes[sanitizedId] = action;
    changed++;
  }

  return { deltas, newUserVotes, changed };
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
//
// options.currentIndex — the client's current deck frontier after this batch.
//   Written as /users/{uid}/currentId in the same atomic update as the votes
//   so position and vote map never drift apart. The server does not validate
//   this value beyond writing it; the restore logic on the client already
//   clamps it to deck length.
// options.runConfig — seed + filters needed to reconstruct the deck on another
//   device. Written once per run; cheap to include on every batch.
// ---------------------------------------------------------------------------

export async function recordAuthenticatedVotes(
  uid: string,
  batch: Array<{ characterId: string; action: "smash" | "pass" }>,
  options?: { currentIndex?: number; runConfig?: RunConfig }
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
  const { deltas, newUserVotes, changed } = computeAuthVoteDeltas(
    trustedPrevVotes,
    batch
  );

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

  // Position + run config — written atomically with votes so they never drift.
  // currentIndex comes from the client but the server is already authoritative
  // for vote state; a slightly-off position is harmless (restore logic clamps).
  if (options?.currentIndex !== undefined) {
    rootUpdate[`users/${uid}/currentId`] = options.currentIndex;
  }
  if (options?.runConfig) {
    rootUpdate[`users/${uid}/runConfig`] = options.runConfig;
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
