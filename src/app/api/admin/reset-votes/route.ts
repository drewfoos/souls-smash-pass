import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// POST /api/admin/reset-votes
//
// Wipes ALL aggregate vote counts (/votes) and anonymous session votes
// (/anonVotes). Does NOT touch user vote histories — those are per-user
// and should be reset individually via /api/admin/reset-user if needed.
//
// Security:
//  - Admin-only (Firebase ID token + ADMIN_EMAIL match + email_verified)
//  - Rate limited to 2 requests/min per admin (prevents accidental double-fire)
//  - Double confirmation required (confirm field in body)
//  - All actions logged to /auditLog in Firebase for accountability
//  - Aggregate totals archived to /deleted/_votes/{timestamp} before wiping
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const auth = await verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  const limit = await rateLimit(`admin:reset-votes:${auth.uid}`, { maxRequests: 2, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetIn / 1000)) } }
    );
  }

  // ── Content-Type check ──────────────────────────────────────────────────
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  try {
    // ── Parse & validate body ─────────────────────────────────────────────
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
    }

    const { confirm } = body as { confirm?: unknown };
    if (confirm !== "RESET_ALL_VOTES") {
      return NextResponse.json(
        { error: 'Must send { confirm: "RESET_ALL_VOTES" } to confirm' },
        { status: 400 }
      );
    }

    // ── Execute reset ─────────────────────────────────────────────────────
    const db = getAdminDb();
    const timestamp = Date.now();

    // Archive current votes before wiping (reversible via Firebase console)
    const votesSnap = await db.ref("votes").get();
    const currentVotes = votesSnap.val();

    const rootUpdate: Record<string, unknown> = {
      // Archive
      [`deleted/_votes/${timestamp}`]: {
        votes: currentVotes,
        deletedBy: auth.email,
        deletedAt: timestamp,
      },
      // Wipe
      votes: null,
      anonVotes: null,
      // Audit log
      [`auditLog/${timestamp}_${auth.uid}`]: {
        action: "reset-all-votes",
        adminEmail: auth.email,
        adminUid: auth.uid,
        characterCount: currentVotes ? Object.keys(currentVotes).length : 0,
        timestamp,
      },
    };

    await db.ref().update(rootUpdate);

    console.log(`[admin] All votes reset by ${auth.email} (${currentVotes ? Object.keys(currentVotes).length : 0} characters archived)`);

    return NextResponse.json({
      success: true,
      message: "All votes and anonymous sessions have been reset. Previous data archived.",
    });
  } catch (err) {
    console.error("[/api/admin/reset-votes]", err);
    return NextResponse.json({ error: "Failed to reset votes" }, { status: 500 });
  }
}
