import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// GET /api/admin/users
//
// Returns user metadata (not full vote histories). Paginated to avoid
// dumping the entire database in a single response.
//
// Query params:
//   limit  — max users per page (default 50, max 200)
//   after  — UID to start after (for pagination)
//
// Requires a valid Firebase ID token belonging to ADMIN_EMAIL.
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Rate limit to prevent accidental Firebase abuse
  const limit = await rateLimit(`admin:users:${auth.uid}`, { maxRequests: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetIn / 1000)) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const pageSize = Number.isNaN(rawLimit) ? DEFAULT_LIMIT : Math.max(1, Math.min(rawLimit, MAX_LIMIT));
    const afterUid = searchParams.get("after") || null;

    const db = getAdminDb();

    // Paginated query — fetch pageSize + 1 to detect if there are more pages.
    let query = db.ref("users").orderByKey().limitToFirst(pageSize + 1);
    if (afterUid) {
      query = query.startAfter(afterUid);
    }

    const snap = await query.get();
    const raw = (snap.val() ?? {}) as Record<string, Record<string, unknown>>;
    const uids = Object.keys(raw);

    const hasMore = uids.length > pageSize;
    const pageUids = hasMore ? uids.slice(0, pageSize) : uids;

    // Return metadata + computed vote stats (not raw vote objects) to keep
    // payloads small while giving the dashboard the numbers it needs.
    const users = pageUids.map((uid) => {
      const u = raw[uid];
      const votes = (u?.votes ?? {}) as Record<string, string>;
      let smashCount = 0;
      let passCount = 0;
      for (const [key, val] of Object.entries(votes)) {
        if (key === "_lastSeen") continue;
        if (val === "smash") smashCount++;
        else if (val === "pass") passCount++;
      }
      return {
        uid,
        displayName: u?.displayName ?? null,
        photoURL: u?.photoURL ?? null,
        isPublic: u?.isPublic ?? false,
        lastPlayed: u?.lastPlayed ?? null,
        lastReset: u?.lastReset ?? null,
        currentId: u?.currentId ?? 0,
        replayCount: u?.replayCount ?? 0,
        smashCount,
        passCount,
        totalVotes: smashCount + passCount,
        smashRate: smashCount + passCount > 0
          ? Math.round((smashCount / (smashCount + passCount)) * 100)
          : 0,
      };
    });

    return NextResponse.json({
      users,
      pageSize,
      hasMore,
      nextAfter: hasMore ? pageUids[pageUids.length - 1] : null,
    });
  } catch (err) {
    console.error("[/api/admin/users]", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
