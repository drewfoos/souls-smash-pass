// Anonymous session tracking — httpOnly signed cookie
//
// Assigns a stable, server-trusted identity to anonymous users so the vote
// handler can prevent the same session from counting twice for the same
// character. The cookie is httpOnly so JS cannot read or tamper with it.
//
// Cookie format:  {sessionId}.{hmac}
//   sessionId — crypto.randomUUID()
//   hmac      — HMAC-SHA256(sessionId, ANON_SESSION_SECRET)
//
// Firebase storage key — SHA-256(sessionId) hex, first 32 chars.
// Storing a hash (not the raw ID) means the DB never exposes active session
// identifiers directly.
//
// Required env var:
//   ANON_SESSION_SECRET — a random 32+ byte hex/base64 string
//   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

import { createHmac, createHash, randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "anon_sid";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getSecret(): string {
  const s = process.env.ANON_SESSION_SECRET;
  if (!s) {
    throw new Error(
      "ANON_SESSION_SECRET is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
        "and add it to .env.local"
    );
  }
  return s;
}

function sign(sessionId: string): string {
  return createHmac("sha256", getSecret()).update(sessionId).digest("hex");
}

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseCookieValue(raw: string): string | null {
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;

  const sessionId = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);

  if (!sessionId || !signature) return null;

  try {
    const expected = sign(sessionId);
    return safeEqual(signature, expected) ? sessionId : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AnonSession {
  sessionId: string;
  /** SHA-256 hash of sessionId — use this as the Firebase path key */
  firebaseKey: string;
  /** True when a new cookie must be set on the response */
  isNew: boolean;
}

/**
 * Hash a session ID to a short, Firebase-safe key.
 * Stored in the DB instead of the raw ID so the database doesn't directly
 * expose active session identifiers.
 */
export function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 32);
}

/**
 * Read the existing anonymous session from the incoming request cookie, or
 * create a new one. Returns { sessionId, firebaseKey, isNew }.
 *
 * If isNew === true, call attachSessionCookie(response, session) before
 * returning the response to the client.
 */
export async function getOrCreateAnonSession(): Promise<AnonSession> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;

  if (raw) {
    const sessionId = parseCookieValue(raw);
    if (sessionId) {
      return { sessionId, firebaseKey: hashSessionId(sessionId), isNew: false };
    }
  }

  // No valid cookie — create a fresh session
  const sessionId = randomUUID();
  return { sessionId, firebaseKey: hashSessionId(sessionId), isNew: true };
}

/**
 * Attach the Set-Cookie header for a new anonymous session to a NextResponse.
 * Only call this when session.isNew === true.
 */
export function attachSessionCookie(
  response: NextResponse,
  session: AnonSession
): void {
  response.cookies.set(COOKIE_NAME, `${session.sessionId}.${sign(session.sessionId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
