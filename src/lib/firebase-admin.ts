// Firebase Admin SDK — server-side only
//
// Initialised once via getAdminDb(). Used by API routes for privileged
// database writes that bypass security rules.
//
// Required env vars (no NEXT_PUBLIC_ prefix — never sent to browser):
//   FIREBASE_ADMIN_PROJECT_ID
//   FIREBASE_ADMIN_CLIENT_EMAIL
//   FIREBASE_ADMIN_PRIVATE_KEY
//   FIREBASE_DATABASE_URL

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminApp: App | null = null;

function getOrInitApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin SDK credentials. " +
        "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, " +
        "and FIREBASE_ADMIN_PRIVATE_KEY in .env.local."
    );
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });

  return adminApp;
}

/** Get the Admin Realtime Database instance */
export function getAdminDb(): Database {
  return getDatabase(getOrInitApp());
}

/** Get the Admin Auth instance (for verifying ID tokens) */
export function getAdminAuth(): Auth {
  return getAuth(getOrInitApp());
}
