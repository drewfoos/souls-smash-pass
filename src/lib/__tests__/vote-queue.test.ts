import { describe, test, expect } from "bun:test";
import { VoteQueue, runConfigsMatch, type RunConfig } from "../vote-queue";

// ---------------------------------------------------------------------------
// runConfigsMatch
// ---------------------------------------------------------------------------

describe("runConfigsMatch", () => {
  const base: RunConfig = { seed: 1, selectedGames: ["ER"], selectedTypes: ["boss"] };

  test("returns true for identical configs", () => {
    expect(runConfigsMatch(base, { seed: 1, selectedGames: ["ER"], selectedTypes: ["boss"] })).toBe(true);
  });

  test("returns false when seed differs", () => {
    expect(runConfigsMatch(base, { ...base, seed: 2 })).toBe(false);
  });

  test("returns false when game list differs", () => {
    expect(runConfigsMatch(base, { ...base, selectedGames: [] })).toBe(false);
  });

  test("treats null and undefined selectedGames as equal", () => {
    expect(runConfigsMatch(
      { seed: 1, selectedGames: null, selectedTypes: null },
      { seed: 1, selectedGames: undefined, selectedTypes: undefined }
    )).toBe(true);
  });

  test("returns false when type list differs", () => {
    expect(runConfigsMatch(base, { ...base, selectedTypes: ["npc"] })).toBe(false);
  });

  test("returns false when type list has different length", () => {
    expect(runConfigsMatch(base, { ...base, selectedTypes: ["boss", "npc"] })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VoteQueue — test 4: filter-change mid-buffer
// ---------------------------------------------------------------------------

describe("VoteQueue — filter-change mid-buffer", () => {
  const rc1: RunConfig = { seed: 1, selectedGames: ["ER"], selectedTypes: null };
  const rc2: RunConfig = { seed: 2, selectedGames: ["ER"], selectedTypes: null };

  test("flushes old batch when runConfig changes, starts fresh batch", () => {
    const q = new VoteQueue(5);

    // Queue 3 votes under rc1 — no flush yet (batch not full)
    expect(q.enqueue("er_ranni",   "smash", rc1)).toBeNull();
    expect(q.enqueue("er_melina",  "pass",  rc1)).toBeNull();
    expect(q.enqueue("er_malenia", "smash", rc1)).toBeNull();
    expect(q.frontier).toBe(3);

    // Queue a vote under rc2 — should return the old rc1 batch immediately
    const flushed = q.enqueue("er_radahn", "pass", rc2);
    expect(flushed).not.toBeNull();
    expect(flushed!.votes).toHaveLength(3);
    expect(flushed!.runConfig).toEqual(rc1);
    expect(flushed!.currentIndex).toBe(3);

    // The new vote is now in a fresh rc2 batch
    expect(q.frontier).toBe(4);
    const pending = q.getPending();
    expect(pending).not.toBeNull();
    expect(pending!.votes).toHaveLength(1);
    expect(pending!.votes[0].characterId).toBe("er_radahn");
    expect(pending!.runConfig).toEqual(rc2);
    expect(pending!.currentIndex).toBe(4);
  });

  test("new batch after config flush captures correct frontier", () => {
    const q = new VoteQueue(5);
    q.enqueue("er_ranni", "smash", rc1); // frontier = 1
    q.enqueue("er_melina", "pass", rc1); // frontier = 2

    // Config change
    const old = q.enqueue("er_malenia", "smash", rc2); // frontier = 3
    expect(old!.currentIndex).toBe(2);   // old batch ended at frontier 2
    expect(q.frontier).toBe(3);
    expect(q.getPending()!.currentIndex).toBe(3); // new batch at frontier 3
  });
});

// ---------------------------------------------------------------------------
// VoteQueue — test 5: reset during debounce
// ---------------------------------------------------------------------------

describe("VoteQueue — reset during debounce", () => {
  const rc: RunConfig = { seed: 42, selectedGames: null, selectedTypes: null };

  test("reset() clears pending batch and zeroes frontier", () => {
    const q = new VoteQueue(5);
    q.enqueue("er_ranni",  "smash", rc);
    q.enqueue("er_melina", "pass",  rc);
    expect(q.getPending()).not.toBeNull();
    expect(q.frontier).toBe(2);

    q.reset();

    expect(q.getPending()).toBeNull();
    expect(q.frontier).toBe(0);
  });

  test("after reset, fresh votes start a new batch from frontier 0", () => {
    const q = new VoteQueue(5);
    q.enqueue("er_ranni", "smash", rc);
    q.reset();
    q.enqueue("er_melina", "pass", rc);

    const pending = q.getPending();
    expect(pending).not.toBeNull();
    expect(pending!.votes[0].characterId).toBe("er_melina");
    expect(pending!.currentIndex).toBe(1);
    expect(q.frontier).toBe(1);
  });

  test("setFrontier() preserves the new frontier and discards stale batch", () => {
    const q = new VoteQueue(5);
    q.enqueue("er_ranni", "smash", rc); // frontier = 1

    q.setFrontier(50); // simulate restore from saved position

    expect(q.getPending()).toBeNull();
    expect(q.frontier).toBe(50);

    // Next vote should continue from 50
    q.enqueue("er_melina", "pass", rc);
    expect(q.frontier).toBe(51);
    expect(q.getPending()!.currentIndex).toBe(51);
  });
});

// ---------------------------------------------------------------------------
// VoteQueue — batch-full flush
// ---------------------------------------------------------------------------

describe("VoteQueue — batch-full flush", () => {
  const rc: RunConfig = { seed: 1, selectedGames: null, selectedTypes: null };

  test("returns null for votes 1–(batchSize-1), returns full batch on vote batchSize", () => {
    const q = new VoteQueue(3);
    const chars = ["er_ranni", "er_melina", "er_malenia"];

    expect(q.enqueue(chars[0], "smash", rc)).toBeNull();
    expect(q.enqueue(chars[1], "pass",  rc)).toBeNull();
    const full = q.enqueue(chars[2], "smash", rc);

    expect(full).not.toBeNull();
    expect(full!.votes).toHaveLength(3);
    expect(full!.currentIndex).toBe(3);
    expect(q.getPending()).toBeNull(); // queue is empty after flush
  });
});
