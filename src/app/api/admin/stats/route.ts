import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// GET /api/admin/stats
//
// Returns aggregate vote statistics. Requires a valid Firebase ID token
// belonging to ADMIN_EMAIL (case-insensitive, email_verified).
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Rate limit admin requests to prevent accidental Firebase abuse
  const limit = await rateLimit(`admin:stats:${auth.uid}`, { maxRequests: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetIn / 1000)) } }
    );
  }

  try {
    const db = getAdminDb();
    const snap = await db.ref("votes").get();
    const votes: Record<string, { smash: number; pass: number }> | null =
      snap.val();

    let totalSmashes = 0;
    let totalPasses = 0;
    let charactersWithVotes = 0;

    if (votes) {
      for (const [, counts] of Object.entries(votes)) {
        const s = Math.max(0, counts?.smash ?? 0);
        const p = Math.max(0, counts?.pass ?? 0);
        totalSmashes += s;
        totalPasses += p;
        if (s + p > 0) charactersWithVotes++;
      }
    }

    // Count users via shallow read — only fetches keys, not the full user
    // objects with all their vote histories. On a database with thousands of
    // users this is orders of magnitude cheaper than a full .get().
    let totalUsers = 0;
    try {
      const usersSnap = await db.ref("users").orderByKey().limitToFirst(10_000).get();
      totalUsers = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
    } catch {
      // If the users read fails, return stats without user count rather than
      // failing the entire request.
      totalUsers = -1;
    }

    return NextResponse.json({
      verified: true,
      adminEmail: auth.email,
      stats: {
        totalVotes: totalSmashes + totalPasses,
        totalSmashes,
        totalPasses,
        charactersWithVotes,
        totalUsers,
        smashRate:
          totalSmashes + totalPasses > 0
            ? Math.round((totalSmashes / (totalSmashes + totalPasses)) * 1000) / 10
            : null,
      },
    });
  } catch (err) {
    console.error("[/api/admin/stats]", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
