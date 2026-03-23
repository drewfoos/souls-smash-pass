import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  characterById,
  CHARACTER_TYPE_COLORS,
  CHARACTER_TYPE_LABELS,
  type Character,
  type CharacterType,
} from "@/data/characters";
import type { UserData } from "@/lib/firebase-user";
import { safePhotoURL } from "@/lib/validate-url";
import { getAdminDb } from "@/lib/firebase-admin";
import { PublicProfileGrid } from "./PublicProfileGrid";

// ── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Fetches a user's PUBLIC profile using the Admin SDK.
 *
 * Wrapped in React `cache()` so generateMetadata and the page component
 * share a single Firebase read per request.
 */
const fetchPublicUser = cache(async function fetchPublicUser(uid: string): Promise<UserData | null> {
  try {
    const db = getAdminDb();
    const snap = await db.ref(`users/${uid}`).get();
    if (!snap.exists()) return null;
    const data = snap.val();
    if (!data || data.isPublic !== true) return null;

    // Return only the fields the public profile page needs.
    // This prevents internal metadata from leaking to the rendered page.
    return {
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      tagline: data.tagline ?? undefined,
      isPublic: true,
      votes: data.votes ?? {},
      lastPlayed: 0,           // dummy — not displayed on public page
    } as UserData;
  } catch {
    return null;
  }
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const { uid } = await params;
  const data = await fetchPublicUser(uid);
  if (!data) {
    return { title: "Profile not found — Elden Smash" };
  }
  const name = data.displayName ?? "Tarnished";
  const total = data.votes ? Object.keys(data.votes).length : 0;
  return {
    title: `${name}'s Profile — Elden Smash`,
    description: `${name} has judged ${total} Elden Ring characters on Elden Smash or Pass.`,
    openGraph: {
      title: `${name}'s Elden Smash Profile`,
      description: `See which Elden Ring characters ${name} smashed and passed.`,
    },
    twitter: {
      card: "summary",
      title: `${name}'s Elden Smash Profile`,
      description: `See which Elden Ring characters ${name} smashed and passed.`,
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const data = await fetchPublicUser(uid);

  if (!data) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 text-center">
        <p
          className="text-souls font-black text-gold mb-3"
          style={{ fontSize: "clamp(2rem, 8vw, 4rem)" }}
        >
          YOU DIED
        </p>
        <p className="text-ash text-sm mb-2">Profile not found or set to private.</p>
        <p className="text-ash/40 text-xs mb-2">
          If this is your profile, you can make it public in your profile settings.
        </p>
        <Link
          href="/"
          className="mt-6 text-sm text-ranni hover:text-ranni/70 underline underline-offset-4 transition-colors"
        >
          ← Back to Elden Smash
        </Link>
      </div>
    );
  }

  const votes = data.votes ?? {};
  const name = data.displayName ?? "Tarnished";

  // Build smashed / passed lists
  const smashed: Character[] = [];
  const passed: Character[] = [];

  for (const [charId, choice] of Object.entries(votes)) {
    const char = characterById.get(charId);
    if (!char) continue;
    if (choice === "smash") smashed.push(char);
    else passed.push(char);
  }

  const total = smashed.length + passed.length;
  const smashPct =
    total > 0 ? Math.round((smashed.length / total) * 100) : 0;

  const thirstLevel =
    smashPct >= 80
      ? "Maidenless Behavior"
      : smashPct >= 60
        ? "Down Horrendous"
        : smashPct >= 40
          ? "Perfectly Balanced"
          : smashPct >= 20
            ? "Picky Tarnished"
            : "Heart of Stone";

  // Group smashed by type
  const smashedByType = smashed.reduce<Record<string, typeof smashed>>(
    (acc, char) => {
      if (!acc[char.type]) acc[char.type] = [];
      acc[char.type].push(char);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-dvh py-10 px-4">
      {/* Back link */}
      <div className="max-w-2xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ash/50 hover:text-gold transition-colors"
        >
          <span>←</span>
          <span className="text-souls tracking-wider">Elden Smash</span>
        </Link>
      </div>

      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 text-center">
        {/* Avatar */}
        {safePhotoURL(data.photoURL) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={safePhotoURL(data.photoURL)!}
            alt={name}
            className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-gold/20 object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-dark-700 border-2 border-dark-600 flex items-center justify-center text-2xl text-gold/30">
            ✦
          </div>
        )}

        <h1 className="text-souls font-black text-gold text-2xl md:text-3xl mb-1">
          {name}
        </h1>
        {data.tagline && (
          <p className="text-sm text-ash/60 italic mb-1">&ldquo;{data.tagline}&rdquo;</p>
        )}
        <p className="text-xs text-ash/40">
          {total} characters judged
        </p>
      </div>

      {/* Stats */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="card-dark p-5">
          {/* Big numbers */}
          <div className="flex items-center justify-center gap-10 mb-5">
            <div className="text-center">
              <div className="text-3xl font-black text-souls text-smash tabular-nums">
                {smashed.length}
              </div>
              <div className="text-xs text-ash mt-0.5">Smashed</div>
            </div>
            <div className="text-xl text-dark-600 text-souls">/</div>
            <div className="text-center">
              <div className="text-3xl font-black text-souls text-pass tabular-nums">
                {passed.length}
              </div>
              <div className="text-xs text-ash mt-0.5">Passed</div>
            </div>
          </div>

          {/* Smash rate bar */}
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-souls text-ash/70">{thirstLevel}</span>
            <span className="text-gold font-bold tabular-nums">{smashPct}%</span>
          </div>
          <div className="h-2.5 bg-dark-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pass via-ember to-gold rounded-full"
              style={{ width: `${smashPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Smash list — grouped by type */}
      {smashed.length > 0 && (
        <div className="max-w-2xl mx-auto mb-8">
          <h2 className="text-souls text-sm font-bold text-gold mb-4">
            ✦ Smash List
          </h2>
          {Object.entries(smashedByType).map(([type, chars]) => {
            const colors = CHARACTER_TYPE_COLORS[type as CharacterType];
            return (
              <div key={type} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="type-pill"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {CHARACTER_TYPE_LABELS[type as CharacterType]}
                  </span>
                  <span className="text-[10px] text-ash/50 tabular-nums">
                    {chars.length}
                  </span>
                </div>
                <PublicProfileGrid characters={chars} />
              </div>
            );
          })}
        </div>
      )}

      {/* Passed / reject pile */}
      {passed.length > 0 && (
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-souls text-sm font-bold text-pass/60 mb-3">
            ✕ The Reject Pile
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {passed.map((char) => (
              <span
                key={char.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700/30
                  text-priscilla/25 border border-dark-700/20"
              >
                {char.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-2xl mx-auto text-center">
        <Link
          href="/"
          className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2"
        >
          <span className="relative z-10">Play Elden Smash</span>
        </Link>
      </div>
    </div>
  );
}
