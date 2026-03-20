import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// ---------------------------------------------------------------------------
// GET /api/admin/users
//
// Returns all user records from the database. Requires a valid Firebase ID
// token belonging to ADMIN_EMAIL (case-insensitive, email_verified).
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const db = getAdminDb();
    const snap = await db.ref("users").get();
    const users = snap.val() ?? {};

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[/api/admin/users]", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
