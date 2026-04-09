// Firebase client-side user operations
// Runs in the browser only — uses the Firebase JS SDK with the user's auth token
// so Firebase security rules enforce that users can only write their own history.

import { ref, update, get, remove, set } from "firebase/database";
import { getFirebaseDatabase } from "./firebase";
import type { User } from "firebase/auth";
import { characterById } from "@/data/characters";
import { unsanitizeFirebaseKey } from "./firebase-key";

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
  const snap = await get(ref(db, `users/${user.uid}/isPublic`));
  const profileUpdate: Record<string, unknown> = {
    displayName: user.displayName ?? "Tarnished",
    photoURL: user.photoURL ?? null,
    lastPlayed: Date.now(),
  };
  // Default new users to public. Don't overwrite if they've already toggled it.
  if (!snap.exists()) {
    profileUpdate.isPublic = true;
  }
  await update(ref(db, `users/${user.uid}`), profileUpdate);
}

// saveUserHistory and saveUserPosition were removed — votes and position are
// now written exclusively through /api/vote (Admin SDK), not client-side.

/** Increment the replay counter so admin can distinguish NG+ users from new ones. */
export async function incrementReplayCount(user: User): Promise<void> {
  const db = getFirebaseDatabase();
  const countRef = ref(db, `users/${user.uid}/replayCount`);
  const snap = await get(countRef);
  const current = typeof snap.val() === "number" ? (snap.val() as number) : 0;
  await set(countRef, current + 1);
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

/**
 * Lightweight fetch that returns only metadata (currentId, runConfig) without
 * downloading the entire votes object. Use for tab-focus checks where we only
 * need to know IF Firebase is ahead, not the full vote history.
 */
export async function getUserMeta(uid: string): Promise<{
  currentId: number;
  runConfig?: RunConfig;
} | null> {
  const db = getFirebaseDatabase();
  const [currentIdSnap, runConfigSnap] = await Promise.all([
    get(ref(db, `users/${uid}/currentId`)),
    get(ref(db, `users/${uid}/runConfig`)),
  ]);
  if (!currentIdSnap.exists()) return null;
  return {
    currentId: currentIdSnap.val() ?? 0,
    runConfig: runConfigSnap.val() ?? undefined,
  };
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
