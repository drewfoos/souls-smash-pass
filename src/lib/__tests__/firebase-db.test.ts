import { describe, test, expect } from "bun:test";
import { filterNewAnonVotes, computeAuthVoteDeltas } from "../firebase-db";

// These tests exercise the pure compute helpers extracted from firebase-db.ts.
// No Firebase Admin SDK or network calls are involved.
//
// Valid character IDs come from the real characters list so isValidCharacterId
// passes without mocking.
const RANNI   = "er_ranni";
const MELINA  = "er_melina";
const MALENIA = "er_malenia";
const RADAHN  = "er_radahn";

// ---------------------------------------------------------------------------
// Test 1 — anonymous duplicate vote
// ---------------------------------------------------------------------------

describe("filterNewAnonVotes — anonymous duplicate vote", () => {
  test("includes characters not yet in the session", () => {
    const existing = {};
    const result = filterNewAnonVotes(existing, [
      { characterId: RANNI,  action: "smash" },
      { characterId: MELINA, action: "pass"  },
    ]);
    expect(result).toHaveLength(2);
  });

  test("skips characters already voted on in this session", () => {
    // 'er_ranni' was previously voted — its sanitized key is the same string
    const existing: Record<string, unknown> = { er_ranni: "smash" };
    const result = filterNewAnonVotes(existing, [
      { characterId: RANNI,  action: "smash" }, // duplicate — should be skipped
      { characterId: MELINA, action: "pass"  }, // new — should be included
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].characterId).toBe(MELINA);
  });

  test("skips the entire batch when all characters were already voted on", () => {
    const existing: Record<string, unknown> = {
      er_ranni:  "smash",
      er_melina: "pass",
    };
    const result = filterNewAnonVotes(existing, [
      { characterId: RANNI,  action: "smash" },
      { characterId: MELINA, action: "pass"  },
    ]);
    expect(result).toHaveLength(0);
  });

  test("skips characters with an invalid ID", () => {
    const result = filterNewAnonVotes({}, [
      { characterId: "not_a_real_char", action: "smash" },
      { characterId: RANNI,             action: "pass"  },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].characterId).toBe(RANNI);
  });

  test("_lastSeen key in existing does not cause false-positive skip", () => {
    // Firebase session nodes contain a _lastSeen timestamp alongside vote keys.
    // It must not prevent a character whose sanitized ID happens to not be
    // '_lastSeen' from being counted.
    const existing: Record<string, unknown> = { _lastSeen: 1710000000000 };
    const result = filterNewAnonVotes(existing, [
      { characterId: RANNI, action: "smash" },
    ]);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — authenticated repeat-vote (same action)
// ---------------------------------------------------------------------------

describe("computeAuthVoteDeltas — authenticated repeat-vote", () => {
  test("returns changed=0 when all votes match existing state", () => {
    const prev = { er_ranni: "smash" as const, er_melina: "pass" as const };
    const { changed, deltas } = computeAuthVoteDeltas(prev, [
      { characterId: RANNI,  action: "smash" }, // same as existing
      { characterId: MELINA, action: "pass"  }, // same as existing
    ]);
    expect(changed).toBe(0);
    expect(Object.keys(deltas)).toHaveLength(0);
  });

  test("counts only the genuinely new votes in a mixed batch", () => {
    const prev = { er_ranni: "smash" as const };
    const { changed } = computeAuthVoteDeltas(prev, [
      { characterId: RANNI,  action: "smash" }, // repeat — skip
      { characterId: MELINA, action: "pass"  }, // new — count
    ]);
    expect(changed).toBe(1);
  });

  test("skips characters with invalid IDs", () => {
    const { changed } = computeAuthVoteDeltas({}, [
      { characterId: "bogus_char", action: "smash" },
    ]);
    expect(changed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — authenticated vote-switch
// ---------------------------------------------------------------------------

describe("computeAuthVoteDeltas — authenticated vote-switch", () => {
  test("applies -1/+1 delta when switching from smash to pass", () => {
    const prev = { er_ranni: "smash" as const };
    const { deltas, changed } = computeAuthVoteDeltas(prev, [
      { characterId: RANNI, action: "pass" }, // switch
    ]);
    expect(changed).toBe(1);
    expect(deltas[RANNI]).toEqual({ smash: -1, pass: 1 });
  });

  test("applies -1/+1 delta when switching from pass to smash", () => {
    const prev = { er_malenia: "pass" as const };
    const { deltas, changed } = computeAuthVoteDeltas(prev, [
      { characterId: MALENIA, action: "smash" }, // switch
    ]);
    expect(changed).toBe(1);
    expect(deltas[MALENIA]).toEqual({ smash: 1, pass: -1 });
  });

  test("applies +1 delta for a first-time vote with no prior state", () => {
    const { deltas, changed } = computeAuthVoteDeltas({}, [
      { characterId: RADAHN, action: "smash" },
    ]);
    expect(changed).toBe(1);
    expect(deltas[RADAHN]).toEqual({ smash: 1, pass: 0 });
  });

  test("handles a batch with a mix of new, repeat, and switch votes", () => {
    const prev = {
      er_ranni:   "smash" as const, // will repeat
      er_melina:  "pass"  as const, // will switch
    };
    const { deltas, changed } = computeAuthVoteDeltas(prev, [
      { characterId: RANNI,   action: "smash" }, // repeat → skip
      { characterId: MELINA,  action: "smash" }, // switch pass→smash
      { characterId: RADAHN,  action: "pass"  }, // first-time
    ]);
    expect(changed).toBe(2);
    expect(deltas[RANNI]).toBeUndefined();
    expect(deltas[MELINA]).toEqual({ smash: 1, pass: -1 });
    expect(deltas[RADAHN]).toEqual({ smash: 0, pass: 1 });
  });

  test("writes to newUserVotes with sanitized key", () => {
    const { newUserVotes } = computeAuthVoteDeltas({}, [
      { characterId: RANNI, action: "smash" },
    ]);
    // er_ranni has no forbidden chars, so sanitized key === raw key
    expect(newUserVotes["er_ranni"]).toBe("smash");
  });
});
