// Firebase client-side user operations
// Runs in the browser only — uses the Firebase JS SDK with the user's auth token
// so Firebase security rules enforce that users can only write their own history.

import { ref, update, get, remove, set } from "firebase/database";
import { getFirebaseDatabase } from "./firebase";
import type { User } from "firebase/auth";
import { characterById } from "@/data/characters";
import { sanitizeFirebaseKey, unsanitizeFirebaseKey } from "./firebase-key";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoteChoice = "smash" | "pass";

export interface UserVotes {
  [characterId: string]: VoteChoice;
}

/**
 * Run config stored alongside progress so cross-device restore can
 * reconstruct the exact same deck (same seed, same filters).
 */
export interface RunConfig {
  seed: number;
  selectedGames?: string[] | null;
  selectedTypes?: string[] | null;
}

export interface UserData {
  displayName: string | null;
  photoURL: string | null;
  lastPlayed: number;
  /**
   * How many characters the user has voted on (their position in the deck).
   * Saved on every vote so progress is preserved across devices — mirrors
   * pokesmash's `currentId` field.
   */
  currentId?: number;
  /**
   * When true the user's profile is publicly readable by anyone — including
   * unauthenticated visitors — via the /users/[uid] page.
   * Defaults to false (private).
   */
  isPublic?: boolean;
  /** Short user-written tagline shown on their public profile. */
  tagline?: string;
  /** Timestamp of the last vote history reset. */
  lastReset?: number;
  /** Run config for the current/last run — used for cross-device deck reconstruction. */
  runConfig?: RunConfig;
  votes: UserVotes;
}

// ---------------------------------------------------------------------------
// saveUserProfile
//
// Writes display metadata (displayName, photoURL) for a signed-in user.
// Called once at sign-in rather than on every vote so profile data stays
// current without being part of the vote write path.
// ---------------------------------------------------------------------------

