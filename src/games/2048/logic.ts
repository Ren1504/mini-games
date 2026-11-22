/**
 * 2048 rules, free of React so they can be unit-tested.
 * The board is a list of tiles with stable ids, so the UI can animate
 * each tile sliding from its old cell to its new one.
 */

export const SIZE = 4;
export const WIN_VALUE = 2048;

export type Direction = "up" | "down" | "left" | "right";

export type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
  /** Appeared this turn (spawned). */
  isNew?: boolean;
  /** Formed by a merge this turn. */
  merged?: boolean;
};

export type GameState = {
  tiles: Tile[];
  score: number;
  won: boolean;
  over: boolean;
  nextId: number;
};

export type MoveResult = {
  state: GameState;
  moved: boolean;
  /** Tiles absorbed by a merge, at the cell they slid into (for animation). */
  absorbed: Tile[];
  gained: number;
};

type Random = () => number;

function emptyCells(tiles: Tile[]): Array<[number, number]> {
  const taken = new Set(tiles.map((t) => t.row * SIZE + t.col));
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++)
      if (!taken.has(r * SIZE + c)) cells.push([r, c]);
  }
  return cells;
}

/** Adds a 2 (90%) or a 4 (10%) in a random empty cell. */
export function spawn(
  state: GameState,
  random: Random = Math.random,
): GameState {
  const cells = emptyCells(state.tiles);
  if (cells.length === 0) return state;
  const [row, col] = cells[Math.floor(random() * cells.length)];
  const tile: Tile = {
    id: state.nextId,
    value: random() < 0.9 ? 2 : 4,
    row,
    col,
    isNew: true,
  };
  return { ...state, tiles: [...state.tiles, tile], nextId: state.nextId + 1 };
}

export function newGame(random: Random = Math.random): GameState {
  const empty: GameState = {
    tiles: [],
    score: 0,
    won: false,
    over: false,
    nextId: 1,
  };
  return spawn(spawn(empty, random), random);
}

/**
 * Lines of cells in the order tiles travel toward: for "left", each row
 * from column 0 → 3; for "down", each column from row 3 → 0; and so on.
 */
function lines(direction: Direction): Array<Array<[number, number]>> {
  const out: Array<Array<[number, number]>> = [];
  for (let i = 0; i < SIZE; i++) {
    const line: Array<[number, number]> = [];
    for (let j = 0; j < SIZE; j++) {
      if (direction === "left") line.push([i, j]);
      else if (direction === "right") line.push([i, SIZE - 1 - j]);
      else if (direction === "up") line.push([j, i]);
      else line.push([SIZE - 1 - j, i]);
    }
    out.push(line);
  }
  return out;
}

export function canMove(tiles: Tile[]): boolean {
  if (tiles.length < SIZE * SIZE) return true;
  const at = new Map(tiles.map((t) => [t.row * SIZE + t.col, t.value]));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = at.get(r * SIZE + c);
      if (c + 1 < SIZE && at.get(r * SIZE + c + 1) === v) return true;
      if (r + 1 < SIZE && at.get((r + 1) * SIZE + c) === v) return true;
    }
  }
  return false;
}

/**
 * Slides every tile toward `direction`. Equal neighbours merge once per
 * move (so 2-2-2-2 → 4-4, not 8). A new tile spawns only if something moved.
 */
export function move(
  state: GameState,
  direction: Direction,
  random: Random = Math.random,
): MoveResult {
  if (state.over || state.won)
    return { state, moved: false, absorbed: [], gained: 0 };

  const byCell = new Map(state.tiles.map((t) => [t.row * SIZE + t.col, t]));
  const next: Tile[] = [];
  const absorbed: Tile[] = [];
  let gained = 0;
  let moved = false;

  for (const line of lines(direction)) {
    const inLine = line
      .map(([r, c]) => byCell.get(r * SIZE + c))
      .filter((t): t is Tile => Boolean(t));
    let target = 0;
    for (let k = 0; k < inLine.length; k++) {
      const tile = inLine[k];
      const after = inLine[k + 1];
      const [row, col] = line[target];
      if (after && after.value === tile.value) {
        const value = tile.value * 2;
        next.push({ id: tile.id, value, row, col, merged: true });
        absorbed.push({ ...after, row, col });
        gained += value;
        moved = true;
        k++;
      } else {
        if (tile.row !== row || tile.col !== col) moved = true;
        next.push({ id: tile.id, value: tile.value, row, col });
      }
      target++;
    }
  }

  if (!moved) return { state, moved: false, absorbed: [], gained: 0 };

  let result: GameState = {
    tiles: next,
    score: state.score + gained,
    won: next.some((t) => t.value >= WIN_VALUE),
    over: false,
    nextId: state.nextId,
  };
  result = spawn(result, random);
  result = { ...result, over: !result.won && !canMove(result.tiles) };
  return { state: result, moved: true, absorbed, gained };
}

/** Validates data read back from storage before trusting it. */
export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<GameState>;
  return (
    Array.isArray(v.tiles) &&
    typeof v.score === "number" &&
    typeof v.nextId === "number" &&
    typeof v.won === "boolean" &&
    typeof v.over === "boolean" &&
    v.tiles.every(
      (t) =>
        t &&
        typeof t.id === "number" &&
        typeof t.value === "number" &&
        Number.isInteger(t.row) &&
        Number.isInteger(t.col) &&
        t.row >= 0 &&
        t.row < SIZE &&
        t.col >= 0 &&
        t.col < SIZE,
    )
  );
}
