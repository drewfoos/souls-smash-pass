import { NextResponse } from "next/server";
import {
  recordAnonymousSessionVotes,
  recordAuthenticatedVotes,
  getMultipleCharacterVotes,
  isValidCharacterId,
} from "@/lib/firebase-db";
import { getAdminAuth } from "@/lib/firebase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { getOrCreateAnonSession, attachSessionCookie } from "@/lib/anon-session";
import {
  isValidIdempotencyKey,
  getIdempotentResponse,
  setIdempotentResponse,
} from "@/lib/idempotency";

// ---------------------------------------------------------------------------
// Batch size limits
//
// Client uses BATCH_SIZE=5 with debounced flush, so these limits only matter
// for crafted requests — not normal gameplay.
//
// Anon limit is meaningfully smaller to reduce abuse surface.
// Auth limit covers a full playthrough in a single sync (e.g. cross-device
// restore that needs to back-fill all votes at once).
// ---------------------------------------------------------------------------

const ANON_MAX_BATCH = 25;
const AUTH_MAX_BATCH = 300;

/** Absolute ceiling for currentIndex — no deck can be larger than this. */
const MAX_CURRENT_INDEX = 1000;

/** Max request body size in bytes. AUTH_MAX_BATCH=300 votes × ~80 bytes each ≈ 24KB.
 *  64KB gives plenty of headroom for runConfig etc. while blocking abuse payloads. */
const MAX_BODY_BYTES = 64 * 1024;

// Allowed vote actions — anything else is rejected
const VALID_ACTIONS = new Set(["smash", "pass"]);

// ---------------------------------------------------------------------------
// Origin allowlist
//
// Built once at module load. If the Origin header is present on a request and
// it is not in this set, the request is rejected with 403.
//
// Absent Origin is allowed — same-origin browser POSTs may omit it, and
// server-to-server callers (e.g. admin scripts) won't send it at all.
//
// Required env var for production:
//   APP_URL — canonical origin of the app, e.g. https://example.com
//             (no trailing slash)
// ---------------------------------------------------------------------------

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  // Always allow localhost during development
  origins.add("http://localhost:3000");
  origins.add("http://localhost");
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) origins.add(appUrl);
  // Vercel sets VERCEL_URL on every deployment (preview + production).
  // Include it so preview deployments can call the API without being 403'd.
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) origins.add(`https://${vercelUrl}`);
  return origins;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

