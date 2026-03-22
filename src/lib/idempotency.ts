// ---------------------------------------------------------------------------
// Lightweight idempotency cache for serverless functions
//
// Stores processed idempotency keys with their responses in memory. Since
// Vercel serverless instances are short-lived and may not share memory,
// this only prevents duplicates within a single instance lifetime.
//
// Cross-instance correctness is already guaranteed by the server's state-
// based dedup logic (reads existing votes before writing), so this layer
// is purely an optimisation — it avoids redundant DB reads on rapid retries.
//
// Keys expire after TTL_MS (5 minutes). Cleanup runs on every check to
// keep the map small without needing setInterval (which can leak in
// serverless).
// ---------------------------------------------------------------------------

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ENTRIES = 1000; // cap to prevent memory bloat from crafted keys

interface CachedResponse {
  body: unknown;
  status: number;
  expiresAt: number;
}

const cache = new Map<string, CachedResponse>();

/** Validate an idempotency key — must be a reasonable-length alphanumeric/UUID string. */
export function isValidIdempotencyKey(key: string): boolean {
  // Allow UUID v4, nanoid, or similar — alphanumeric + hyphens, 8–64 chars
  return /^[a-zA-Z0-9_-]{8,64}$/.test(key);
}

/** Look up a cached response for this key. Returns null if not found or expired. */
export function getIdempotentResponse(key: string): CachedResponse | null {
  cleanup();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry;
}

/** Store a response for an idempotency key. */
export function setIdempotentResponse(
  key: string,
  body: unknown,
  status: number
): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { body, status, expiresAt: Date.now() + TTL_MS });
}

/** Remove expired entries. */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}
