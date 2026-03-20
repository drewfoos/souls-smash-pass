import { getAdminAuth } from "./firebase-admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();

interface AdminVerifyResult {
  ok: true;
  uid: string;
  email: string;
}

interface AdminVerifyError {
  ok: false;
  status: number;
  error: string;
}

/**
 * Verify that a request's Authorization header contains a valid Firebase ID
 * token belonging to the admin user.
 *
 * Checks:
 * 1. Token is valid and not expired
 * 2. Email matches ADMIN_EMAIL (case-insensitive)
 * 3. Email is verified by the auth provider (prevents unverified spoofing)
 */
export async function verifyAdmin(
  request: Request
): Promise<AdminVerifyResult | AdminVerifyError> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing or malformed Authorization header" };
  }

  const idToken = authHeader.slice(7);

  let decodedToken;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return { ok: false, status: 401, error: "Invalid or expired token" };
  }

  // Must have a verified email
  if (!decodedToken.email_verified) {
    return { ok: false, status: 403, error: "Email not verified" };
  }

  // Case-insensitive admin email comparison
  if (!ADMIN_EMAIL || decodedToken.email?.toLowerCase() !== ADMIN_EMAIL) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    uid: decodedToken.uid,
    email: decodedToken.email!,
  };
}