export async function saveUserProfile(user: User): Promise<void> {
  const db = getFirebaseDatabase();
  await update(ref(db, `users/${user.uid}`), {
    displayName: user.displayName ?? "Tarnished",
    photoURL: user.photoURL ?? null,
    lastPlayed: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// saveUserHistory
//
// Called after a game session ends (client-side, authenticated user only).
// Merges the current session's votes into /users/{uid}/votes — later plays
// overwrite earlier choices for the same character, so it always reflects
// the user's most recent opinion.
//
// Optionally accepts `currentId` (= currentIndex) so the server always knows
// how far the user has progressed — used for cross-device sync on sign-in.
// ---------------------------------------------------------------------------

export async function saveUserHistory(
  user: User,
  history: Array<{ character: { id: string }; action: VoteChoice }>,
  currentId?: number,
  runConfig?: RunConfig,
): Promise<void> {
  if (history.length === 0) return;

  const db = getFirebaseDatabase();

  // Build votes map for this session.
  // Firebase path keys cannot contain . # $ [ ] so we sanitize character IDs.
  const votesUpdate: Record<string, VoteChoice> = {};
  for (const entry of history) {
    votesUpdate[sanitizeFirebaseKey(entry.character.id)] = entry.action;
  }

  // Single atomic multi-path update: metadata + votes + runConfig in one write.
  // Prevents partial state if one write succeeds and the other fails.
  const atomicUpdate: Record<string, unknown> = {
    displayName: user.displayName ?? "Tarnished",
    photoURL: user.photoURL ?? null,
    lastPlayed: Date.now(),
  };
  if (currentId !== undefined) {
    atomicUpdate.currentId = currentId;
  }
  if (runConfig) {
    atomicUpdate.runConfig = runConfig;
  }
  // Merge votes into the same update using path notation
  for (const [key, action] of Object.entries(votesUpdate)) {
    atomicUpdate[`votes/${key}`] = action;
  }
  await update(ref(db, `users/${user.uid}`), atomicUpdate);
}

// ---------------------------------------------------------------------------
// saveUserPosition
//
// Called on every vote when the user is signed in — stores their current
// position (deck index) and run config in Firebase so the exact deck can be
// reconstructed on another device. Run config (seed + filters) only needs to
// be written once per run, but including it on every save is cheap and avoids
// a separate "run started" write.
// Fire-and-forget: call with .catch(console.error).
// ---------------------------------------------------------------------------

export async function saveUserPosition(
  user: User,
  currentId: number,
  runConfig?: RunConfig,
): Promise<void> {
  const db = getFirebaseDatabase();
  const payload: Record<string, unknown> = { currentId };
  if (runConfig) {
    payload.runConfig = runConfig;
  }
  await update(ref(db, `users/${user.uid}`), payload);
}

// ---------------------------------------------------------------------------
// getUserData
//
// Fetches the full user node: profile metadata + position + all-time votes.
// ---------------------------------------------------------------------------

export async function getUserData(uid: string): Promise<UserData | null> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) return null;
  return snap.val() as UserData;
}

// ---------------------------------------------------------------------------
// resetUserHistory
//
// Archives the user's votes to /deleted/{uid}/{timestamp} then wipes
// /users/{uid}/votes. Called client-side so Firebase rules enforce ownership.
// ---------------------------------------------------------------------------

/** Maximum number of archived vote snapshots to keep per user. */
const MAX_ARCHIVES = 3;

export async function resetUserHistory(user: User): Promise<void> {
  const db = getFirebaseDatabase();

  // Snapshot existing votes before wiping
  const snap = await get(ref(db, `users/${user.uid}/votes`));
  if (snap.exists()) {
    // Archive under /deleted/{uid}/{timestamp} for recovery if needed
    await set(
      ref(db, `deleted/${user.uid}/${Date.now()}`),
      snap.val()
    );
  }

  // Prune old archives — keep only the latest MAX_ARCHIVES snapshots.
  // Keys are timestamps so lexicographic sort === chronological sort.
  try {
    const archiveSnap = await get(ref(db, `deleted/${user.uid}`));
    if (archiveSnap.exists()) {
      const keys = Object.keys(archiveSnap.val()).sort();
      if (keys.length > MAX_ARCHIVES) {
        const toDelete = keys.slice(0, keys.length - MAX_ARCHIVES);
        const pruneUpdate: Record<string, null> = {};
        for (const key of toDelete) {
          pruneUpdate[key] = null; // writing null deletes the node
        }
        await update(ref(db, `deleted/${user.uid}`), pruneUpdate);
      }
    }
  } catch {
    // Pruning is best-effort — don't block the reset if it fails
  }

  // Wipe the votes node, reset position, and clear stale run config
  await remove(ref(db, `users/${user.uid}/votes`));
  await update(ref(db, `users/${user.uid}`), {
    lastReset: Date.now(),
    currentId: 0,
    runConfig: null, // writing null deletes the node — prevents stale config after reset
  });
}

// ---------------------------------------------------------------------------
// updateUserProfile
//
// Lets users customise their display name and tagline. Called client-side so
// Firebase rules enforce that only the owner can write.
// ---------------------------------------------------------------------------

// Field length limits — enforced here AND in Firebase rules
const MAX_DISPLAY_NAME = 50;
const MAX_TAGLINE = 160;

export async function updateUserProfile(
  user: User,
  fields: { displayName?: string; tagline?: string }
): Promise<void> {
  const db = getFirebaseDatabase();
  const updates: Record<string, unknown> = {};
  if (fields.displayName !== undefined) {
    const trimmed = fields.displayName.trim().slice(0, MAX_DISPLAY_NAME);
    updates.displayName = trimmed || null;
  }
  if (fields.tagline !== undefined) {
    const trimmed = fields.tagline.trim().slice(0, MAX_TAGLINE);
    updates.tagline = trimmed || null;
  }
  if (Object.keys(updates).length > 0) {
    await update(ref(db, `users/${user.uid}`), updates);
  }
}

// ---------------------------------------------------------------------------
// setUserPublic
//
// Toggles the user's public-profile opt-in.  When set to true the
// /users/{uid} node becomes readable without authentication, enabling the
// shareable /users/[uid] page.
// ---------------------------------------------------------------------------

export async function setUserPublic(user: User, isPublic: boolean): Promise<void> {
  const db = getFirebaseDatabase();
  await update(ref(db, `users/${user.uid}`), { isPublic });
}

// ---------------------------------------------------------------------------
// buildUserStats
// ---------------------------------------------------------------------------

export function buildUserStats(votes: UserVotes) {
  const smashed = [];
  const passed = [];

  for (const [key, choice] of Object.entries(votes)) {
    // Support both sanitized keys (new writes) and raw character IDs (legacy data).
    const char = characterById.get(key) ?? characterById.get(unsanitizeFirebaseKey(key));
    if (!char) continue; // character removed from data
    if (choice === "smash") smashed.push(char);
    else passed.push(char);
  }

  const total = smashed.length + passed.length;
  const smashPercent = total > 0 ? Math.round((smashed.length / total) * 100) : 0;

  return { smashed, passed, total, smashPercent };
}
