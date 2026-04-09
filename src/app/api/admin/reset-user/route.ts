import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";
import { ServerValue } from "firebase-admin/database";

// ---------------------------------------------------------------------------
// POST /api/admin/reset-user
//
// Resets a specific user's data: archives their votes to /deleted/{uid}/{ts},
// then wipes their votes, currentId, and runConfig. Also decrements the
// aggregate /votes counts to keep totals accurate.
//
// Body: { uid: string, confirm: "RESET_USER" }
//
// Security:
//  - Admin-only (Firebase ID token + ADMIN_EMAIL match + email_verified)
//  - Rate limited to 10 requests/min per admin
//  - Double confirmation required (confirm field)
//  - UID validated against strict Firebase UID format (alphanumeric, 1-128 chars)
//  - All actions logged to /auditLog in Firebase for accountability
//  - Votes archived to /deleted before wiping (reversible via Firebase console)
// ---------------------------------------------------------------------------

// Firebase UIDs are alphanumeric strings, typically 28 chars.
// Allow only safe characters — no slashes, dots, or special chars that could
// cause path traversal in Firebase paths like `users/${uid}/votes`.
const VALID_UID = /^[a-zA-Z0-9]{1,128}$/;

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const auth = await verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // ── Rate limit ──────────────────────────────────────────────────────────
  const limit = await rateLimit(`admin:reset-user:${auth.uid}`, { maxRequests: 10, windowMs: 60_000 });
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

    const { uid, confirm } = body as { uid?: unknown; confirm?: unknown };

    if (!uid || typeof uid !== "string") {
      return NextResponse.json({ error: "Missing or invalid uid" }, { status: 400 });
    }

    // Strict UID format — prevents path traversal (e.g. "../../votes")
    if (!VALID_UID.test(uid)) {
      return NextResponse.json({ error: "Invalid uid format" }, { status: 400 });
    }

    if (confirm !== "RESET_USER") {
      return NextResponse.json(
        { error: 'Must send { confirm: "RESET_USER" } to confirm' },
        { status: 400 }
      );
    }

    // ── Execute reset ─────────────────────────────────────────────────────
    const db = getAdminDb();

    // Read the user's current data
    const userSnap = await db.ref(`users/${uid}`).get();
    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userSnap.val();
    const votes = (userData.votes ?? {}) as Record<string, string>;

    // Only count valid vote entries (skip metadata keys like _lastSeen)
    const voteEntries = Object.entries(votes).filter(
      ([k, v]) => k !== "_lastSeen" && (v === "smash" || v === "pass")
    );
    const voteCount = voteEntries.length;

    const timestamp = Date.now();
    const rootUpdate: Record<string, unknown> = {};

    // Archive to /deleted/{uid}/{timestamp} (reversible)
    rootUpdate[`deleted/${uid}/${timestamp}`] = {
      votes: userData.votes ?? null,
      currentId: userData.currentId ?? 0,
      runConfig: userData.runConfig ?? null,
      deletedBy: auth.email,
      deletedAt: timestamp,
    };

    // Decrement aggregate vote counts — but only where count > 0 to prevent
    // negatives. This handles the case where votes were already wiped via
    // reset-all-votes, or another user reset already decremented the count.
    if (voteEntries.length > 0) {
      // Read current aggregate counts for affected characters in parallel
      const currentCounts = await Promise.all(
        voteEntries.map(async ([charKey, action]) => {
          const snap = await db.ref(`votes/${charKey}/${action}`).get();
          return { charKey, action, current: (snap.val() as number) ?? 0 };
        })
      );

      for (const { charKey, action, current } of currentCounts) {
        if (current > 0) {
          rootUpdate[`votes/${charKey}/${action}`] = ServerValue.increment(-1);
        }
      }
    }

    // Wipe user vote data but preserve profile (displayName, photoURL, etc.)
    rootUpdate[`users/${uid}/votes`] = null;
    rootUpdate[`users/${uid}/currentId`] = 0;
    rootUpdate[`users/${uid}/runConfig`] = null;
    rootUpdate[`users/${uid}/replayCount`] = 0;
    rootUpdate[`users/${uid}/lastReset`] = timestamp;

    // Audit log — persistent record in Firebase
    rootUpdate[`auditLog/${timestamp}_${auth.uid}`] = {
      action: "reset-user",
      targetUid: uid,
      adminEmail: auth.email,
      adminUid: auth.uid,
      votesArchived: voteCount,
      timestamp,
    };

    await db.ref().update(rootUpdate);

    console.log(`[admin] User ${uid} reset by ${auth.email} (${voteCount} votes archived)`);

    return NextResponse.json({
      success: true,
      message: `User reset. ${voteCount} votes archived and decremented from totals.`,
      archived: voteCount,
    });
  } catch (err) {
    console.error("[/api/admin/reset-user]", err);
    return NextResponse.json({ error: "Failed to reset user" }, { status: 500 });
  }
}
