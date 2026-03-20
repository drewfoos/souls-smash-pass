import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/firebase-db";
import { characterById } from "@/data/characters";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

export async function GET(request: Request) {
  try {
    // Rate limit: 30 reads per minute per IP
    const ip = await getClientIp();
    const limit = await rateLimit(`read:lb:${ip}`, {
      maxRequests: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.resetIn / 1000)),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") === "pass" ? "pass" : "smash";
    const rawLimit = parseInt(searchParams.get("limit") || "25", 10);
    const safeLimit = Number.isNaN(rawLimit)
      ? 25
      : Math.max(1, Math.min(rawLimit, 100));

    // Fetch from Firebase Realtime DB
    const entries = await getLeaderboard(sort, safeLimit);

    // Enrich with character metadata
    const enriched = entries.map((entry) => {
      const character = characterById.get(entry.characterId);
      return {
        ...entry,
        character: character
          ? { name: character.name, game: character.game, type: character.type }
          : null,
      };
    });

    return NextResponse.json(enriched, {
      headers: {
        // Cache for 60s on CDN edge, serve stale for up to 2 min while revalidating
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[/api/leaderboard]", err);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
