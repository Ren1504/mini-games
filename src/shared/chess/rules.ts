/**
 * Chess rules on top of chess.js, shared by the client (move hints,
 * captured pieces) and the server (the only judge of what's legal).
 *
 * A game is stored as its list of moves in UCI form ("e2e4", "e7e8q"),
 * never as a board: replaying them rebuilds the exact position, including
 * the history chess.js needs for threefold repetition.
 */
import { Chess, type PieceSymbol, type Square } from "chess.js";

export type Color = "w" | "b";
export type { PieceSymbol, Square };

export const other = (c: Color): Color => (c === "w" ? "b" : "w");

/** UCI move: from, to, and a promotion piece when a pawn reaches the end. */
export const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function fromUci(uci: string) {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    ...(uci.length === 5 ? { promotion: uci[4] as PieceSymbol } : {}),
  };
}

/** Rebuilds the game from its moves. Throws if a stored move is illegal. */
export function replay(moves: readonly string[]): Chess {
  const chess = new Chess();
  for (const uci of moves) chess.move(fromUci(uci));
  return chess;
}

/**
 * Plays one more move on top of `moves`. Returns the new position, or null
 * if the move is illegal (wrong piece, blocked path, leaves the king in
 * check, missing/extra promotion piece…).
 */
export function tryMove(
  moves: readonly string[],
  uci: string,
): { chess: Chess; san: string } | null {
  if (!UCI_PATTERN.test(uci)) return null;
  const chess = replay(moves);
  const { from, to, promotion } = fromUci(uci);
  const piece = chess.get(from);
  const reachesEnd = piece?.type === "p" && (to[1] === "8" || to[1] === "1");
  // chess.js quietly promotes to a queen when no piece is given; we want
  // the player's choice to be explicit (and never on a normal move).
  if (reachesEnd !== Boolean(promotion)) return null;
  try {
    const move = chess.move({ from, to, promotion });
    return { chess, san: move.san };
  } catch {
    return null;
  }
}

export type EndReason =
  "CHECKMATE" | "STALEMATE" | "INSUFFICIENT" | "REPETITION" | "FIFTY_MOVES";

/** How the position itself ended the game, if it did. */
export function positionEnd(
  chess: Chess,
): { reason: EndReason; winner: Color | null } | null {
  if (chess.isCheckmate())
    return { reason: "CHECKMATE", winner: other(chess.turn()) };
  if (chess.isStalemate()) return { reason: "STALEMATE", winner: null };
  if (chess.isInsufficientMaterial())
    return { reason: "INSUFFICIENT", winner: null };
  if (chess.isThreefoldRepetition())
    return { reason: "REPETITION", winner: null };
  if (chess.isDrawByFiftyMoves())
    return { reason: "FIFTY_MOVES", winner: null };
  return null;
}

/**
 * Could `color` ever deliver mate with what it has left? Used when the
 * other side runs out of time: losing on time to a lone king (or king and
 * one bishop/knight) is a draw instead.
 */
export function canStillMate(chess: Chess, color: Color): boolean {
  let minors = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== color) continue;
      if (sq.type === "p" || sq.type === "r" || sq.type === "q") return true;
      if (sq.type === "b" || sq.type === "n") minors += 1;
    }
  }
  return minors >= 2;
}

export const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

/** Display order for captured pieces: pawns first, then up in value. */
const ORDER: PieceSymbol[] = ["p", "n", "b", "r", "q"];

/**
 * Pieces each side has taken so far: `w` lists the black pieces White
 * captured, and the other way round. Sorted pawns → queen.
 */
export function capturedPieces(chess: Chess): Record<Color, PieceSymbol[]> {
  const out: Record<Color, PieceSymbol[]> = { w: [], b: [] };
  for (const move of chess.history({ verbose: true })) {
    if (move.captured) out[move.color].push(move.captured);
  }
  for (const c of ["w", "b"] as const)
    out[c].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return out;
}

/**
 * White's material on the board minus Black's (positive: White is ahead).
 * Counted from the board, so a promoted pawn counts as its new piece.
 */
export function materialBalance(chess: Chess): number {
  let balance = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq) balance += (sq.color === "w" ? 1 : -1) * PIECE_VALUE[sq.type];
    }
  }
  return balance;
}
