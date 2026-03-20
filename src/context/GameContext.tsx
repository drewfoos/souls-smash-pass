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
  saveUserHistory,
  saveUserPosition,
  getUserData,
  type VoteChoice,
  type RunConfig,
} from "@/lib/firebase-user";
import toast from "react-hot-toast";

export type SwipeAction = "smash" | "pass";

interface HistoryEntry {
  character: Character;
  action: SwipeAction;
}

// ---------------------------------------------------------------------------
// Game state — viewingIndex is where the user is *looking*, currentIndex is
// the frontier (next unvoted character).  viewingIndex ≤ currentIndex always.
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
}

type GameAction =
  | { type: "START_GAME"; payload?: { games?: Game[]; types?: CharacterType[]; seed?: number } }
  | { type: "SWIPE"; payload: { action: SwipeAction } }
  | { type: "END_GAME" }
  | { type: "NAVIGATE"; payload: { index: number } }
  | { type: "RESTORE"; payload: GameState }
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
    const viewingIndex = Math.min(saved.viewingIndex ?? currentIndex, currentIndex);

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
    };
  } catch {
    return null;
  }
}

/**
 * Loads the best available local progress by checking all three LS keys and
 * returning whichever has the highest currentIndex (most progress).
 */
function loadBestProgress(): { state: GameState | null; key: string } {
  const candidates = [
    { state: loadProgress(LS_SCORE_KEY),   key: LS_SCORE_KEY },
    { state: loadProgress(LS_OFFLINE_KEY), key: LS_OFFLINE_KEY },
    { state: loadProgress(LS_LEGACY_KEY),  key: LS_LEGACY_KEY },
  ].filter((c): c is { state: GameState; key: string } => c.state !== null);

  if (candidates.length === 0) return { state: null, key: LS_OFFLINE_KEY };

  return candidates.reduce((best, c) =>
    c.state.currentIndex > best.state.currentIndex ? c : best
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
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const games = action.payload?.games ?? null;
      const types = action.payload?.types ?? null;
      const seed = action.payload?.seed ?? getWeeklySeed();
      let pool = characters;
      if (games && games.length > 0) pool = pool.filter((c) => games.includes(c.game));
      if (types && types.length > 0) pool = pool.filter((c) => types.includes(c.type));

      // Guard: if filters eliminate all characters, don't start an empty game
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
      };
    }

    case "SWIPE": {
      if (state.currentIndex >= state.deck.length) return state;
      const character = state.deck[state.currentIndex];
      const entry: HistoryEntry = { character, action: action.payload.action };
      const newIndex = state.currentIndex + 1;
      const complete = newIndex >= state.deck.length;
      return {
        ...state,
        currentIndex: newIndex,
        viewingIndex: newIndex, // keep viewing at the frontier after voting
        history: [...state.history, entry],
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
      // Only allow navigating within [0, currentIndex]
      if (index < 0 || index > state.currentIndex) return state;
      return { ...state, viewingIndex: index };
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

export type VoteCounts = Record<string, { smash: number; pass: number }>;

interface GameContextValue {
  state: GameState;
  currentCharacter: Character | null;
  nextCharacter: Character | null;
  progress: { current: number; total: number; percent: number };
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
  /**
   * True once the one-time localStorage restore useEffect has completed.
   * GameRouter must wait for this before deciding whether to auto-start a new
   * game, otherwise it races with the restore and calls startGame() (which
   * calls clearProgress()) before we've had a chance to load saved progress.
   */
  hasRestored: boolean;
  startGame: (games?: Game[], types?: CharacterType[]) => void;
  swipe: (action: SwipeAction) => void;
  endGame: () => void;
  reset: () => void;
  navigateBack: () => void;
  navigateForward: () => void;
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

  // ── One-time restore from best available local progress ──────────────────
  // Runs only on the client, after the initial hydration is complete.
  // We also clean up the legacy key here so it doesn't linger.
  useEffect(() => {
    const { state: saved } = loadBestProgress();
    // Clean up legacy single-key format if present
    try { localStorage.removeItem(LS_LEGACY_KEY); } catch { /* ignore */ }
    if (saved) {
      dispatch({ type: "RESTORE", payload: saved });
    }
    setHasRestored(true); // signal to GameRouter that it can now decide
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps = run exactly once after mount

  const { user } = useAuth();

  // ── Refs so effects can read latest values without re-subscribing ────────
  const stateRef = useRef<GameState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const historyRef = useRef<HistoryEntry[]>(state.history);
  useEffect(() => { historyRef.current = state.history; }, [state.history]);

  // ── Memoized derived values ─────────────────────────────────────────────
  // These only recompute when their deps change, not on every render.

  const isAtFrontier = state.viewingIndex === state.currentIndex;

  const currentCharacter = useMemo(
    () =>
      state.gameActive && state.currentIndex < state.deck.length
        ? state.deck[state.currentIndex]
        : null,
    [state.gameActive, state.currentIndex, state.deck]
  );

  const nextCharacter = useMemo(
    () =>
      state.gameActive && state.currentIndex + 1 < state.deck.length
        ? state.deck[state.currentIndex + 1]
        : null,
    [state.gameActive, state.currentIndex, state.deck]
  );

  const progress = useMemo(
    () => ({
      current: state.currentIndex,
      total: state.deck.length,
      percent:
        state.deck.length > 0
          ? Math.round((state.currentIndex / state.deck.length) * 100)
          : 0,
    }),
    [state.currentIndex, state.deck.length]
  );

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
  }, [state.deck, state.currentIndex, state.history, state.selectedGames, state.selectedTypes, state.seed, user]);

  // ── Sign-out migration: score → offlineScore ─────────────────────────────
  // When the user logs out, carry their signed-in progress forward to the
  // offline key so anonymous play continues from where they left off.
  const prevUserRef = useRef<typeof user>(null);
  useEffect(() => {
    const wasSignedIn = Boolean(prevUserRef.current);
    const isSignedIn = Boolean(user);

    if (wasSignedIn && !isSignedIn) {
      // Just signed out — migrate LS_SCORE_KEY → LS_OFFLINE_KEY
      try {
        const scoreData = localStorage.getItem(LS_SCORE_KEY);
        if (scoreData) {
          localStorage.setItem(LS_OFFLINE_KEY, scoreData);
          localStorage.removeItem(LS_SCORE_KEY);
        }
      } catch { /* ignore */ }
    }

    prevUserRef.current = user;
  }, [user]);

  // ── Vote counts cache (populated from batch vote API responses) ──────────
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({});

  // ── Previous votes — loaded from Firebase when user signs in ─────────────
  // Used to compute net deltas so vote-switching adjusts counts correctly.
  const previousVotesRef = useRef<Record<string, VoteChoice>>({});
  const [previousVotes, setPreviousVotes] = useState<Record<string, VoteChoice>>({});

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

      if (currentState.deck.length > 0) {
        // Local deck exists — use it (same session, same run)
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

      for (let i = 0; i < newCurrentIndex; i++) {
        const char = deck[i];
        const vote = fbVotes[char.id];
        if (vote) newHistory.push({ character: char, action: vote });
      }

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
        },
      });
    },
    [] // stateRef is a ref — stable across renders
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
      previousVotesRef.current = {};
      setPreviousVotes({});
      return;
    }

    const localCurrentIndex = stateRef.current.currentIndex;
    const localHistory = historyRef.current;

    getUserData(user.uid)
      .then((data) => {
        const fbVotes = (data?.votes ?? {}) as Record<string, VoteChoice>;
        const fbCurrentId = data?.currentId ?? 0;

        previousVotesRef.current = fbVotes;
        setPreviousVotes(fbVotes);

        const currentState = stateRef.current;

        if (fbCurrentId > localCurrentIndex) {
          // ── Firebase is further ahead — restore from Firebase ─────────────
          restoreFromFirebase(fbVotes, fbCurrentId, data?.runConfig);

          // Migrate to signed-in key (Firebase was the winner)
          try { localStorage.removeItem(LS_OFFLINE_KEY); } catch { /* ignore */ }
        } else {
          // ── Local is ahead (or equal) — keep local, sync to Firebase ──────

          // Sync locally-voted characters + position + run config to Firebase.
          // saveUserHistory already writes currentId, so a separate
          // saveUserPosition call is not needed.
          if (localHistory.length > 0) {
            const hasUnsynced = localHistory.some((h) => !fbVotes[h.character.id]);
            if (hasUnsynced) {
              const rc = buildRunConfig(currentState);
              saveUserHistory(user, localHistory, localCurrentIndex, rc)
                .then(() => {
                  // Update local previousVotes so delta calc is correct next time
                  const updated = { ...fbVotes };
                  for (const h of localHistory) updated[h.character.id] = h.action;
                  previousVotesRef.current = updated;
                  setPreviousVotes(updated);
                })
                .catch(console.error);
            }
          } else if (localCurrentIndex > 0) {
            // No unsynced votes but position has advanced — sync position + run config
            const rc = buildRunConfig(currentState);
            saveUserPosition(user, localCurrentIndex, rc).catch(console.error);
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
      getUserData(user.uid)
        .then((data) => {
          if (!data) return;

          const fbVotes = (data.votes ?? {}) as Record<string, VoteChoice>;
          const fbCurrentId = data.currentId ?? 0;
          const localCurrentIndex = stateRef.current.currentIndex;

          // Update the trusted previous-votes cache regardless
          previousVotesRef.current = fbVotes;
          setPreviousVotes(fbVotes);

          // If Firebase is ahead of this tab, reconcile
          if (fbCurrentId > localCurrentIndex) {
            restoreFromFirebase(fbVotes, fbCurrentId, data.runConfig);
          }
        })
        .catch(() => {
          // Silently fail — stale state is better than broken state
        });
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  // ── Per-vote submission ─────────────────────────────────────────────────
  // Flushes immediately on each swipe (BATCH_SIZE = 1) so OthersChose counts
  // are live right after swiping. Entirely fire-and-forget — the fetch runs
  // in the background and updates voteCounts on success, silently fails on
  // error. Not async because callers don't await it.
  const BATCH_SIZE = 1;
  const pendingVotes = useRef<Array<{ characterId: string; action: SwipeAction }>>([]);

  const flushVotes = useCallback(() => {
    if (pendingVotes.current.length === 0) return;
    const votes = [...pendingVotes.current];
    pendingVotes.current = [];

    // Build request headers — include auth token if user is signed in
    // so the server can use trusted vote history for correct deltas.
    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    // Resolve the auth token first (if signed in), then fire the fetch.
    // Both are fire-and-forget — no caller awaits this.
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;
    const tokenPromise = firebaseUser
      ? getIdToken(firebaseUser).catch(() => null)
      : Promise.resolve(null);

    tokenPromise.then((token) => {
      if (token) reqHeaders["Authorization"] = `Bearer ${token}`;

      // previousVotes is NOT sent — the server derives prior state from
      // /users/{uid}/votes for authenticated users, and uses increment-only
      // for anonymous users.
      fetch("/api/vote", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({ votes }),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.voteCounts) {
            setVoteCounts((prev) => ({ ...prev, ...data.voteCounts }));
          }
        })
        .catch(() => {
          // silently fail — local stats still work
        })
        .finally(() => clearTimeout(timeout));
    });
  }, []);

  const queueVote = useCallback(
    (characterId: string, action: SwipeAction) => {
      pendingVotes.current.push({ characterId, action });
      if (pendingVotes.current.length >= BATCH_SIZE) {
        flushVotes();
      }
    },
    [flushVotes]
  );

  // ── Game actions ──────────────────────────────────────────────────────────

  const startGame = useCallback((games?: Game[], types?: CharacterType[]) => {
    // Pre-check: warn if filters would produce an empty deck
    let pool = characters;
    if (games && games.length > 0) pool = pool.filter((c) => games.includes(c.game));
    if (types && types.length > 0) pool = pool.filter((c) => types.includes(c.type));
    if (pool.length === 0) {
      toast.error("No characters match those filters!", { id: "empty-filters", duration: 3000 });
      return;
    }
    clearProgress(); // clears all keys — fresh start
    dispatch({ type: "START_GAME", payload: { games, types, seed: getWeeklySeed() } });
  }, []);

  // Swipe lock — prevents double-trigger from rapid taps before React rerenders.
  const swipeLock = useRef(false);

  const swipe = useCallback(
    (action: SwipeAction) => {
      if (swipeLock.current) return;
      swipeLock.current = true;
      // Release after a microtask — by then React will have processed the dispatch
      // and updated currentIndex, so a second call would see the new state.
      queueMicrotask(() => { swipeLock.current = false; });

      const char = state.deck[state.currentIndex];
      if (char) queueVote(char.id, action);
      dispatch({ type: "SWIPE", payload: { action } });
      // Save position + run config to Firebase on every vote.
      // Fire-and-forget — ensures cross-device sync even mid-session.
      if (user) {
        const rc = buildRunConfig(state);
        saveUserPosition(user, state.currentIndex + 1, rc).catch(console.error);
      }
    },
    [state.deck, state.currentIndex, state.seed, state.selectedGames, state.selectedTypes, queueVote, user]
  );

  const navigateBack = useCallback(() => {
    if (state.viewingIndex > 0) {
      dispatch({ type: "NAVIGATE", payload: { index: state.viewingIndex - 1 } });
    }
  }, [state.viewingIndex]);

  const navigateForward = useCallback(() => {
    if (state.viewingIndex < state.currentIndex) {
      // Still has history ahead — navigate into it
      dispatch({ type: "NAVIGATE", payload: { index: state.viewingIndex + 1 } });
    } else if (!state.gameComplete) {
      // At the frontier: user hasn't voted on the next card
      const char = state.deck[state.viewingIndex];
      if (char) {
        toast(`You haven't Smashed or Passed ${char.name} yet!`, {
          id: "navigate-forward-blocked",
          icon: "⚔️",
          duration: 2500,
        });
      }
    }
  }, [state.viewingIndex, state.currentIndex, state.deck, state.gameComplete]);

  // Flush on game complete
  useEffect(() => {
    if (state.gameComplete) flushVotes();
  }, [state.gameComplete, flushVotes]);

  // Save per-user history when game ends; update previousVotes for next game
  useEffect(() => {
    if (state.gameComplete && user && state.history.length > 0) {
      const rc = buildRunConfig(state);
      saveUserHistory(user, state.history, state.currentIndex, rc)
        .then(() => {
          const updated = { ...previousVotesRef.current };
          for (const entry of state.history) {
            updated[entry.character.id] = entry.action;
          }
          previousVotesRef.current = updated;
          setPreviousVotes(updated);
          toast.success("Picks saved", { duration: 2500 });
        })
        .catch((err) => {
          console.error("Failed to save user history:", err);
          toast.error("Failed to save picks");
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameComplete]);

  // Note: sendBeacon was removed because BATCH_SIZE=1 means votes flush
  // immediately on each swipe. The unload fallback added complexity (anonymous-
  // only, no auth headers) for near-zero benefit.

  const endGame = useCallback(() => {
    flushVotes();
    dispatch({ type: "END_GAME" });
  }, [flushVotes]);

  const reset = useCallback(() => {
    pendingVotes.current = [];
    clearProgress();
    dispatch({ type: "RESET" });
  }, []);

  // ── Memoized provider value ─────────────────────────────────────────────
  // Prevents all consumers from re-rendering when unrelated parent state changes.
  const contextValue = useMemo<GameContextValue>(
    () => ({
      state,
      currentCharacter,
      nextCharacter,
      progress,
      stats,
      voteCounts,
      previousVotes,
      isAtFrontier,
      hasRestored,
      startGame,
      swipe,
      endGame,
      reset,
      navigateBack,
      navigateForward,
    }),
    [
      state,
      currentCharacter,
      nextCharacter,
      progress,
      stats,
      voteCounts,
      previousVotes,
      isAtFrontier,
      hasRestored,
      startGame,
      swipe,
      endGame,
      reset,
      navigateBack,
      navigateForward,
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
