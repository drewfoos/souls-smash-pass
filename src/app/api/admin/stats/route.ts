import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

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
        const s = counts?.smash ?? 0;
        const p = counts?.pass ?? 0;
        totalSmashes += s;
        totalPasses += p;
        if (s + p > 0) charactersWithVotes++;
      }
    }

    // Count total users
    const usersSnap = await db.ref("users").get();
    const usersData = usersSnap.val();
    const totalUsers = usersData ? Object.keys(usersData).length : 0;

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
