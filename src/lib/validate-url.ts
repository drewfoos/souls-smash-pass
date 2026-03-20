/**
 * Validates that a photoURL is a safe HTTPS URL from an allowed domain.
 * Returns the URL if valid, or null if not.
 *
 * This prevents XSS or phishing via user-controlled photoURL fields
 * stored in Firebase (which a malicious client could set to anything).
 */

const ALLOWED_PHOTO_HOSTS = new Set([
  "lh3.googleusercontent.com",  // Google profile photos
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "googleusercontent.com",
]);

export function safePhotoURL(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);

    // Must be HTTPS
    if (parsed.protocol !== "https:") return null;

    // Check against allowed hosts
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_PHOTO_HOSTS.has(host)) return url;

    // Also allow any subdomain of googleusercontent.com
    if (host.endsWith(".googleusercontent.com")) return url;

    return null;
  } catch {
    return null;
  }
}
