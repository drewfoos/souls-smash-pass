import { NextResponse } from "next/server";
import {
  recordAnonymousVotes,
  recordAuthenticatedVotes,
  getMultipleCharacterVotes,
  isValidCharacterId,
} from "@/lib/firebase-db";
import { getAdminAuth } from "@/lib/firebase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

// Max votes in a single batch (252 characters = one full playthrough)
const MAX_BATCH_SIZE = 300;

// Allowed vote actions — anything else is rejected
const VALID_ACTIONS = new Set(["smash", "pass"]);

export async function POST(request: Request) {
  try {
    // ── Rate limit ────────────────────────────────────────────────────────────
    const ip = await getClientIp();
    const limit = await rateLimit(ip, { maxRequests: 120, windowMs: 60_000 });

    if (!limit.ok) {
      return NextResponse.json(
        {
          error: "Too many submissions. Try again shortly.",
          resetIn: Math.ceil(limit.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.resetIn / 1000)),
          },
        }
      );
    }

    // ── Optional auth: verify Firebase ID token if provided ───────────────────
    let uid: string | null = null;
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
        uid = decoded.uid;
      } catch {
        // Invalid token — treat as anonymous (don't block the vote)
      }
    }

    // ── Parse JSON body safely ────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Expected JSON object with { votes }" },
        { status: 400 }
      );
    }

    const { votes } = body as Record<string, unknown>;

    // ── Validate votes array ──────────────────────────────────────────────────
    if (!Array.isArray(votes)) {
      return NextResponse.json(
        { error: "Expected { votes: [{ characterId, action }] }" },
        { status: 400 }
      );
    }

    if (votes.length === 0) {
      return NextResponse.json(
        { error: "Empty votes array" },
        { status: 400 }
      );
    }

    if (votes.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch too large. Max ${MAX_BATCH_SIZE} votes.` },
        { status: 400 }
      );
    }

    // Validate each vote entry.
    // If a characterId appears more than once, keep only the last vote for it.
    // This prevents crafted payloads from double-counting the same character.
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
      return NextResponse.json(
        { error: "No valid votes in payload" },
        { status: 400 }
      );
    }

    // ── Write votes ───────────────────────────────────────────────────────────
    // previousVotes from the request body is IGNORED entirely.
    // - Anonymous: increment-only (no switching, no decrements)
    // - Authenticated: server reads trusted prior state from /users/{uid}/votes
    let recorded: number;

    if (uid) {
      recorded = await recordAuthenticatedVotes(uid, validatedVotes);
    } else {
      recorded = await recordAnonymousVotes(validatedVotes);
    }

    // Return updated vote counts for each character in the batch
    // IDs are already unique — validatedVotes is built from a Map keyed by characterId
    const uniqueIds = validatedVotes.map((v) => v.characterId);
    const voteCounts = await getMultipleCharacterVotes(uniqueIds);

    return NextResponse.json({
      recorded,
      remaining: limit.remaining,
      voteCounts,
    });
  } catch (err) {
    console.error("[/api/vote]", err);
    return NextResponse.json(
      { error: "Failed to record votes" },
      { status: 500 }
    );
  }
}
