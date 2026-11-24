import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/seed";
import {
  SIZES,
  elapsedMs,
  flip,
  formatTime,
  freeIndex,
  hideMismatch,
  isFaceUp,
  newGame,
  pairsFor,
  parseBests,
  recordBest,
  type GameState,
} from "./logic";
import { CARD_SYMBOLS } from "./symbols";

const POOL = CARD_SYMBOLS.map((s) => s.id);

/** Index pairs of matching cards, in board order. */
function pairsOf(state: GameState): [number, number][] {
  const seen = new Map<string, number>();
  const pairs: [number, number][] = [];
  state.cards.forEach((c, i) => {
    if (c.symbol === null) return;
    const first = seen.get(c.symbol);
    if (first === undefined) seen.set(c.symbol, i);
    else pairs.push([first, i]);
  });
  return pairs;
}

describe("symbols", () => {
  it("has 32 unique symbols, enough for 8×8", () => {
    expect(new Set(POOL).size).toBe(32);
    expect(POOL.length).toBeGreaterThanOrEqual(pairsFor(8));
  });
});

describe("newGame", () => {
  it.each(SIZES)(
    "deals a %i×%i board where every card has exactly one twin",
    (size) => {
      const g = newGame(size, POOL, mulberry32(size));
      expect(g.cards).toHaveLength(size * size);
      expect(g.pairsTotal).toBe(Math.floor((size * size) / 2));
      const counts = new Map<string, number>();
      for (const c of g.cards) {
        if (c.symbol !== null)
          counts.set(c.symbol, (counts.get(c.symbol) ?? 0) + 1);
      }
      expect(counts.size).toBe(g.pairsTotal);
      for (const n of counts.values()) expect(n).toBe(2);
      expect(new Set(g.cards.map((c) => c.id)).size).toBe(g.cards.length);
    },
  );

  it("puts the free tile in the middle of odd boards only", () => {
    for (const size of SIZES) {
      const g = newGame(size, POOL, mulberry32(1));
      const free = g.cards.flatMap((c, i) => (c.symbol === null ? [i] : []));
      expect(free).toEqual(size % 2 ? [freeIndex(size)] : []);
    }
    expect(freeIndex(5)).toBe(12);
    expect(freeIndex(7)).toBe(24);
  });

  it("shuffles: different seeds give different layouts and symbol picks", () => {
    const a = newGame(4, POOL, mulberry32(1)).cards.map((c) => c.symbol);
    const b = newGame(4, POOL, mulberry32(2)).cards.map((c) => c.symbol);
    expect(a).not.toEqual(b);
    // Over many small games every symbol shows up at some point.
    const used = new Set<string>();
    for (let s = 0; s < 60; s++) {
      for (const c of newGame(4, POOL, mulberry32(s)).cards)
        used.add(c.symbol!);
    }
    expect(used.size).toBe(32);
  });

  it("refuses a pool that's too small", () => {
    expect(() => newGame(8, POOL.slice(0, 10))).toThrow();
  });
});

