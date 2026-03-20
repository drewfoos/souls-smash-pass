// ---------------------------------------------------------------------------
// Distributed-friendly rate limiter for Vercel serverless
//
// Strategy: Uses the Firebase Realtime Database (via Admin SDK) as a shared
// store so rate limits are enforced across all serverless instances.
//
// For low-traffic apps like this one, the overhead of a single Firebase read
// + write per request is negligible and avoids adding Redis/KV dependencies.
//
// Falls back to in-memory rate limiting if the Firebase write fails (so the
// app never breaks — it just loses cross-instance enforcement).
// ---------------------------------------------------------------------------

import { getAdminDb } from "./firebase-admin";

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number;
}

// ── In-memory fallback store ────────────────────────────────────────────────
interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetAt) memoryStore.delete(key);
  }
}, 5 * 60 * 1000);

function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = entry.resetAt - now;

  return { ok: entry.count <= maxRequests, remaining, resetIn };
}

// ── Distributed rate limiter ────────────────────────────────────────────────

/**
 * Hash an IP string to a short alphanumeric key safe for Firebase paths.
 * We don't store raw IPs in the database for privacy.
 */
function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Sanitise a rate-limit key for use as a Firebase path segment.
 * Strips characters that Firebase forbids: . $ # [ ] /
 */
function sanitizeKey(key: string): string {
  return key.replace(/[.#$[\]/]/g, "_");
}

export async function rateLimit(
  key: string,
  { maxRequests = 5, windowMs = 60_000 } = {}
): Promise<RateLimitResult> {
  const safeKey = `${sanitizeKey(key)}_${hashKey(key)}`;
  const now = Date.now();

  try {
    const db = getAdminDb();
    const rlRef = db.ref(`rateLimit/${safeKey}`);
    const snap = await rlRef.get();
    const data = snap.val() as { count: number; resetAt: number } | null;

    // Window expired or first request — start fresh
    if (!data || now > data.resetAt) {
      await rlRef.set({ count: 1, resetAt: now + windowMs });
      return { ok: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    const newCount = data.count + 1;
    await rlRef.update({ count: newCount });

    const remaining = Math.max(0, maxRequests - newCount);
    const resetIn = data.resetAt - now;

    return { ok: newCount <= maxRequests, remaining, resetIn };
  } catch {
    // Firebase unavailable — fall back to in-memory (still provides per-instance protection)
    return memoryRateLimit(key, maxRequests, windowMs);
  }
}
