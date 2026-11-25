import { describe, expect, it } from "vitest";
import { CHESS_TIMINGS } from "./config";
import {
  chessNextWakeAt,
  initialChessState,
  reduceChess,
  toChessPrivateView,
  toChessPublicState,
  type ChessEvent,
  type ChessIntent,
  type ChessReduceResult,
  type ChessRoomState,
} from "./machine";
import { chessPublicStateSchema } from "./protocol";

const FOOLS_MATE = ["f2f3", "e7e5", "g2g4", "d8h4"];

/** A tiny room driver: deterministic time and randomness. */
function room(randomValue = 0.1) {
  let s: ChessRoomState = initialChessState("AB2CD");
  let now = 1_000_000;
  let last: ChessReduceResult = { state: s, effects: [] };
  const ctx = () => ({ now, random: () => randomValue });
  const run = (e: ChessEvent) => {
    last = reduceChess(s, e, ctx());
    s = last.state;
    return last;
  };
  const api = {
    get s() {
      return s;
    },
    get last() {
      return last;
    },
    advance(ms: number) {
      now += ms;
      return run({ type: "TICK" });
    },
    join(
      id: string,
      name: string,
      mode: "host" | "join" = "join",
      token?: string,
    ) {
      return run({
        type: "JOIN",
        connId: `c-${id}-${now}`,
        message: { type: "JOIN", mode, name, ...(token ? { token } : {}) },
        newSeatId: id,
        newToken: `${id}-token-0123456789abcdef`,
      });
    },
    act(id: string, message: ChessIntent) {
      return run({ type: "INTENT", connId: `c-${id}`, seatId: id, message });
    },
    drop(id: string) {
      return run({ type: "DISCONNECT", seatId: id });
    },
    /** Host + guest, game started with `minutes` on the clock. */
    started(minutes: 0 | 5 | 10 | 15 = 10) {
      api.join("ann", "Ann", "host");
      api.join("bob", "Bob");
      api.act("ann", { type: "SET_CLOCK", minutes });
      api.act("ann", { type: "START" });
      return api;
    },
    white() {
      return s.game!.whiteId;
    },
    black() {
      return s.game!.blackId;
    },
    play(...ucis: string[]) {
      for (const uci of ucis) {
        const g = s.game!;
        const id = g.moves.length % 2 === 0 ? g.whiteId : g.blackId;
        const r = api.act(id, { type: "MOVE", uci });
        if (r.effects.some((e) => e.type === "ERROR"))
          throw new Error(`${uci} rejected`);
      }
    },
  };
  return api;
}

const errorCode = (r: ChessReduceResult) => {
  const error = r.effects.find((e) => e.type === "ERROR");
  return error?.type === "ERROR" ? error.code : null;
};

describe("joining", () => {
  it("hosts, joins, and fills up at two players", () => {
    const r = room();
    expect(errorCode(r.join("x", "Xena"))).toBe("ROOM_NOT_FOUND");
    r.join("ann", "Ann", "host");
    expect(r.s.hostId).toBe("ann");
    expect(errorCode(r.join("x", "ann"))).toBe("NAME_TAKEN");
    r.join("bob", "Bob");
    expect(r.s.players.map((p) => p.id)).toEqual(["ann", "bob"]);
    expect(errorCode(r.join("cat", "Cat"))).toBe("ROOM_FULL");
    expect(errorCode(r.join("dan", "Dan", "host"))).toBe("CODE_IN_USE");
  });

  it("gives each player a different doodle", () => {
    const r = room();
    r.join("ann", "Ann", "host");
    r.join("bob", "Bob");
    const [a, b] = r.s.players;
    expect(a.avatar).not.toBe(b.avatar);
    expect(
      errorCode(r.act("bob", { type: "SET_AVATAR", avatar: a.avatar })),
    ).toBe("AVATAR_TAKEN");
  });

  it("reclaims a seat with its token, even mid-game", () => {
    const r = room().started();
    r.drop("bob");
    r.join("bob2", "Bob", "join", "bob-token-0123456789abcdef");
    expect(r.s.players.find((p) => p.id === "bob")?.connected).toBe(true);
    expect(r.last.effects.map((e) => e.type)).toEqual([
      "BIND",
      "REPLACE_OTHERS",
    ]);
  });

  it("never broadcasts tokens", () => {
    const r = room().started();
    const pub = toChessPublicState(r.s);
    expect(JSON.stringify(pub)).not.toContain("token");
    expect(chessPublicStateSchema.safeParse(pub).success).toBe(true);
    expect(toChessPrivateView(r.s, "ann")?.token).toBe(
      "ann-token-0123456789abcdef",
    );
  });
});

