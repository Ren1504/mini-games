import { describe, expect, it } from "vitest";
import {
  canMove,
  isGameState,
  move,
  newGame,
  type GameState,
  type Tile,
} from "./logic";

/** Builds a state from a 4×4 grid of numbers (0 = empty). */
function fromGrid(grid: number[][], extra: Partial<GameState> = {}): GameState {
  const tiles: Tile[] = [];
  let id = 1;
  grid.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value) tiles.push({ id: id++, value, row: r, col: c });
    }),
  );
  return { tiles, score: 0, won: false, over: false, nextId: id, ...extra };
}

/** Grid after a move, leaving out the randomly spawned tile. */
function toGrid(state: GameState): number[][] {
  const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (const t of state.tiles) if (!t.isNew) grid[t.row][t.col] = t.value;
  return grid;
}

/** Spawns into the first empty cell with a 2, so results are predictable. */
const first = () => 0;

describe("2048 rules", () => {
  it("starts with two tiles", () => {
    expect(newGame().tiles).toHaveLength(2);
  });

  it("slides and merges each pair once (2 2 2 2 → 4 4)", () => {
    const r = move(
      fromGrid([
        [2, 2, 2, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      "left",
      first,
    );
    expect(r.moved).toBe(true);
    expect(toGrid(r.state)[0]).toEqual([4, 4, 0, 0]);
    expect(r.gained).toBe(8);
    expect(r.state.score).toBe(8);
    expect(r.absorbed).toHaveLength(2);
  });

  it("does not merge a freshly merged tile again (4 4 8 → 8 8)", () => {
    const r = move(
      fromGrid([
        [4, 4, 8, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      "left",
      first,
    );
    expect(toGrid(r.state)[0]).toEqual([8, 8, 0, 0]);
  });

  it("merges toward the direction of travel (2 2 2 → right gives 0 0 2 4)", () => {
    const r = move(
      fromGrid([
        [2, 2, 2, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      "right",
      first,
    );
    expect(toGrid(r.state)[0]).toEqual([0, 0, 2, 4]);
  });

  it("moves columns up and down", () => {
    const up = move(
      fromGrid([
        [0, 0, 0, 0],
        [2, 0, 0, 0],
        [0, 0, 0, 0],
        [2, 0, 0, 0],
      ]),
      "up",
      () => 0.99,
    );
    expect(up.state.tiles.find((t) => t.col === 0 && t.row === 0)?.value).toBe(
      4,
    );
    const down = move(
      fromGrid([
        [4, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      "down",
      () => 0.99,
    );
    expect(down.state.tiles.find((t) => t.id === 1)?.row).toBe(3);
  });

  it("ignores a move that changes nothing and does not spawn", () => {
    const s = fromGrid([
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const r = move(s, "left", first);
    expect(r.moved).toBe(false);
    expect(r.state).toBe(s);
  });

  it("spawns exactly one tile after a real move", () => {
    const r = move(
      fromGrid([
        [0, 0, 0, 2],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      "left",
      first,
    );
    expect(r.state.tiles).toHaveLength(2);
    expect(r.state.tiles.filter((t) => t.isNew)).toHaveLength(1);
  });

  it("detects the win and stops accepting moves", () => {
    const r = move(
      fromGrid([
        [1024, 1024, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      "left",
      first,
    );
    expect(r.state.won).toBe(true);
    expect(move(r.state, "right", first).moved).toBe(false);
  });

  it("detects game over when the board is full with no merges", () => {
    const full = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(canMove(fromGrid(full).tiles)).toBe(false);
    // Sliding left opens one cell; the 2 that spawns there can't merge.
    const almost = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [0, 8, 16, 8],
    ];
    const r = move(fromGrid(almost), "left", () => 0.5);
    expect(r.moved).toBe(true);
    expect(r.state.over).toBe(true);
  });

  it("validates saved games", () => {
    expect(isGameState(newGame())).toBe(true);
    expect(
      isGameState({
        tiles: [{ id: 1, value: 2, row: 9, col: 0 }],
        score: 0,
        won: false,
        over: false,
        nextId: 2,
      }),
    ).toBe(false);
    expect(isGameState("nope")).toBe(false);
  });
});
