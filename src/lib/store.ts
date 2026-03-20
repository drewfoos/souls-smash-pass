// In-memory store for local development
// In production, replace with Vercel KV or any Redis-compatible store

import { characters } from "@/data/characters";

interface VoteData {
  smash: number;
  pass: number;
}

// Build a Set of valid character IDs at startup so we can reject garbage
const validCharacterIds = new Set(characters.map((c) => c.id));

const votes = new Map<string, VoteData>();

export function isValidCharacterId(id: string): boolean {
  return validCharacterIds.has(id);
}

export function recordVote(characterId: string, action: "smash" | "pass") {
  if (!isValidCharacterId(characterId)) return null;
  const current = votes.get(characterId) || { smash: 0, pass: 0 };
  current[action]++;
  votes.set(characterId, current);
  return current;
}

export function recordBatchVotes(
  batch: Array<{ characterId: string; action: "smash" | "pass" }>
): number {
  let count = 0;
  for (const { characterId, action } of batch) {
    if (
      !characterId ||
      typeof characterId !== "string" ||
      !["smash", "pass"].includes(action) ||
      !isValidCharacterId(characterId)
    )
      continue;
    const current = votes.get(characterId) || { smash: 0, pass: 0 };
    current[action]++;
    votes.set(characterId, current);
    count++;
  }
  return count;
}

export function getLeaderboard(
  sort: "smash" | "pass" = "smash",
  limit = 25
): Array<{ characterId: string; smash: number; pass: number }> {
  const entries = Array.from(votes.entries()).map(([characterId, data]) => ({
    characterId,
    ...data,
  }));

  entries.sort((a, b) => b[sort] - a[sort]);
  return entries.slice(0, limit);
}

export function getCharacterVotes(characterId: string): VoteData {
  return votes.get(characterId) || { smash: 0, pass: 0 };
}
