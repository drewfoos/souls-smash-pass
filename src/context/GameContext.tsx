"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  characters,
  characterById,
  shuffleWithSeed,
  getWeeklySeed,
  type Character,
  type Game,
  type CharacterType,
} from "@/data/characters";
import { getIdToken } from "firebase/auth";
import { useAuth } from "./AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  saveUserProfile,
  getUserData,
  getUserMeta,
  incrementReplayCount,
  type VoteChoice,
  type RunConfig,
} from "@/lib/firebase-user";
import { VoteQueue, type PendingBatch } from "@/lib/vote-queue";
import { generateIdempotencyKey } from "@/lib/idempotency-key";
import toast from "react-hot-toast";

export type SwipeAction = "smash" | "pass";

interface HistoryEntry {
  character: Character;
  action: SwipeAction;
}

// ---------------------------------------------------------------------------
// Game state — viewingIndex is where the user is *looking*, currentIndex is
// the frontier (lowest unvoted index).  With a viewFilter active, viewingIndex
// can exceed currentIndex because filter-voting skips non-matching characters.
// ---------------------------------------------------------------------------

interface GameState {
  deck: Character[];
  currentIndex: number;
  viewingIndex: number;
  history: HistoryEntry[];
  gameActive: boolean;
  gameComplete: boolean;
  selectedGames: Game[] | null;
  selectedTypes: CharacterType[] | null;
  /** The seed used to shuffle the deck. Stored so Firebase restore can rebuild the exact order. */
  seed: number;
  /**
   * Live view filter — a non-destructive lens on the deck.
   * When set, swipe/navigation skip characters whose type doesn't match.
   * null = show all characters in the deck.
   */
  viewFilter: CharacterType[] | null;
}

type GameAction =
  | { type: "START_GAME"; payload?: { games?: Game[]; types?: CharacterType[]; seed?: number; pool?: Character[] } }
  | { type: "SWIPE"; payload: { action: SwipeAction } }
  | { type: "END_GAME" }
  | { type: "NAVIGATE"; payload: { index: number } }
  | { type: "RESTORE"; payload: GameState }
  | { type: "SET_VIEW_FILTER"; payload: { types: CharacterType[] | null } }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// localStorage helpers
//
// Mirrors pokesmash's dual-key approach:
//   LS_SCORE_KEY   — progress saved while signed in
//   LS_OFFLINE_KEY — progress saved while signed out
//
// On sign-in we compare both sources (plus Firebase) and use the furthest
// ahead. On sign-out we migrate score → offlineScore so anonymous play after
// logging out doesn't lose the user's position.
// ---------------------------------------------------------------------------

const LS_SCORE_KEY   = "souls-sop:score";       // signed-in progress
const LS_OFFLINE_KEY = "souls-sop:offlineScore"; // anonymous progress
const LS_LEGACY_KEY  = "souls-sop:progress";     // migration from old single key

interface SavedProgress {
  deckIds: string[];
  currentIndex: number;
  viewingIndex: number;
  history: Array<{ charId: string; action: VoteChoice }>;
  selectedGames: Game[] | null;
  selectedTypes: CharacterType[] | null;
  seed?: number;
  viewFilter?: CharacterType[] | null;
}

function saveProgress(s: GameState, key: string): void {
  if (typeof window === "undefined") return;
  if (!s.gameActive && !s.gameComplete) return;
  try {
    const progress: SavedProgress = {
      deckIds: s.deck.map((c) => c.id),
      currentIndex: s.currentIndex,
      viewingIndex: s.viewingIndex,
      history: s.history.map((h) => ({ charId: h.character.id, action: h.action })),
      selectedGames: s.selectedGames,
      selectedTypes: s.selectedTypes,
      seed: s.seed,
      viewFilter: s.viewFilter,
    };
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    /* storage full or blocked — ignore */
  }
}

function clearProgress(key?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      // Clear all known progress keys
      localStorage.removeItem(LS_SCORE_KEY);
      localStorage.removeItem(LS_OFFLINE_KEY);
      localStorage.removeItem(LS_LEGACY_KEY);
    }
  } catch {
    /* ignore */
  }
}

