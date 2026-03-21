// Firebase Realtime Database — client-side live subscriptions
//
// These hooks use onValue() so every connected browser sees vote count
// changes the moment they're written, with zero polling.
//
// Usage:
//   const votes = useCharacterVotes("er_ranni");     // { smash, pass }
//   const { allVotes, loading } = useAllVotes();     // whole /votes node

"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getFirebaseDatabase } from "./firebase";
import { sanitizeFirebaseKey, unsanitizeFirebaseKey } from "./firebase-key";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VotePair {
  smash: number;
  pass: number;
}

export type AllVotesMap = Record<string, VotePair>;

// ---------------------------------------------------------------------------
// useCharacterVotes
//
// Subscribes to /votes/{characterId} and returns live smash/pass counts.
// Returns { smash: 0, pass: 0 } while loading or if no votes exist yet.
// ---------------------------------------------------------------------------

export function useCharacterVotes(characterId: string | null): { votes: VotePair; loading: boolean } {
  const [votes, setVotes] = useState<VotePair>({ smash: 0, pass: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!characterId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const db = getFirebaseDatabase();
    const voteRef = ref(db, `votes/${sanitizeFirebaseKey(characterId)}`);

    const unsubscribe = onValue(voteRef, (snapshot) => {
      const data = snapshot.val();
      setVotes({
        smash: data?.smash ?? 0,
        pass:  data?.pass  ?? 0,
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [characterId]);

  return { votes, loading };
}

// ---------------------------------------------------------------------------
// useAllVotes
//
// Subscribes to the entire /votes node (≈252 entries, ~10 KB).
// The Leaderboard component derives its sorted list from this in-memory map,
// so switching between "Most Smashed" / "Most Passed" is instant — no
// extra round-trips needed.
// ---------------------------------------------------------------------------

export function useAllVotes(): { allVotes: AllVotesMap; loading: boolean } {
  const [allVotes, setAllVotes] = useState<AllVotesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirebaseDatabase();
    const votesRef = ref(db, "votes");

    const unsubscribe = onValue(votesRef, (snapshot) => {
      const raw: AllVotesMap = snapshot.val() ?? {};
      // Re-key from sanitized Firebase keys back to original character IDs
      // so callers can look up by the same IDs used in the characters array.
      const remapped: AllVotesMap = {};
      for (const [key, val] of Object.entries(raw)) {
        remapped[unsanitizeFirebaseKey(key)] = val;
      }
      setAllVotes(remapped);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { allVotes, loading };
}