export async function POST(request: Request) {
  // anonSession is hoisted so the catch block can still attach the cookie.
  let anonSession: Awaited<ReturnType<typeof getOrCreateAnonSession>> | null = null;

  function reply(response: NextResponse): NextResponse {
    if (anonSession?.isNew) attachSessionCookie(response, anonSession);
    return response;
  }

  try {
    // ── 1. Origin check ──────────────────────────────────────────────────────
    // Rejects cross-origin requests from unrecognised domains.
    // An absent Origin header is permitted (see comment above).
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── 2. Content-Type guard ────────────────────────────────────────────────
    // Rejects form submissions, plain-text bodies, etc.
    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    // ── 2b. Body size guard ────────────────────────────────────────────────
    // Reject obviously oversized payloads before reading the body.
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      );
    }

    // ── 2c. Idempotency key ────────────────────────────────────────────────
    // If the client sends an Idempotency-Key header and we've already
    // processed it (within this serverless instance), return the cached
    // response immediately — no DB reads, no writes, no rate-limit cost.
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) {
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return NextResponse.json(
          { error: "Invalid Idempotency-Key format" },
          { status: 400 }
        );
      }
      const cached = getIdempotentResponse(idempotencyKey);
      if (cached) {
        return reply(NextResponse.json(cached.body, { status: cached.status }));
      }
    }

    // ── 3. Auth check — must happen before rate limiting ────────────────────
    // If an Authorization header is present but the token is invalid, return
    // 401 rather than silently falling through to the anonymous path. A broken
    // signed-in client would otherwise get anon-level dedup instead of per-uid
    // dedup. Omitting the header entirely is the correct signal for "I am
    // anonymous."
    let uid: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
        uid = decoded.uid;
      } catch {
        return NextResponse.json(
          { error: "Invalid or expired authorization token" },
          { status: 401 }
        );
      }
    }

    // ── 4. Anonymous session ─────────────────────────────────────────────────
    // Read (or create) the httpOnly signed session cookie so the server can
    // track which characters this session has already voted on.
    anonSession = uid ? null : await getOrCreateAnonSession();

    // ── 5. Rate limiting ─────────────────────────────────────────────────────
    // Authenticated: keyed by UID (most precise — not spoofable)
    // Anonymous:     keyed by session + secondary IP check
    const rateLimitKey = uid
      ? `uid:${uid}`
      : `anon:${anonSession!.firebaseKey}`;

    const limit = await rateLimit(rateLimitKey, { maxRequests: 120, windowMs: 60_000 });

    if (!limit.ok) {
      return reply(
        NextResponse.json(
          {
            error: "Too many submissions. Try again shortly.",
            resetIn: Math.ceil(limit.resetIn / 1000),
          },
          {
            status: 429,
            headers: { "Retry-After": String(Math.ceil(limit.resetIn / 1000)) },
          }
        )
      );
    }

    // IP-based secondary check for anonymous users — catches new sessions being
    // spam-created from a single IP to bypass per-session limits.
    if (!uid) {
      const ip = await getClientIp();
      const ipLimit = await rateLimit(`ip:${ip}`, { maxRequests: 300, windowMs: 60_000 });
      if (!ipLimit.ok) {
        return reply(
          NextResponse.json(
            {
              error: "Too many submissions from this network. Try again shortly.",
              resetIn: Math.ceil(ipLimit.resetIn / 1000),
            },
            {
              status: 429,
              headers: { "Retry-After": String(Math.ceil(ipLimit.resetIn / 1000)) },
            }
          )
        );
      }
    }

    // ── 6. Parse JSON body ───────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply(
        NextResponse.json({ error: "Expected JSON object with { votes }" }, { status: 400 })
      );
    }

    const { votes, currentIndex, runConfig } = body as Record<string, unknown>;

    // ── 7. Validate votes array ──────────────────────────────────────────────
    if (!Array.isArray(votes)) {
      return reply(
        NextResponse.json(
          { error: "Expected { votes: [{ characterId, action }] }" },
          { status: 400 }
        )
      );
    }

    if (votes.length === 0) {
      return reply(NextResponse.json({ error: "Empty votes array" }, { status: 400 }));
    }

    const maxBatch = uid ? AUTH_MAX_BATCH : ANON_MAX_BATCH;
    if (votes.length > maxBatch) {
      return reply(
        NextResponse.json({ error: `Batch too large. Max ${maxBatch} votes.` }, { status: 400 })
      );
    }

    // ── 8. Dedupe within batch, validate each entry ──────────────────────────
    // If a characterId appears more than once, keep only the last action for it.
    // Prevents crafted payloads from double-counting the same character within
    // a single request. Cross-request dedup is handled server-side below.
    const deduped = new Map<string, "smash" | "pass">();

    for (const vote of votes) {
      if (!vote || typeof vote !== "object") continue;
      const { characterId, action } = vote as Record<string, unknown>;
      if (typeof characterId !== "string" || !characterId) continue;
      if (typeof action !== "string" || !VALID_ACTIONS.has(action)) continue;
      if (!isValidCharacterId(characterId)) continue;
      deduped.set(characterId, action as "smash" | "pass");
    }

    const validatedVotes = Array.from(deduped, ([characterId, action]) => ({
      characterId,
      action,
    }));

    if (validatedVotes.length === 0) {
      return reply(
        NextResponse.json({ error: "No valid votes in payload" }, { status: 400 })
      );
    }

    // ── 9. Write votes ───────────────────────────────────────────────────────
    // previousVotes from the client is IGNORED entirely — server is authoritative.
    //
    // Anonymous:     recordAnonymousSessionVotes checks /anonVotes/{sessionKey}
    //                to skip characters already voted on this session.
    // Authenticated: recordAuthenticatedVotes reads /users/{uid}/votes for
    //                trusted prior state, computes deltas correctly.
    let recorded: number;

    if (uid) {
      // currentIndex and runConfig are advisory — the server doesn't validate
      // them beyond writing them. Malformed values are silently dropped.
      const safeCurrentIndex =
        typeof currentIndex === "number" && Number.isFinite(currentIndex) && currentIndex >= 0 && currentIndex <= MAX_CURRENT_INDEX
          ? Math.floor(currentIndex)
          : undefined;

      // Validate runConfig shape and element types before writing to Firebase.
      // An attacker sending { selectedGames: [1, null, {}] } would otherwise
      // write garbage that crashes the client on restore.
      const safeRunConfig = parseRunConfig(runConfig);

      recorded = await recordAuthenticatedVotes(uid, validatedVotes, {
        currentIndex: safeCurrentIndex,
        runConfig: safeRunConfig,
      });
    } else {
      recorded = await recordAnonymousSessionVotes(
        anonSession!.firebaseKey,
        validatedVotes
      );
    }

    // ── 10. Return updated vote counts ───────────────────────────────────────
    const uniqueIds = validatedVotes.map((v) => v.characterId);
    const voteCounts = await getMultipleCharacterVotes(uniqueIds);

    const responseBody = { recorded, remaining: limit.remaining, voteCounts };

    // Cache successful response so retries with the same idempotency key
    // get an instant reply without hitting the database again.
    if (idempotencyKey) {
      setIdempotentResponse(idempotencyKey, responseBody, 200);
    }

    return reply(NextResponse.json(responseBody));
  } catch (err) {
    console.error("[/api/vote]", err);
    // Use reply() so the session cookie is still set on errors — otherwise
    // the next request creates a new session instead of reusing this one.
    return reply(
      NextResponse.json({ error: "Failed to record votes" }, { status: 500 })
    );
  }
}

// ---------------------------------------------------------------------------
// runConfig validation
//
// Validates every field and element type. Returns a clean RunConfig or
// undefined if the input is malformed.
// ---------------------------------------------------------------------------

function parseRunConfig(
  raw: unknown
): { seed: number; selectedGames: string[] | null; selectedTypes: string[] | null } | undefined {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const obj = raw as Record<string, unknown>;

  // seed must be a finite number
  if (typeof obj.seed !== "number" || !Number.isFinite(obj.seed)) {
    return undefined;
  }

  return {
    seed: obj.seed,
    selectedGames: parseStringArray(obj.selectedGames),
    selectedTypes: parseStringArray(obj.selectedTypes),
  };
}

/** Returns a string[] if input is a small array of strings, otherwise null. */
function parseStringArray(val: unknown, maxLength = 50): string[] | null {
  if (!Array.isArray(val)) return null;
  if (val.length > maxLength) return null;
  // Reject if any element is not a string — don't silently filter
  if (!val.every((v): v is string => typeof v === "string" && v.length <= 100)) return null;
  return val;
}