function loadProgress(key: string): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved: SavedProgress = JSON.parse(raw);

    const deck = saved.deckIds
      .map((id) => characterById.get(id))
      .filter((c): c is Character => Boolean(c));
    if (deck.length === 0) return null;

    const history: HistoryEntry[] = saved.history
      .map(({ charId, action }) => {
        const character = characterById.get(charId);
        return character ? { character, action } : null;
      })
      .filter((h): h is HistoryEntry => h !== null);

    const currentIndex = Math.min(saved.currentIndex, deck.length);
    // Don't clamp to currentIndex — with filter-based voting, viewingIndex
    // can legitimately be beyond currentIndex (filter skipped non-matching chars).
    const viewingIndex = Math.min(saved.viewingIndex ?? currentIndex, deck.length);

    return {
      deck,
      currentIndex,
      viewingIndex,
      history,
      gameActive: currentIndex < deck.length,
      gameComplete: currentIndex >= deck.length,
      selectedGames: saved.selectedGames ?? null,
      selectedTypes: saved.selectedTypes ?? null,
      seed: saved.seed ?? 0,
      viewFilter: saved.viewFilter ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Loads the best available local progress by checking all three LS keys and
 * returning whichever has the most votes cast (history.length). Using history
 * length instead of currentIndex avoids the pitfall where a small deck with a
 * high index (e.g. 15/20) would lose to a large deck with a slightly higher
 * index (e.g. 16/100) despite having more meaningful progress.
 */
function loadBestProgress(): { state: GameState | null; key: string } {
  const candidates = [
    { state: loadProgress(LS_SCORE_KEY),   key: LS_SCORE_KEY },
    { state: loadProgress(LS_OFFLINE_KEY), key: LS_OFFLINE_KEY },
    { state: loadProgress(LS_LEGACY_KEY),  key: LS_LEGACY_KEY },
  ].filter((c): c is { state: GameState; key: string } => c.state !== null);

  if (candidates.length === 0) return { state: null, key: LS_OFFLINE_KEY };

  return candidates.reduce((best, c) =>
    c.state.history.length > best.state.history.length ? c : best
  );
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const initialState: GameState = {
  deck: [],
  currentIndex: 0,
  viewingIndex: 0,
  history: [],
  gameActive: false,
  gameComplete: false,
  selectedGames: null,
  selectedTypes: null,
  seed: 0,
  viewFilter: null,
};

// ---------------------------------------------------------------------------
// Helpers — find the next/previous deck index matching a view filter
// ---------------------------------------------------------------------------

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const games = action.payload?.games ?? null;
      const types = action.payload?.types ?? null;
      const seed = action.payload?.seed ?? getWeeklySeed();
      // pool is pre-filtered by startGame — reducer just shuffles it.
      const pool = action.payload?.pool ?? [];

      if (pool.length === 0) return state;

      const deck = shuffleWithSeed(pool, seed);
      return {
        ...state,
        deck,
        currentIndex: 0,
        viewingIndex: 0,
        history: [],
        gameActive: true,
        gameComplete: false,
        selectedGames: games,
        selectedTypes: types,
        seed,
        viewFilter: null, // reset view filter on new game
      };
    }

    case "SWIPE": {
      // The character being voted on is at viewingIndex. Without a filter this
      // equals currentIndex. With a viewFilter it may be ahead (skipped non-
      // matching characters) — those skipped characters stay unvoted.
      const votedIdx = state.viewingIndex;
      if (votedIdx >= state.deck.length) return state;
      const character = state.deck[votedIdx];
      const newHistory = [...state.history, { character, action: action.payload.action }];

      // Build a set of voted character IDs (including the one just voted on)
      const votedIds = new Set(newHistory.map((h) => h.character.id));

      // Advance currentIndex past any already-voted characters. This handles
      // both the normal case (voted on currentIndex, bump by 1) and the filter
      // case (voted ahead, but currentIndex might now point at a char that was
      // voted on in a previous filter pass).
      let newCurrentIndex = state.currentIndex;
      while (newCurrentIndex < state.deck.length && votedIds.has(state.deck[newCurrentIndex].id)) {
        newCurrentIndex++;
      }

      const complete = newCurrentIndex >= state.deck.length;

      // After voting, jump viewingIndex to the next unvoted character matching
      // the view filter.
      let nextView = votedIdx + 1;
      while (nextView < state.deck.length) {
        const c = state.deck[nextView];
        const matchesFilter = !state.viewFilter || state.viewFilter.length === 0 || state.viewFilter.includes(c.type);
        if (matchesFilter && !votedIds.has(c.id)) break;
        nextView++;
      }

      // If no unvoted matching character exists (filter exhausted), stay on the
      // character we just voted on so the UI can show a "category complete" state
      // instead of going blank.
      const filterExhausted = nextView >= state.deck.length && state.viewFilter && state.viewFilter.length > 0 && !complete;
      const finalView = filterExhausted ? votedIdx : Math.min(nextView, state.deck.length);

      return {
        ...state,
        currentIndex: newCurrentIndex,
        viewingIndex: finalView,
        history: newHistory,
        gameComplete: complete,
        gameActive: !complete,
      };
    }

    case "END_GAME": {
      return {
        ...state,
        gameActive: false,
        gameComplete: true,
      };
    }

    case "NAVIGATE": {
      const { index } = action.payload;
      if (index < 0 || index >= state.deck.length) return state;
      // Allow navigating to any position that is either:
      // 1. Already voted (history browsing)
      // 2. The next unvoted character in the filtered view (frontier)
      // The navigation functions enforce these constraints before dispatching.
      return { ...state, viewingIndex: index };
    }

    case "SET_VIEW_FILTER": {
      const newFilter = action.payload.types;
      const votedIds = new Set(state.history.map((h) => h.character.id));

      // Find the next unvoted character matching the new filter, scanning
      // from the start of unvoted territory (currentIndex) forward, then
      // also before currentIndex (out-of-order voting can leave gaps).
      let targetView = -1;
      for (let i = state.currentIndex; i < state.deck.length; i++) {
        const c = state.deck[i];
        const matchesFilter = !newFilter || newFilter.length === 0 || newFilter.includes(c.type);
        if (matchesFilter && !votedIds.has(c.id)) {
          targetView = i;
          break;
        }
      }
      if (targetView === -1) {
        // Scan before currentIndex for unvoted matching characters (gaps
        // left by out-of-order filter voting).
        for (let i = 0; i < state.currentIndex; i++) {
          const c = state.deck[i];
          const matchesFilter = !newFilter || newFilter.length === 0 || newFilter.includes(c.type);
          if (matchesFilter && !votedIds.has(c.id)) {
            targetView = i;
            break;
          }
        }
      }
      if (targetView === -1) {
        // All matching characters voted. Find the last voted matching
        // character so the UI shows something relevant rather than parking
        // on a non-matching character at currentIndex.
        for (let i = state.deck.length - 1; i >= 0; i--) {
          const c = state.deck[i];
          const matchesFilter = !newFilter || newFilter.length === 0 || newFilter.includes(c.type);
          if (matchesFilter && votedIds.has(c.id)) {
            targetView = i;
            break;
          }
        }
        // Absolute fallback — park at currentIndex (deck end or unfiltered)
        if (targetView === -1) targetView = state.currentIndex;
      }

      return {
        ...state,
        viewFilter: newFilter,
        viewingIndex: targetView,
      };
    }

    case "RESTORE": {
      // Hydrates state from localStorage or Firebase after the initial server render.
      // Must be a separate action (not lazy init) to avoid SSR/CSR mismatch.
      return action.payload;
    }

    case "RESET": {
      return initialState;
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context value shape
// ---------------------------------------------------------------------------

type VoteCounts = Record<string, { smash: number; pass: number }>;

interface GameContextValue {
  state: GameState;
  currentCharacter: Character | null;
  nextCharacter: Character | null;
  progress: { current: number; total: number; percent: number };
  /** Progress within the active viewFilter (same as progress when no filter). */
  filteredProgress: { current: number; total: number; percent: number; viewing: number };
  stats: {
    smashed: number;
    passed: number;
    smashedCharacters: Character[];
    passedCharacters: Character[];
  };
  voteCounts: VoteCounts;
  /** The signed-in user's most recent vote per character (from Firebase). */
  previousVotes: Record<string, VoteChoice>;
  /** True when the user is looking at the frontier (not browsing history). */
  isAtFrontier: boolean;
  /** True when a viewFilter is active and all matching characters have been voted. */
  isFilterExhausted: boolean;
  /**
   * True once the one-time localStorage restore useEffect has completed.
   * GameRouter must wait for this before deciding whether to auto-start a new
   * game, otherwise it races with the restore and calls startGame() (which
   * calls clearProgress()) before we've had a chance to load saved progress.
   */
  hasRestored: boolean;
  startGame: (games?: Game[], types?: CharacterType[], options?: { replay?: boolean }) => void;
  /** Change the live view filter without rebuilding the deck. */
  setViewFilter: (types?: CharacterType[]) => void;
  swipe: (action: SwipeAction) => void;
  endGame: () => void;
  reset: () => void;
  navigateBack: () => void;
  navigateForward: () => void;
  /** Flush any buffered votes. Call BEFORE signOut so votes are sent with auth. */
  flushPendingVotes: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

/** Build a RunConfig from current game state for Firebase persistence. */
function buildRunConfig(state: GameState): RunConfig {
  return {
    seed: state.seed,
    selectedGames: state.selectedGames,
    selectedTypes: state.selectedTypes,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GameProvider({ children }: { children: ReactNode }) {
  // Always start with initialState so the server render and the first client
  // render match (avoiding the React hydration mismatch error).
  // localStorage is read in a useEffect after hydration instead.
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // hasRestored gates GameRouter's auto-start so it doesn't race the restore.
  // Child effects (GameRouter) run BEFORE parent effects (GameProvider) in
  // React's commit phase, which means without this flag GameRouter would see
  // gameActive:false and call startGame() — wiping localStorage — before we
  // ever get to read it here.
  const [hasRestored, setHasRestored] = useState(false);

  // Tracks whether game-complete was already true when the component mounted or
  // restored, so we don't re-show "Picks saved" on every revisit.
  const wasCompleteOnMount = useRef(false);

  // Tracks which characters the anon user has voted on (and how) across filter
  // changes. Stored as Map<charId, action> so the action can be forwarded to
  // /api/vote when the user signs in. Auth users use previousVotesRef instead.
  const anonVotedIds = useRef<Map<string, SwipeAction>>(new Map());

  // ── One-time restore from best available local progress ──────────────────
  // Runs only on the client, after the initial hydration is complete.
  // We also clean up the legacy key here so it doesn't linger.
  useEffect(() => {
    const { state: saved } = loadBestProgress();
    // Clean up legacy single-key format if present
    try { localStorage.removeItem(LS_LEGACY_KEY); } catch { /* ignore */ }
    if (saved) {
      dispatch({ type: "RESTORE", payload: saved });
      voteQueue.current.setFrontier(saved.currentIndex);
      // Seed the anon voted map so filter changes exclude already-voted chars
      // and sign-in can forward the action to the server.
      for (const h of saved.history) anonVotedIds.current.set(h.character.id, h.action);
      // Mark if the restored state was already complete so we don't re-toast.
      if (saved.gameComplete) wasCompleteOnMount.current = true;
    }
    setHasRestored(true); // signal to GameRouter that it can now decide
  }, []); // empty deps = run exactly once after mount

  const { user } = useAuth();

  // Stable ref to the current user so startGame doesn't need user as a dep.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Refs so effects can read latest values without re-subscribing ────────
  const stateRef = useRef<GameState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const historyRef = useRef<HistoryEntry[]>(state.history);
  useEffect(() => { historyRef.current = state.history; }, [state.history]);

  // ── Memoized derived values ─────────────────────────────────────────────
  // These only recompute when their deps change, not on every render.

  // The user is "at the frontier" (can vote) when viewing an unvoted character.
  // With viewFilter, the frontier may be past currentIndex (filter skipped ahead).
  const isAtFrontier = useMemo(() => {
    if (state.viewingIndex < state.currentIndex) return false; // browsing history
    // Check the character at viewingIndex hasn't already been voted on
    const viewChar = state.deck[state.viewingIndex];
    if (!viewChar) return false;
    return !state.history.some((h) => h.character.id === viewChar.id);
  }, [state.viewingIndex, state.currentIndex, state.deck, state.history]);

  // True when a filter is active and every matching character has been voted.
  const isFilterExhausted = useMemo(() => {
    const vf = state.viewFilter;
    if (!vf || vf.length === 0) return false;
    const voted = new Set(state.history.map((h) => h.character.id));
    return state.deck
      .filter((c) => vf.includes(c.type))
      .every((c) => voted.has(c.id));
  }, [state.deck, state.viewFilter, state.history]);

  const currentCharacter = useMemo(
    () =>
      (state.gameActive || state.gameComplete) && state.viewingIndex < state.deck.length
        ? state.deck[state.viewingIndex]
        : null,
    [state.gameActive, state.gameComplete, state.viewingIndex, state.deck]
  );

  const nextCharacter = useMemo(
    () => {
      if (!state.gameActive) return null;
      const voted = new Set(state.history.map((h) => h.character.id));
      const filter = state.viewFilter;
      for (let i = state.viewingIndex + 1; i < state.deck.length; i++) {
        const c = state.deck[i];
        if (filter && filter.length > 0 && !filter.includes(c.type)) continue;
        if (!voted.has(c.id)) return c;
      }
      return null;
    },
    [state.gameActive, state.viewingIndex, state.deck, state.viewFilter, state.history]
  );

  const progress = useMemo(
    () => ({
      current: state.currentIndex,
      total: state.deck.length,
      percent:
        state.deck.length > 0
          ? Math.round((state.currentIndex / state.deck.length) * 100)
          : 0,
      // 1-indexed position within the deck for display
      viewing: state.viewingIndex + 1,
    }),
    [state.currentIndex, state.viewingIndex, state.deck.length]
  );

  // Filtered progress — counts only characters matching the viewFilter.
  // `viewing` is the 1-indexed ordinal of viewingIndex within the filtered subset.
  const filteredProgress = useMemo(() => {
    const vf = state.viewFilter;
    if (!vf || vf.length === 0) return progress;
    let filteredTotal = 0;
    let filteredVoted = 0;
    let viewingOrdinal = 0;
    const voted = new Set(state.history.map((h) => h.character.id));
    for (let i = 0; i < state.deck.length; i++) {
      const c = state.deck[i];
      if (vf.includes(c.type)) {
        filteredTotal++;
        if (voted.has(c.id)) filteredVoted++;
        if (i <= state.viewingIndex) viewingOrdinal = filteredTotal;
      }
    }
    return {
      current: filteredVoted,
      total: filteredTotal,
      percent: filteredTotal > 0 ? Math.round((filteredVoted / filteredTotal) * 100) : 0,
      viewing: viewingOrdinal,
    };
  }, [state.deck, state.viewingIndex, state.history, state.viewFilter, progress]);

  // Single-pass stats — replaces four separate filter/map passes.
  const stats = useMemo(() => {
    const smashedCharacters: Character[] = [];
    const passedCharacters: Character[] = [];
    for (const h of state.history) {
      if (h.action === "smash") smashedCharacters.push(h.character);
      else passedCharacters.push(h.character);
    }
    return {
      smashed: smashedCharacters.length,
      passed: passedCharacters.length,
      smashedCharacters,
      passedCharacters,
    };
  }, [state.history]);

  // ── Persist state to localStorage on meaningful changes ──────────────────
  // Only triggers when deck, progress, or history change — NOT on pure
  // navigation (viewingIndex) changes, which would write on every arrow press.
  // Note: viewingIndex IS included in the saved snapshot (via saveProgress),
  // but its value only updates when piggybacking on another meaningful save.
  // This means the restored viewingIndex may lag behind the user's last
  // browsed position — an acceptable tradeoff vs. writing on every arrow press.
  useEffect(() => {
    const key = user ? LS_SCORE_KEY : LS_OFFLINE_KEY;
    saveProgress(state, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.deck, state.currentIndex, state.history, state.selectedGames, state.selectedTypes, state.seed, state.viewFilter, user]);

  // ── Sign-out migration: score → offlineScore ─────────────────────────────
  // When the user logs out, carry their signed-in progress forward to the
  // offline key so anonymous play continues from where they left off.
  const prevUserRef = useRef<typeof user>(null);
  useEffect(() => {
    const wasSignedIn = Boolean(prevUserRef.current);
    const isSignedIn = Boolean(user);

    if (wasSignedIn && !isSignedIn) {
      // Safety-net flush — by this point auth.currentUser is already null, so
      // these votes will be sent anonymously. The primary flush happens in
      // handleSignOut (via flushPendingVotes) BEFORE signOut() is called.
      // This fallback catches edge cases where signOut is triggered externally.
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      const pendingBatch = voteQueue.current.flush();
      if (pendingBatch) sendBatch(pendingBatch);

      // Just signed out — migrate LS_SCORE_KEY → LS_OFFLINE_KEY
      try {
        const scoreData = localStorage.getItem(LS_SCORE_KEY);
        if (scoreData) {
          localStorage.setItem(LS_OFFLINE_KEY, scoreData);
          localStorage.removeItem(LS_SCORE_KEY);
        }
      } catch { /* ignore */ }
      // Carry Firebase vote history into the anon map so filter changes after
      // sign-out still exclude characters the user already voted on.
      for (const [id, action] of Object.entries(previousVotesRef.current)) {
        anonVotedIds.current.set(id, action as SwipeAction);
      }
    }

    prevUserRef.current = user;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sendBatch is stable via ref; re-running on it would cause loops
  }, [user]);

  // ── Vote counts cache (populated from batch vote API responses) ──────────
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});

  // ── Previous votes — loaded from Firebase when user signs in ─────────────
  // Used to compute net deltas so vote-switching adjusts counts correctly.
  const previousVotesRef = useRef<Record<string, VoteChoice>>({});
  const previousVoteIdsRef = useRef<Set<string>>(new Set());
  const [previousVotes, setPreviousVotes] = useState<Record<string, VoteChoice>>({});

  // Single helper so every write to previousVotesRef also updates previousVoteIdsRef.
  // Both refs are stable; setPreviousVotes is a stable React setter — safe to call
  // from anywhere without adding this helper to dependency arrays.
  const syncPreviousVotes = useCallback((votes: Record<string, VoteChoice>) => {
    previousVotesRef.current = votes;
    previousVoteIdsRef.current = new Set(Object.keys(votes));
    setPreviousVotes(votes);
  }, []);

  // ── Shared restore helper ─────────────────────────────────────────────────
  // Both the sign-in effect and the tab-focus effect need to rebuild local
  // state from Firebase data. This helper deduplicates that logic.
  //
  // Uses the run config (seed + filters) stored in Firebase to reconstruct
  // the exact deck order. Falls back to local deck if available, then to
  // the current weekly seed with no filters as a last resort.
  const restoreFromFirebase = useCallback(
    (
      fbVotes: Record<string, VoteChoice>,
      fbCurrentId: number,
      fbRunConfig?: RunConfig | null,
    ) => {
      const currentState = stateRef.current;

      // Determine deck: prefer local (already correct), then reconstruct
      // from Firebase run config, then fall back to weekly seed.
      let deck: Character[];
      let selectedGames: Game[] | null;
      let selectedTypes: CharacterType[] | null;
      let seed: number;

      // Use the local deck only if it matches Firebase's run (same seed).
      // If the seeds differ, the local deck is from a different run (e.g.
      // user started playing anonymously on a new device) and the Firebase
      // pointer would index into the wrong deck order — skipping characters.
      const localMatchesFirebase =
        currentState.deck.length > 0 &&
        (!fbRunConfig || fbRunConfig.seed === undefined || currentState.seed === fbRunConfig.seed);

      if (localMatchesFirebase) {
        // Local deck exists and matches Firebase's run — use it
        deck = currentState.deck;
        selectedGames = currentState.selectedGames;
        selectedTypes = currentState.selectedTypes;
        seed = currentState.seed;
      } else if (fbRunConfig && fbRunConfig.seed !== undefined) {
        // Reconstruct from Firebase run config (cross-device restore)
        seed = fbRunConfig.seed;
        selectedGames = (fbRunConfig.selectedGames ?? null) as Game[] | null;
        selectedTypes = (fbRunConfig.selectedTypes ?? null) as CharacterType[] | null;
        let pool = characters;
        if (selectedGames && selectedGames.length > 0)
          pool = pool.filter((c) => selectedGames!.includes(c.game));
        if (selectedTypes && selectedTypes.length > 0)
          pool = pool.filter((c) => selectedTypes!.includes(c.type));
        deck = shuffleWithSeed(pool, seed);
      } else {
        // Last resort — no run config stored (legacy data)
        seed = getWeeklySeed();
        selectedGames = null;
        selectedTypes = null;
        deck = shuffleWithSeed(characters, seed);
      }

      const newHistory: HistoryEntry[] = [];
      const newCurrentIndex = Math.min(fbCurrentId, deck.length);

      // Rebuild history from positions 0..currentIndex (the contiguous frontier)
      for (let i = 0; i < newCurrentIndex; i++) {
        const char = deck[i];
        const vote = fbVotes[char.id];
        if (vote) newHistory.push({ character: char, action: vote });
      }
      // Also pick up out-of-order votes beyond currentIndex (cast via view
      // filters that skipped non-matching characters). Without this, those
      // votes are silently dropped from the restored history.
      const restoredIds = new Set(newHistory.map((h) => h.character.id));
      for (let i = newCurrentIndex; i < deck.length; i++) {
        const char = deck[i];
        const vote = fbVotes[char.id];
        if (vote && !restoredIds.has(char.id)) {
          newHistory.push({ character: char, action: vote });
        }
      }

      voteQueue.current.setFrontier(newCurrentIndex);
      dispatch({
        type: "RESTORE",
        payload: {
          deck,
          currentIndex: newCurrentIndex,
          viewingIndex: newCurrentIndex,
          history: newHistory,
          gameActive: newCurrentIndex < deck.length,
          gameComplete: newCurrentIndex >= deck.length,
          selectedGames,
          selectedTypes,
          seed,
          viewFilter: null, // clear view filter on cross-device restore
        },
      });
    },
    [] // stateRef and voteQueue are refs — stable across renders
  );

  // ── Sign-in: fetch Firebase data, compare position, use the furthest ahead ─
  //
  // Mirrors pokesmash's sign-in flow:
  //   if (storageScore.currentId < choices.currentId) use Firebase data
  //   else keep local, sync local to Firebase
  //
  // This handles the key cross-device scenario: play 30 characters on device A
  // (signed in), then open the game on device B — Firebase currentId (30) >
  // local currentId (0), so we restore from Firebase position + votes.
  useEffect(() => {
    if (!user) {
      syncPreviousVotes({});
      return;
    }

    const localCurrentIndex = stateRef.current.currentIndex;
    const localHistory = historyRef.current;

    getUserData(user.uid)
      .then((data) => {
        const fbVotes = (data?.votes ?? {}) as Record<string, VoteChoice>;
        const fbCurrentId = data?.currentId ?? 0;

        const currentState = stateRef.current;
        // Capture at sign-in time so async callbacks below can show a toast
        // when the user signs in after already finishing a run anonymously.
        const wasGameComplete = stateRef.current.gameComplete;

        // ── Merge anonymous votes into the authenticated session ─────────────
        //
        // The user may have voted on characters before signing in. Those votes
        // live in anonVotedIds (accumulated across filter changes). We:
        //   1. Build a merged vote map: Firebase votes win on conflict.
        //   2. Send any anon votes not yet in Firebase via /api/vote.
        //   3. Clear anonVotedIds — auth map is now the source of truth.
        const anonEntries = Array.from(anonVotedIds.current.entries());
        const unsyncedAnon = anonEntries.filter(([id]) => !fbVotes[id]);

        const mergedVotes: Record<string, VoteChoice> = { ...fbVotes };
        for (const [id, action] of anonEntries) {
          if (!(id in mergedVotes)) mergedVotes[id] = action;
        }

        syncPreviousVotes(mergedVotes);
        anonVotedIds.current.clear();

        // Write/refresh profile metadata once at sign-in so display name and
        // avatar stay current without being part of the vote write path.
        saveUserProfile(user).catch(console.error);

        // Anon votes are merged into the local-ahead sync batch below (if
        // applicable), so we only need to send them separately when Firebase
        // is further ahead — in that case restoreFromFirebase replaces local
        // state and the local-ahead branch never runs.
        const sendAnonSeparately = unsyncedAnon.length > 0 && fbCurrentId > localCurrentIndex;
        if (sendAnonSeparately) {
          const idemKey = generateIdempotencyKey();
          getIdToken(user)
            .then((token) =>
              fetch("/api/vote", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                  "Idempotency-Key": idemKey,
                },
                body: JSON.stringify({
                  votes: unsyncedAnon.map(([characterId, action]) => ({ characterId, action })),
                }),
              })
            )
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.voteCounts) setVoteCounts((prev) => ({ ...prev, ...d.voteCounts }));
              if (wasGameComplete) toast.success("Picks saved", { id: "picks-saved", duration: 2500 });
            })
            .catch(console.error);
        }

        if (fbCurrentId > localCurrentIndex) {
          // ── Firebase is further ahead — restore from Firebase ─────────────
          restoreFromFirebase(fbVotes, fbCurrentId, data?.runConfig);

          // Migrate to signed-in key (Firebase was the winner)
          try { localStorage.removeItem(LS_OFFLINE_KEY); } catch { /* ignore */ }
        } else {
          // ── Local is ahead (or equal) — keep local, sync to Firebase ──────
          //
          // Route the catch-up batch through /api/vote so the server's dedup
          // and delta logic handles it correctly. This is the same path used
          // for every in-game vote — no split write path.
          if (localHistory.length > 0) {
            const hasUnsynced = localHistory.some((h) => !fbVotes[h.character.id]);
            if (hasUnsynced) {
              const rc = buildRunConfig(currentState);
              const batchVotes = localHistory.map((h) => ({
                characterId: h.character.id,
                action: h.action,
              }));
              const idemKey = generateIdempotencyKey();
              getIdToken(user)
                .then((token) =>
                  fetch("/api/vote", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`,
                      "Idempotency-Key": idemKey,
                    },
                    body: JSON.stringify({
                      votes: batchVotes,
                      currentIndex: localCurrentIndex,
                      runConfig: rc,
                    }),
                  })
                )
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                  if (d?.voteCounts) {
                    setVoteCounts((prev) => ({ ...prev, ...d.voteCounts }));
                  }
                  // Update previousVotes: merged base + local history on top.
                  const updated = { ...mergedVotes };
                  for (const h of localHistory) updated[h.character.id] = h.action;
                  syncPreviousVotes(updated);
                  if (wasGameComplete) toast.success("Picks saved", { id: "picks-saved", duration: 2500 });
                })
                .catch(console.error);
            }
          }

          // Migrate offline progress to the signed-in key
          try {
            const offlineData = localStorage.getItem(LS_OFFLINE_KEY);
            if (offlineData) {
              localStorage.setItem(LS_SCORE_KEY, offlineData);
              localStorage.removeItem(LS_OFFLINE_KEY);
            }
          } catch { /* ignore */ }
        }
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Refetch on tab focus for signed-in users ────────────────────────────
  // When a user returns to a stale tab, pull fresh data from Firebase so
  // progress, vote history, and aggregate state stay in sync across tabs.
  // Only fires for authenticated users — anonymous users have no server state.
  useEffect(() => {
    if (!user) return;

    const handleFocus = () => {
      // First do a lightweight metadata check (2 small reads) instead of
      // downloading the entire user node including all votes (~200+ entries).
      // Only fetch full data when Firebase is actually ahead of this tab.
      getUserMeta(user.uid)
        .then((meta) => {
          if (!meta) return;

          const localCurrentIndex = stateRef.current.currentIndex;

          if (meta.currentId > localCurrentIndex) {
            // Firebase is ahead — need the full vote map to restore
            return getUserData(user.uid).then((data) => {
              if (!data) return;
              const fbVotes = (data.votes ?? {}) as Record<string, VoteChoice>;
              syncPreviousVotes(fbVotes);
              restoreFromFirebase(fbVotes, data.currentId ?? 0, data.runConfig);
            });
          }
          // Firebase is not ahead — no full fetch needed
        })
        .catch(() => {
          // Silently fail — stale state is better than broken state
        });
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- restoreFromFirebase/syncPreviousVotes are stable via refs; only re-subscribe when user changes
  }, [user]);

  // ── Per-vote submission ──────────────────────────────────────────────────
  // The VoteQueue state machine manages the pending batch (votes, runConfig,
  // currentIndex). All three fields are captured at queue time — never
  // recomputed during flush — so each batch is sent with exactly the config
  // that was active when those votes were cast.
  //
  // sendBatch fires the actual fetch. flushVotes drains the queue and calls
  // sendBatch. queueVote enqueues one vote; VoteQueue.enqueue returns a batch
  // for immediate dispatch when the batch is full or the runConfig changed.
  const BATCH_SIZE = 5;
  const FLUSH_DEBOUNCE_MS = 500;

  const voteQueue = useRef(new VoteQueue(BATCH_SIZE));
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendBatch = useCallback((batch: PendingBatch): Promise<void> => {
    // Use the reducer's currentIndex (via stateRef) instead of the queue's
    // internal frontier counter, which only increments by 1 per vote and
    // diverges when filter-based voting causes currentIndex to jump.
    const votes = batch.votes;
    const runConfig = batch.runConfig;
    const currentIndex = stateRef.current.currentIndex;

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": generateIdempotencyKey(),
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;
    const tokenPromise = firebaseUser
      ? getIdToken(firebaseUser).catch(() => null)
      : Promise.resolve(null);

    return tokenPromise.then((token) => {
      if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

      const body: Record<string, unknown> = { votes };
      if (token) {
        body.currentIndex = currentIndex;
        body.runConfig = runConfig;
      }

      return fetch("/api/vote", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.voteCounts) {
            setVoteCounts((prev) => ({ ...prev, ...data.voteCounts }));
          }
        })
        .catch(() => {
          // Silently fail — local stats still work offline
        })
        .finally(() => clearTimeout(timeout));
    });
  }, []);

  const flushVotes = useCallback((): Promise<void> => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const batch = voteQueue.current.flush();
    if (!batch || batch.votes.length === 0) return Promise.resolve();
    return sendBatch(batch);
  }, [sendBatch]);

  const queueVote = useCallback(
    (characterId: string, action: SwipeAction) => {
      const rc = buildRunConfig(stateRef.current);

      // VoteQueue.enqueue returns a batch to send immediately when the batch
      // is full or the runConfig changed (old batch returned in the latter case).
      const batchToFlush = voteQueue.current.enqueue(characterId, action, rc);
      if (batchToFlush) sendBatch(batchToFlush);

      // Set or reset the debounce timer based on whether there is still a
      // pending (not-yet-full) batch after the enqueue.
      const hasPending = voteQueue.current.getPending() !== null;
      if (hasPending) {
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(() => {
          const b = voteQueue.current.flush();
          if (b) sendBatch(b);
        }, FLUSH_DEBOUNCE_MS);
      } else {
        // Batch was just fully flushed — cancel any stale timer.
        if (flushTimer.current) {
          clearTimeout(flushTimer.current);
          flushTimer.current = null;
        }
      }
    },
    [sendBatch]
  );

  // Clean up any pending debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  // ── Game actions ──────────────────────────────────────────────────────────

  const startGame = useCallback((games?: Game[], types?: CharacterType[], options?: { replay?: boolean }) => {
    const isReplay = options?.replay ?? false;

    // Build the filtered pool once. All eligibility checks happen here so the
    // reducer only has to shuffle — no second pass.
    let pool = characters;
    if (games && games.length > 0) pool = pool.filter((c) => games.includes(c.game));
    if (types && types.length > 0) pool = pool.filter((c) => types.includes(c.type));

    if (pool.length === 0) {
      toast.error("No characters match those filters!", { id: "empty-filters", duration: 3000 });
      return;
    }

    // Replay bypasses vote exclusion — the user explicitly wants to re-vote.
    // Otherwise, subtract already-voted characters in this same pass. Auth users
    // use the Firebase vote map; anon users use the in-session accumulator.
    if (!isReplay) {
      // Auth: use the pre-maintained ID set — no allocation needed.
      // Anon: anonVotedIds is a Map, so .has() is O(1) directly.
      const voted = userRef.current ? previousVoteIdsRef.current : anonVotedIds.current;
      pool = pool.filter((c) => !voted.has(c.id));
      if (pool.length === 0) {
        toast.error(
          types?.length
            ? "You already voted on everything in this category. Try a different filter or Play Again to replay."
            : "You already voted on everyone! Use Play Again to replay or Start Fresh to reset.",
          { id: "empty-filters", duration: 4000 }
        );
        return;
      }
    }

    // Cancel any pending debounce before resetting the queue so a stale flush
    // from the previous run cannot fire after the new game has started.
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    voteQueue.current.reset();
    // Clear only the active run key. The non-active key is already empty because
    // sign-in migrates offline→score and sign-out migrates score→offline before
    // any user action reaches here. When multiple run types exist, this call
    // should be scoped to the specific run type being replaced.
    clearProgress(userRef.current ? LS_SCORE_KEY : LS_OFFLINE_KEY);

    // Track replay count in Firebase so admin can distinguish NG+ from new users.
    if (isReplay && userRef.current) {
      incrementReplayCount(userRef.current).catch(console.error);
    }

    dispatch({ type: "START_GAME", payload: { games, types, seed: getWeeklySeed(), pool } });
  }, []);

  const setViewFilter = useCallback((types?: CharacterType[]) => {
    const newFilter = types && types.length > 0 ? types : null;
    dispatch({ type: "SET_VIEW_FILTER", payload: { types: newFilter } });
  }, []);

  // Swipe lock — prevents double-trigger from rapid taps before React rerenders.
  const swipeLock = useRef(false);

  const swipe = useCallback(
    (action: SwipeAction) => {
      // Read from stateRef so back-to-back calls (before React re-renders)
      // always see the latest dispatched state, not a stale closure snapshot.
      const s = stateRef.current;
      if (s.gameComplete) return;
      if (swipeLock.current) return;
      swipeLock.current = true;
      // Release after a microtask — by then React will have processed the dispatch
      // and updated currentIndex, so a second call would see the new state.
      queueMicrotask(() => { swipeLock.current = false; });

      // The displayed card is at viewingIndex (may differ from currentIndex
      // when viewFilter skips non-matching characters).
      const char = s.deck[s.viewingIndex];
      if (char) {
        queueVote(char.id, action);
        anonVotedIds.current.set(char.id, action);
      }
      dispatch({ type: "SWIPE", payload: { action } });
    },
    [queueVote]
  );

  // Build a set of voted IDs and a lookup for navigation.
  // useMemo ensures we don't rebuild on every render.
  const votedIdSet = useMemo(
    () => new Set(state.history.map((h) => h.character.id)),
    [state.history]
  );

  const navigateBack = useCallback(() => {
    if (state.viewingIndex <= 0) return;
    // Find the previous voted character matching the active filter.
    // When a filter is active, ONLY land on matching characters — never
    // fall back to non-matching types, which confuses the UI.
    const hasFilter = state.viewFilter && state.viewFilter.length > 0;
    for (let i = state.viewingIndex - 1; i >= 0; i--) {
      const c = state.deck[i];
      if (!votedIdSet.has(c.id)) continue;
      if (!hasFilter || state.viewFilter!.includes(c.type)) {
        dispatch({ type: "NAVIGATE", payload: { index: i } });
        return;
      }
    }
  }, [state.viewingIndex, state.deck, state.viewFilter, votedIdSet]);

  const navigateForward = useCallback(() => {
    // At the frontier — can't skip ahead without voting
    if (isAtFrontier && !isFilterExhausted) {
      if (!state.gameComplete) {
        const char = state.deck[state.viewingIndex];
        if (char) {
          toast(`You haven't Smashed or Passed ${char.name} yet!`, {
            id: "navigate-forward-blocked",
            icon: "⚔️",
            duration: 2500,
          });
        }
      }
      return;
    }

    // Find the next character ahead that we can land on.
    // With a filter active, only consider matching characters.
    // If the filter is exhausted (all matching voted), only land on voted ones.
    for (let i = state.viewingIndex + 1; i < state.deck.length; i++) {
      const c = state.deck[i];
      const matchesFilter = !state.viewFilter || state.viewFilter.length === 0 || state.viewFilter.includes(c.type);
      if (!matchesFilter) continue;
      if (votedIdSet.has(c.id)) {
        // Voted matching character — always safe to land on
        dispatch({ type: "NAVIGATE", payload: { index: i } });
        return;
      }
      if (!isFilterExhausted) {
        // First unvoted matching character — this is the frontier
        dispatch({ type: "NAVIGATE", payload: { index: i } });
        return;
      }
      // Filter exhausted — skip unvoted non-matching characters
    }
  }, [state.viewingIndex, state.deck, state.viewFilter, state.gameComplete, isAtFrontier, isFilterExhausted, votedIdSet]);

  // On game complete: flush any buffered votes, then update previousVotes and
  // show the "Picks saved" toast once the last batch has landed.
  //
  // No separate saveUserHistory call needed — the server already wrote every
  // vote (+ currentIndex + runConfig) atomically as part of each flush batch.
  useEffect(() => {
    if (!state.gameComplete) return;

    // If the game was already complete when we restored (e.g. revisiting the
    // site), skip the toast — it was shown the first time they finished.
    if (wasCompleteOnMount.current) {
      wasCompleteOnMount.current = false; // allow future completions to toast
      return;
    }

    flushVotes().then(() => {
      if (user && state.history.length > 0) {
        const updated = { ...previousVotesRef.current };
        for (const entry of state.history) {
          updated[entry.character.id] = entry.action;
        }
        syncPreviousVotes(updated);
        toast.success("Picks saved", { duration: 2500 });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameComplete]);

  // Note: sendBeacon was removed. Votes are batched and flushed frequently
  // (on batch-size hit, debounce, or game complete), so the unload fallback
  // added complexity (anonymous-only, no auth headers) for near-zero benefit.

  const endGame = useCallback(() => {
    flushVotes();
    dispatch({ type: "END_GAME" });
  }, [flushVotes]);

  const reset = useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    voteQueue.current.reset();
    anonVotedIds.current.clear();
    // Clear the previous-votes cache so the GameRouter auto-start after reset
    // sees an empty voted set and includes all characters in the new deck.
    // Firebase still has the data and will re-populate this on next sign-in or
    // tab focus.
    syncPreviousVotes({});
    clearProgress();
    dispatch({ type: "RESET" });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- syncPreviousVotes is stable; resetGame should not change identity
  }, []);

  // ── Memoized provider value ─────────────────────────────────────────────
  // Prevents all consumers from re-rendering when unrelated parent state changes.
  const contextValue = useMemo<GameContextValue>(
    () => ({
      state,
      currentCharacter,
      nextCharacter,
      progress,
      filteredProgress,
      stats,
      voteCounts,
      previousVotes,
      isAtFrontier,
      isFilterExhausted,
      hasRestored,
      startGame,
      setViewFilter,
      swipe,
      endGame,
      reset,
      navigateBack,
      navigateForward,
      flushPendingVotes: flushVotes,
    }),
    [
      state,
      currentCharacter,
      nextCharacter,
      progress,
      filteredProgress,
      stats,
      voteCounts,
      previousVotes,
      isAtFrontier,
      isFilterExhausted,
      hasRestored,
      startGame,
      setViewFilter,
      swipe,
      endGame,
      reset,
      navigateBack,
      navigateForward,
      flushVotes,
    ]
  );

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}
