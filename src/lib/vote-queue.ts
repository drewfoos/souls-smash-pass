// Vote queue — pure state machine for batching client-side votes.
//
// No React, no timers, no network. GameContext wraps this with refs, a
// debounce timer, and the actual fetch. Keeping the two concerns separate
// makes the queue logic independently testable.

export type SwipeAction = "smash" | "pass";

export interface RunConfig {
  seed: number;
  selectedGames?: string[] | null;
  selectedTypes?: string[] | null;
}

export interface PendingBatch {
  votes: Array<{ characterId: string; action: SwipeAction }>;
  /** runConfig snapshot taken when the batch was opened — never recomputed. */
  runConfig: RunConfig;
  /** Deck frontier (total votes queued this run) after all votes in this batch. */
  currentIndex: number;
}

// ---------------------------------------------------------------------------
// runConfigsMatch
// ---------------------------------------------------------------------------

/** Structural equality for RunConfig. Avoids JSON.stringify fragility. */
export function runConfigsMatch(a: RunConfig, b: RunConfig): boolean {
  if (a.seed !== b.seed) return false;

  const gamesA = a.selectedGames ?? null;
  const gamesB = b.selectedGames ?? null;
  if (gamesA !== gamesB) {
    if (!gamesA || !gamesB || gamesA.length !== gamesB.length) return false;
    for (let i = 0; i < gamesA.length; i++) if (gamesA[i] !== gamesB[i]) return false;
  }

  const typesA = a.selectedTypes ?? null;
  const typesB = b.selectedTypes ?? null;
  if (typesA !== typesB) {
    if (!typesA || !typesB || typesA.length !== typesB.length) return false;
    for (let i = 0; i < typesA.length; i++) if (typesA[i] !== typesB[i]) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// VoteQueue
// ---------------------------------------------------------------------------

export class VoteQueue {
  private batch: PendingBatch | null = null;
  private _frontier = 0;

  constructor(readonly batchSize: number) {}

  get frontier(): number {
    return this._frontier;
  }

  /**
   * Add a vote to the pending batch.
   *
   * Returns a batch that must be sent immediately when:
   *   - The incoming runConfig differs from the current batch's config.
   *     The OLD batch is returned so it can be flushed under its original config.
   *     A new batch is opened for the incoming vote.
   *   - The batch reaches batchSize after adding this vote.
   *     The FULL batch is returned.
   *
   * Returns null when the vote was buffered and the batch is not yet full.
   */
  enqueue(
    characterId: string,
    action: SwipeAction,
    runConfig: RunConfig
  ): PendingBatch | null {
    // Config mismatch — flush the old batch and start fresh.
    let immediateFlush: PendingBatch | null = null;
    if (this.batch && !runConfigsMatch(this.batch.runConfig, runConfig)) {
      immediateFlush = this.takeBatch(); // clears this.batch synchronously
    }

    this._frontier++;

    if (!this.batch) {
      this.batch = { votes: [], runConfig, currentIndex: this._frontier };
    }

    this.batch.votes.push({ characterId, action });
    this.batch.currentIndex = this._frontier;

    // Config-change case: return the old batch. New batch has 1 vote — can't be full.
    if (immediateFlush) return immediateFlush;

    // Full-batch case.
    if (this.batch.votes.length >= this.batchSize) {
      return this.takeBatch();
    }

    return null;
  }

  /** Take and return the current batch, leaving the queue empty. */
  flush(): PendingBatch | null {
    return this.takeBatch();
  }

  /**
   * Discard the pending batch and reset the frontier to zero.
   * Called on hard reset (new game started from scratch).
   */
  reset(): void {
    this.batch = null;
    this._frontier = 0;
  }

  /**
   * Set the frontier to a known position and discard any pending batch.
   * Called when restoring from localStorage or Firebase — the restored position
   * is authoritative and any buffered votes from before the restore are stale.
   */
  setFrontier(n: number): void {
    this._frontier = n;
    this.batch = null;
  }

  getPending(): PendingBatch | null {
    return this.batch;
  }

  private takeBatch(): PendingBatch | null {
    const b = this.batch;
    this.batch = null;
    return b;
  }
}
