/**
 * Firebase Realtime Database path keys cannot contain . # $ [ ] characters.
 * Character IDs like "er_magma_wyrm_mt._gelmir" have a period which causes
 * PATCH/GET failures and client SDK errors.
 *
 * sanitizeFirebaseKey — safe key for writing/reading Firebase paths.
 * unsanitizeFirebaseKey — reverse lookup via the known character list.
 */

import { characters } from "@/data/characters";

const INVALID_RE = /[.#$[\]]/g;

export function sanitizeFirebaseKey(id: string): string {
  return id.replace(INVALID_RE, "_");
}

// Pre-built reverse map: sanitized key → original character ID
// (built once at module load; ~252 entries, negligible overhead)
const sanitizedToRaw = new Map<string, string>(
  characters.map((c) => [sanitizeFirebaseKey(c.id), c.id])
);

/**
 * Given a key read back from Firebase (already sanitized), return the
 * original character ID. Falls back to the key itself if no match found
 * (handles any legacy data stored with raw IDs).
 */
export function unsanitizeFirebaseKey(key: string): string {
  return sanitizedToRaw.get(key) ?? key;
}