describe("starting", () => {
  it("only the host starts, and only with both players here", () => {
    const r = room();
    r.join("ann", "Ann", "host");
    expect(errorCode(r.act("ann", { type: "START" }))).toBe(
      "NOT_ENOUGH_PLAYERS",
    );
    r.join("bob", "Bob");
    expect(errorCode(r.act("bob", { type: "START" }))).toBe("NOT_HOST");
    expect(errorCode(r.act("bob", { type: "SET_CLOCK", minutes: 5 }))).toBe(
      "NOT_HOST",
    );
    r.act("ann", { type: "START" });
    expect(r.s.phase).toBe("PLAYING");
  });

  it("picks colors at random, then swaps them every game", () => {
    const r = room(0.1).started(); // random < 0.5: host is white
    expect(r.white()).toBe("ann");
    r.act("ann", { type: "RESIGN" });
    r.act("ann", { type: "START" });
    expect(r.white()).toBe("bob");
    r.act("bob", { type: "RESIGN" });
    r.act("ann", { type: "START" });
    expect(r.white()).toBe("ann");
    expect(room(0.9).started().white()).toBe("bob");
  });
});

describe("moves", () => {
  it("only lets the side to move play legal moves", () => {
    const r = room().started();
    expect(errorCode(r.act(r.black(), { type: "MOVE", uci: "e7e5" }))).toBe(
      "NOT_YOUR_TURN",
    );
    expect(errorCode(r.act(r.white(), { type: "MOVE", uci: "e2e5" }))).toBe(
      "ILLEGAL_MOVE",
    );
    r.play("e2e4", "e7e5");
    expect(r.s.game!.moves).toEqual(["e2e4", "e7e5"]);
  });

  it("ends in checkmate and goes back to the room with the result", () => {
    const r = room().started();
    const black = r.black();
    r.play(...FOOLS_MATE);
    expect(r.s.phase).toBe("LOBBY");
    expect(r.s.game).toBeNull();
    expect(r.s.result).toMatchObject({
      outcome: "CHECKMATE",
      winner: "b",
      moves: FOOLS_MATE,
    });
    expect(r.s.result!.black.id).toBe(black);
  });

  it("runs the clocks: White's first move is free, then time comes off the mover", () => {
    const r = room().started(5);
    r.advance(3_000);
    r.play("e2e4");
    expect(r.s.game!.remaining).toEqual({ w: 300_000, b: 300_000 });
    r.advance(7_000);
    r.play("e7e5");
    expect(r.s.game!.remaining).toEqual({ w: 300_000, b: 293_000 });
    r.advance(4_000);
    r.play("g1f3");
    expect(r.s.game!.remaining).toEqual({ w: 296_000, b: 293_000 });
  });

  it("loses on time when the clock runs out", () => {
    const r = room().started(5);
    r.play("e2e4");
    expect(chessNextWakeAt(r.s, 0)).toBe(r.s.game!.turnStartedAt + 300_000);
    r.advance(300_000);
    expect(r.s.result).toMatchObject({ outcome: "TIMEOUT", winner: "w" });
  });

  it("cancels a timed game if White doesn't move within 30s", () => {
    const r = room().started(5);
    const due = r.s.game!.turnStartedAt + CHESS_TIMINGS.FIRST_MOVE_MS;
    expect(toChessPublicState(r.s).game!.firstMoveBy).toBe(due);
    expect(chessNextWakeAt(r.s, 0)).toBe(due);
    r.advance(CHESS_TIMINGS.FIRST_MOVE_MS - 1);
    expect(r.s.phase).toBe("PLAYING");
    r.advance(1);
    expect(r.s.result).toMatchObject({ outcome: "ABORTED", winner: null });
  });

  it("drops the first-move deadline once White has moved", () => {
    const r = room().started(5);
    r.play("e2e4");
    expect(toChessPublicState(r.s).game!.firstMoveBy).toBeNull();
    r.advance(CHESS_TIMINGS.FIRST_MOVE_MS + 1_000);
    expect(r.s.phase).toBe("PLAYING");
  });

  it("has no clock and no flag deadline when untimed", () => {
    const r = room().started(0);
    expect(r.s.game!.remaining).toBeNull();
    expect(chessNextWakeAt(r.s, 0)).toBeNull();
    expect(toChessPublicState(r.s).game!.firstMoveBy).toBeNull();
    r.advance(3_600_000);
    expect(r.s.phase).toBe("PLAYING");
  });
});

