/**
 * Memory Match rules, free of React so they can be unit-tested.
 * The board is a flat list of cards, row by row. Odd boards (5×5, 7×7)
 * have one free tile in the middle that isn't part of any pair.
 */

export const SIZES = [4, 5, 6, 7, 8] as const;
export type BoardSize = (typeof SIZES)[number];

export type Card = {
  /** Position-independent id, stable for the whole game. */
  id: number;
  /** Symbol id, or null for the free center tile. */
  symbol: string | null;
  matched: boolean;
};

export type GameState = {
  size: BoardSize;
  cards: Card[];
  /** Indices of face-up cards that aren't matched yet (0, 1 or 2). */
  open: number[];
  /** One move = one pair of cards turned over. */
  moves: number;
  pairsFound: number;
  pairsTotal: number;
  /** Set on the first flip, so looking at the board doesn't count. */
  startedAt: number | null;
  finishedAt: number | null;
};

export type FlipOutcome =
  /** Nothing happened (matched card, free tile, already open, game over). */
  | "ignored"
  /** First card of a pair is now face up. */
  | "first"
  | "match"
  /** Two different cards are face up; call hideMismatch after a pause. */
  | "miss";

type Random = () => number;

export function isBoardSize(n: unknown): n is BoardSize {
  return SIZES.includes(n as BoardSize);
}

export const pairsFor = (size: BoardSize) => Math.floor((size * size) / 2);

/** Index of the free tile on odd boards, otherwise null. */
export const freeIndex = (size: BoardSize) =>
  size % 2 === 1 ? (size * size - 1) / 2 : null;

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deals a fresh board: picks `pairs` symbols at random from the pool,
 * puts two of each in, shuffles them, and leaves the middle free on odd
 * boards.
 */
export function newGame(
  size: BoardSize,
  pool: readonly string[],
  random: Random = Math.random,
): GameState {
  const pairsTotal = pairsFor(size);
  if (pool.length < pairsTotal) {
    throw new Error(`Need ${pairsTotal} symbols, got ${pool.length}`);
  }
  const symbols = shuffle(pool, random).slice(0, pairsTotal);
  const deck: (string | null)[] = shuffle([...symbols, ...symbols], random);
  const free = freeIndex(size);
  if (free !== null) deck.splice(free, 0, null);
  return {
    size,
    cards: deck.map((symbol, id) => ({ id, symbol, matched: false })),
    open: [],
    moves: 0,
    pairsFound: 0,
    pairsTotal,
    startedAt: null,
    finishedAt: null,
  };
}

/**
 * Turns over the card at `index`. Tapping a third card while a missed
 * pair is still showing flips that pair back first, so quick players
 * never have to wait.
 */
export function flip(
  state: GameState,
  index: number,
  now: number,
): { state: GameState; outcome: FlipOutcome } {
  const card = state.cards[index];
  const ignored = { state, outcome: "ignored" as const };
  if (!card || card.symbol === null || card.matched) return ignored;
  if (state.finishedAt !== null) return ignored;

  let open = state.open.length === 2 ? [] : state.open;
  if (open.includes(index)) return ignored;
  open = [...open, index];
  const startedAt = state.startedAt ?? now;

  if (open.length === 1) {
    return { state: { ...state, open, startedAt }, outcome: "first" };
  }

  const moves = state.moves + 1;
  const [a, b] = open;
  if (state.cards[a].symbol !== state.cards[b].symbol) {
    return { state: { ...state, open, startedAt, moves }, outcome: "miss" };
  }

  const pairsFound = state.pairsFound + 1;
  const cards = state.cards.map((c, i) =>
    i === a || i === b ? { ...c, matched: true } : c,
  );
  return {
    state: {
      ...state,
      cards,
      open: [],
      moves,
      pairsFound,
      startedAt,
      finishedAt: pairsFound === state.pairsTotal ? now : null,
    },
    outcome: "match",
  };
}

/** Flips a missed pair back face down (no-op otherwise). */
export function hideMismatch(state: GameState): GameState {
  return state.open.length === 2 ? { ...state, open: [] } : state;
}

export const isFaceUp = (state: GameState, index: number) =>
  state.cards[index]?.matched || state.open.includes(index);

/** Milliseconds played so far (or in total, once finished). */
export function elapsedMs(state: GameState, now: number): number {
  if (state.startedAt === null) return 0;
  return Math.max(0, (state.finishedAt ?? now) - state.startedAt);
}

/** 83_000 → "1:23"; an hour or more → "1:02:03". */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// ── Best results, per board size ─────────────────────────────────────

export type Best = { moves: number; ms: number };
export type BestBySize = Partial<Record<BoardSize, Best>>;

/** Keeps only well-formed entries from whatever was in storage. */
export function parseBests(raw: unknown): BestBySize {
  const out: BestBySize = {};
  if (!raw || typeof raw !== "object") return out;
  for (const size of SIZES) {
    const b = (raw as Record<string, unknown>)[size];
    if (
      b &&
      typeof b === "object" &&
      Number.isFinite((b as Best).moves) &&
      Number.isFinite((b as Best).ms) &&
      (b as Best).moves > 0 &&
      (b as Best).ms >= 0
    ) {
      out[size] = { moves: (b as Best).moves, ms: (b as Best).ms };
    }
  }
  return out;
}

/**
 * Folds a finished game into the bests. Fewest moves and fastest time
 * are tracked separately, so either can be a new record on its own.
 */
export function recordBest(
  bests: BestBySize,
  size: BoardSize,
  result: Best,
): { bests: BestBySize; newMoves: boolean; newTime: boolean } {
  const old = bests[size];
  const newMoves = !old || result.moves < old.moves;
  const newTime = !old || result.ms < old.ms;
  if (!newMoves && !newTime) return { bests, newMoves, newTime };
  return {
    bests: {
      ...bests,
      [size]: {
        moves: newMoves ? result.moves : old!.moves,
        ms: newTime ? result.ms : old!.ms,
      },
    },
    newMoves,
    newTime,
  };
}
