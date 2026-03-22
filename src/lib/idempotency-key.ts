// ---------------------------------------------------------------------------
// Client-side idempotency key generation
//
// Generates a unique key per request attempt. If the browser retries the
// same logical operation (e.g. network timeout + retry), pass the SAME key
// to get a cached server response instead of double-processing.
// ---------------------------------------------------------------------------

/** Generate a random idempotency key (URL-safe, 24 chars). */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    // crypto.randomUUID() returns a UUID v4 like "550e8400-e29b-41d4-a716-446655440000"
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}