describe("resign and draws", () => {
  it("resigning gives the opponent the win", () => {
    const r = room().started();
    r.act(r.black(), { type: "RESIGN" });
    expect(r.s.result).toMatchObject({ outcome: "RESIGNED", winner: "w" });
  });

  it("draw offers can be accepted or declined", () => {
    const r = room().started();
    const [w, b] = [r.white(), r.black()];
    expect(errorCode(r.act(b, { type: "ANSWER_DRAW", accept: true }))).toBe(
      "NO_DRAW_OFFER",
    );
    r.act(w, { type: "OFFER_DRAW" });
    expect(r.s.game!.drawOfferBy).toBe("w");
    r.act(b, { type: "ANSWER_DRAW", accept: false });
    expect(r.s.game!.drawOfferBy).toBeNull();
    r.act(w, { type: "OFFER_DRAW" });
    r.act(b, { type: "ANSWER_DRAW", accept: true });
    expect(r.s.result).toMatchObject({ outcome: "DRAW_AGREED", winner: null });
  });

  it("moving instead of answering declines the offer; offering back accepts", () => {
    const r = room().started();
    r.act(r.white(), { type: "OFFER_DRAW" });
    r.play("e2e4"); // White's own move keeps the offer
    expect(r.s.game!.drawOfferBy).toBe("w");
    r.play("e7e5"); // Black plays on: declined
    expect(r.s.game!.drawOfferBy).toBeNull();
    r.act(r.black(), { type: "OFFER_DRAW" });
    r.act(r.white(), { type: "OFFER_DRAW" });
    expect(r.s.result?.outcome).toBe("DRAW_AGREED");
  });
});

describe("leaving", () => {
  it("a player who stays away 60s mid-game loses", () => {
    const r = room().started(0);
    const black = r.black();
    r.drop(black);
    const pub = toChessPublicState(r.s);
    expect(pub.players.find((p) => p.id === black)?.awayUntil).toBe(
      r.s.players.find((p) => p.id === black)!.disconnectedAt! +
        CHESS_TIMINGS.RECONNECT_GRACE_MS,
    );
    r.advance(CHESS_TIMINGS.RECONNECT_GRACE_MS - 1);
    expect(r.s.phase).toBe("PLAYING");
    r.advance(1);
    expect(r.s.result).toMatchObject({ outcome: "ABANDONED", winner: "w" });
    expect(r.s.players.map((p) => p.id)).not.toContain(black);
  });

  it("in the waiting room the seat is freed and the host passes on", () => {
    const r = room();
    r.join("ann", "Ann", "host");
    r.join("bob", "Bob");
    r.drop("ann");
    expect(r.s.hostId).toBe("ann"); // still within the grace period
    r.advance(CHESS_TIMINGS.RECONNECT_GRACE_MS);
    expect(r.s.players.map((p) => p.id)).toEqual(["bob"]);
    expect(r.s.hostId).toBe("bob");
  });

  it("an empty room is wiped after a while", () => {
    const r = room();
    r.join("ann", "Ann", "host");
    r.drop("ann");
    r.advance(CHESS_TIMINGS.EMPTY_ROOM_TTL_MS);
    expect(r.last.effects).toEqual([{ type: "CLEANUP" }]);
    expect(r.s.hosted).toBe(false);
  });
});

describe("closing the room", () => {
  it("closes once both players are gone; the code is dead after that", () => {
    const r = room().started();
    r.drop("ann");
    r.drop("bob");
    r.advance(CHESS_TIMINGS.RECONNECT_GRACE_MS);
    expect(r.s.hosted).toBe(false);
    expect(r.last.effects.at(-1)).toEqual({ type: "CLEANUP" });
    expect(errorCode(r.join("cid", "Cid"))).toBe("ROOM_NOT_FOUND");
    expect(
      errorCode(r.join("ann2", "Ann", "host", "ann-token-0123456789abcdef")),
    ).toBe("ROOM_NOT_FOUND");
  });

  it("a refresh inside the reconnect window keeps the room", () => {
    const r = room().started();
    r.drop("ann");
    r.drop("bob");
    r.advance(10_000);
    r.join("ann2", "Ann", "host", "ann-token-0123456789abcdef");
    r.advance(CHESS_TIMINGS.RECONNECT_GRACE_MS);
    expect(r.s.hosted).toBe(true);
    expect(r.s.players.map((p) => p.id)).toEqual(["ann"]);
  });

  it("leaving mid-game loses it and frees the seat", () => {
    const r = room().started();
    const black = r.black();
    r.act(black, { type: "LEAVE" });
    expect(r.s.result).toMatchObject({ outcome: "ABANDONED", winner: "w" });
    expect(r.s.players.map((p) => p.id)).not.toContain(black);
    expect(r.s.hosted).toBe(true);
  });

  it("the last one to leave closes the room right away", () => {
    const r = room();
    r.join("ann", "Ann", "host");
    r.join("bob", "Bob");
    r.act("bob", { type: "LEAVE" });
    expect(r.s.hostId).toBe("ann");
    r.act("ann", { type: "LEAVE" });
    expect(r.s.hosted).toBe(false);
    expect(r.last.effects).toEqual([{ type: "CLEANUP" }]);
    expect(errorCode(r.join("bob", "Bob"))).toBe("ROOM_NOT_FOUND");
  });
});
