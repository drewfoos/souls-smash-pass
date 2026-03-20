import { headers } from "next/headers";

/**
 * Get the real client IP from request headers.
 *
 * Priority:
 * 1. x-real-ip — set by Vercel and cannot be spoofed by clients
 * 2. x-forwarded-for — first entry; on Vercel this is reliable because
 *    Vercel overwrites it (doesn't just append). Less reliable elsewhere.
 * 3. "unknown" as a last resort
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();

  // Vercel sets x-real-ip to the actual client IP — non-spoofable on Vercel
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();

  // Fallback: first entry in x-forwarded-for
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}
