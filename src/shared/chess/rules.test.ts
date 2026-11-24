import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import {
  canStillMate,
  capturedPieces,
  materialBalance,
  positionEnd,
  replay,
  tryMove,
} from "./rules";

const FOOLS_MATE = ["f2f3", "e7e5", "g2g4", "d8h4"];
// Sam Loyd's 10-move stalemate.
const STALEMATE = [
  "e2e3",
  "a7a5",
  "d1h5",
  "a8a6",
  "h5a5",
  "h7h5",
  "h2h4",
  "a6h6",
  "a5c7",
  "f7f6",
  "c7d7",
  "e8f7",
  "d7b7",
  "d8d3",
  "b7b8",
  "d3h7",
  "b8c8",
  "f7g6",
  "c8e6",
];

describe("tryMove", () => {
  it("accepts legal moves and rejects illegal ones", () => {
    expect(tryMove([], "e2e4")?.san).toBe("e4");
    expect(tryMove([], "e2e5")).toBeNull(); // pawns don't jump 3
    expect(tryMove([], "e7e5")).toBeNull(); // not Black's turn
    expect(tryMove([], "b1d2")).toBeNull(); // own pawn there
    expect(tryMove([], "zz")).toBeNull();
  });

  it("won't let you leave your king in check", () => {
    // 1.e4 f5 2.Qh5+: Black must answer the check.
    const moves = ["e2e4", "f7f5", "d1h5"];
    expect(tryMove(moves, "a7a6")).toBeNull();
    expect(tryMove(moves, "g7g6")?.san).toBe("g6");
  });

  it("needs an explicit promotion piece, and only for promotions", () => {
    // White pawn walks to h7 and captures on g8.
    const moves = [
      "h2h4",
      "g7g5",
      "h4g5",
      "h7h6",
      "g5h6",
      "f8g7",
      "h6h7",
      "a7a6",
    ];
    expect(tryMove(moves, "h7g8")).toBeNull();
    expect(tryMove(moves, "h7g8n")?.san).toBe("hxg8=N");
    expect(tryMove([], "e2e4q")).toBeNull();
  });

  it("handles castling and en passant", () => {
    const castle = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"];
    expect(tryMove(castle, "e1g1")?.san).toBe("O-O");
    const ep = ["e2e4", "a7a6", "e4e5", "d7d5"];
    expect(tryMove(ep, "e5d6")?.san).toBe("exd6");
  });
});

describe("positionEnd", () => {
  it("spots checkmate and who won", () => {
    expect(positionEnd(replay(FOOLS_MATE))).toEqual({
      reason: "CHECKMATE",
      winner: "b",
    });
    expect(positionEnd(replay(["e2e4"]))).toBeNull();
  });

  it("spots stalemate", () => {
    expect(positionEnd(replay(STALEMATE))).toEqual({
      reason: "STALEMATE",
      winner: null,
    });
  });

  it("spots threefold repetition", () => {
    const dance = ["g1f3", "g8f6", "f3g1", "f6g8"];
    expect(positionEnd(replay([...dance, ...dance]))).toEqual({
      reason: "REPETITION",
      winner: null,
    });
  });

  it("spots insufficient material", () => {
    const c = new Chess("8/8/8/4k3/8/8/8/4K3 w - - 0 1");
    expect(positionEnd(c)?.reason).toBe("INSUFFICIENT");
  });
});

describe("material", () => {
  it("lists captured pieces per side, pawns first", () => {
    const moves = ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3", "d5a2", "a1a2"];
    const c = replay(moves);
    expect(capturedPieces(c)).toEqual({ w: ["p", "q"], b: ["p", "p"] });
    expect(materialBalance(c)).toBe(8); // queen for a pawn
  });

  it("knows who can still mate (for timeouts)", () => {
    const loneKing = new Chess("8/8/8/4k3/8/8/8/4K2R w - - 0 1");
    expect(canStillMate(loneKing, "w")).toBe(true);
    expect(canStillMate(loneKing, "b")).toBe(false);
    const knight = new Chess("8/8/8/4k3/8/8/8/4K1N1 w - - 0 1");
    expect(canStillMate(knight, "w")).toBe(false);
  });
});
