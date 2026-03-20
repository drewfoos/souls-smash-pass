import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

// ---------------------------------------------------------------------------
// GET /api/admin/verify
//
// Lightweight endpoint: verifies the caller's Firebase ID token and checks
// whether the email matches ADMIN_EMAIL (case-insensitive, email_verified).
// Returns { isAdmin: true/false }.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const result = await verifyAdmin(request);

  if (!result.ok) {
    return NextResponse.json({ isAdmin: false });
  }

  return NextResponse.json({
    isAdmin: true,
    email: result.email,
  });
}