describe("flip", () => {
  const start = () => newGame(4, POOL, mulberry32(7));

  it("starts the clock on the first flip, not on deal", () => {
    let g = start();
    expect(g.startedAt).toBeNull();
    expect(elapsedMs(g, 5000)).toBe(0);
    g = flip(g, 0, 1000).state;
    expect(g.startedAt).toBe(1000);
    expect(elapsedMs(g, 4500)).toBe(3500);
  });

  it("keeps a matched pair face up and counts one move", () => {
    const [[a, b]] = pairsOf(start());
    let g = start();
    let r = flip(g, a, 0);
    expect(r.outcome).toBe("first");
    expect(r.state.moves).toBe(0);
    r = flip(r.state, b, 10);
    expect(r.outcome).toBe("match");
    g = r.state;
    expect(g.moves).toBe(1);
    expect(g.pairsFound).toBe(1);
    expect(g.open).toEqual([]);
    expect(isFaceUp(g, a) && isFaceUp(g, b)).toBe(true);
    // Matched cards can't be flipped again.
    expect(flip(g, a, 20).outcome).toBe("ignored");
  });

  it("leaves a missed pair up until hidden, then turns it face down", () => {
    const pairs = pairsOf(start());
    const [a] = pairs[0];
    const [c] = pairs[1];
    let r = flip(start(), a, 0);
    r = flip(r.state, c, 10);
    expect(r.outcome).toBe("miss");
    expect(r.state.moves).toBe(1);
    expect(r.state.open).toEqual([a, c]);
    const hidden = hideMismatch(r.state);
    expect(hidden.open).toEqual([]);
    expect(isFaceUp(hidden, a)).toBe(false);
  });

  it("tapping a third card flips the missed pair back right away", () => {
    const pairs = pairsOf(start());
    const [a] = pairs[0];
    const [c] = pairs[1];
    const [e] = pairs[2];
    let g = flip(flip(start(), a, 0).state, c, 10).state;
    const r = flip(g, e, 20);
    expect(r.outcome).toBe("first");
    g = r.state;
    expect(g.open).toEqual([e]);
    expect(g.moves).toBe(1);
  });

  it("ignores the same card twice, the free tile, and anything after the end", () => {
    let g = start();
    g = flip(g, 3, 0).state;
    expect(flip(g, 3, 1).outcome).toBe("ignored");

    const odd = newGame(5, POOL, mulberry32(3));
    expect(flip(odd, freeIndex(5)!, 0).outcome).toBe("ignored");
  });

  it.each(SIZES)(
    "finishes a %i×%i game when the last pair is found",
    (size) => {
      let g = newGame(size, POOL, mulberry32(size * 11));
      const pairs = pairsOf(g);
      let t = 100;
      for (const [a, b] of pairs) {
        g = flip(g, a, (t += 1000)).state;
        const r = flip(g, b, (t += 1000));
        expect(r.outcome).toBe("match");
        g = r.state;
      }
      expect(g.pairsFound).toBe(g.pairsTotal);
      expect(g.moves).toBe(pairs.length);
      expect(g.finishedAt).toBe(t);
      expect(elapsedMs(g, t + 99_999)).toBe(t - 1100);
      expect(flip(g, 0, t + 1).outcome).toBe("ignored");
    },
  );
});

describe("formatTime", () => {
  it("shows m:ss, and h:mm:ss past an hour", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(9_999)).toBe("0:09");
    expect(formatTime(83_000)).toBe("1:23");
    expect(formatTime(3_723_000)).toBe("1:02:03");
  });
});

describe("best results", () => {
  it("tracks fewest moves and fastest time separately for each size", () => {
    let r = recordBest({}, 4, { moves: 12, ms: 40_000 });
    expect(r).toMatchObject({ newMoves: true, newTime: true });
    r = recordBest(r.bests, 4, { moves: 10, ms: 50_000 });
    expect(r).toMatchObject({ newMoves: true, newTime: false });
    expect(r.bests[4]).toEqual({ moves: 10, ms: 40_000 });
    r = recordBest(r.bests, 4, { moves: 11, ms: 45_000 });
    expect(r).toMatchObject({ newMoves: false, newTime: false });
    r = recordBest(r.bests, 6, { moves: 30, ms: 90_000 });
    expect(r.bests[4]).toEqual({ moves: 10, ms: 40_000 });
    expect(r.bests[6]).toEqual({ moves: 30, ms: 90_000 });
  });

  it("drops junk from storage", () => {
    expect(parseBests(null)).toEqual({});
    expect(parseBests("x")).toEqual({});
    expect(
      parseBests({
        4: { moves: 9, ms: 1000 },
        5: { moves: "x" },
        9: { moves: 1, ms: 1 },
      }),
    ).toEqual({ 4: { moves: 9, ms: 1000 } });
  });
});
