import { describe, expect, it } from "vitest";
import { AVATARS, LIMITS, TIMINGS } from "./config";
import {
  decideOutcome,
  hintRevealsWord,
  initialState,
  nextWakeAt,
  reduce,
  toPrivateView,
  toPublicState,
  type Effect,
  type MachineEvent,
  type SeatIntent,
} from "./game-machine";
import type { RoomState, SecretWord } from "./model";
import { publicStateSchema } from "./protocol";

const WORDS: SecretWord[] = [
  { id: "w1", word: "Titanic", category: "Movie", imposterClue: "Ocean" },
  { id: "w2", word: "Eiffel Tower", category: "Place", imposterClue: "Paris" },
  { id: "w3", word: "Pizza", category: "Food", imposterClue: "Oven" },
];

/** A tiny room driver: fake clock, deterministic randomness, event log. */
function room(opts: { random?: () => number } = {}) {
  let state: RoomState = initialState("AB2CD");
  let now = 1_000_000;
  let n = 0;
  const effects: Effect[] = [];
  const random = opts.random ?? (() => 0);
  const ctx = () => ({ now, random, words: WORDS });
  const apply = (event: MachineEvent) => {
    const r = reduce(state, event, ctx());
    state = r.state;
    effects.push(...r.effects);
    return r;
  };
  const api = {
    get state() {
      return state;
    },
    effects,
    advance(ms: number) {
      now += ms;
      return apply({ type: "TICK" });
    },
    get now() {
      return now;
    },
    join(name: string, mode: "host" | "join" = "join", token?: string) {
      n += 1;
      const r = apply({
        type: "JOIN",
        connId: `c${n}`,
        message: {
          type: "JOIN",
          mode,
          name,
          avatar: AVATARS[n % AVATARS.length],
          ...(token ? { token } : {}),
        },
        newSeatId: `p${n}`,
        newToken: `token-${n}-${"x".repeat(16)}`,
      });
      return r;
    },
    act(seatId: string, message: SeatIntent) {
      return apply({
        type: "INTENT",
        connId: `conn-${seatId}`,
        seatId,
        message,
      });
    },
    drop(seatId: string) {
      return apply({ type: "DISCONNECT", seatId });
    },
    errorOf(r: { effects: Effect[] }) {
      const e = r.effects.find((x) => x.type === "ERROR");
      return e && e.type === "ERROR" ? e.code : null;
    },
  };
  return api;
}

/** Host + n-1 players, started; returns the driver and seat ids. */
function started(players = 4, random?: () => number) {
  const r = room({ random });
  r.join("Host", "host");
  for (let i = 2; i <= players; i++) r.join(`Player${i}`);
  r.act("p1", { type: "START" });
  const ids = r.state.players.map((p) => p.id);
  return { r, ids };
}

/** REVEAL → HINTS, then every hinter submits, ending in DISCUSSION. */
function throughHints(r: ReturnType<typeof room>) {
  r.advance(TIMINGS.REVEAL_MS);
  for (const id of [...r.state.round!.turnOrder]) {
    r.act(id, { type: "SUBMIT_HINT", text: "cold" });
  }
}

function toVoting(r: ReturnType<typeof room>) {
  throughHints(r);
  r.advance(TIMINGS.DISCUSSION_MS);
}

describe("lobby: host and join", () => {
  it("first host creates the room and becomes host", () => {
    const r = room();
    r.join("Ren", "host");
    expect(r.state.hosted).toBe(true);
    expect(r.state.hostId).toBe("p1");
    expect(r.effects).toContainEqual({
      type: "BIND",
      connId: "c1",
      seatId: "p1",
    });
  });

  it("rejects joining a room that was never hosted", () => {
    expect(room().errorOf(room().join("Ren"))).toBe("ROOM_NOT_FOUND");
  });

  it("rejects hosting a code that is in use", () => {
    const r = room();
    r.join("Ren", "host");
    expect(r.errorOf(r.join("Other", "host"))).toBe("CODE_IN_USE");
  });

  it("rejects taken names (ignoring case) and full rooms", () => {
    const r = room();
    r.join("Ren", "host");
    expect(r.errorOf(r.join("REN"))).toBe("NAME_TAKEN");
    r.act("p1", { type: "SET_MAX_PLAYERS", maxPlayers: 3 });
    r.join("Two");
    r.join("Three");
    expect(r.errorOf(r.join("Four"))).toBe("ROOM_FULL");
  });

  it("gives a free doodle when the preferred one is taken (joining never fails on avatars)", () => {
    const r = room();
    r.join("Ren", "host");
    const taken = r.state.players[0].avatar;
    const res = reduce(
      r.state,
      {
        type: "JOIN",
        connId: "x",
        message: { type: "JOIN", mode: "join", name: "Copy", avatar: taken },
        newSeatId: "px",
        newToken: "t".repeat(20),
      },
      { now: 0, random: () => 0, words: WORDS },
    );
    expect(res.effects).toContainEqual({
      type: "BIND",
      connId: "x",
      seatId: "px",
    });
    const copy = res.state.players.find((p) => p.id === "px")!;
    expect(copy.avatar).not.toBe(taken);
  });

  it("assigns a doodle when none is requested, all unique", () => {
    const r = room();
    const join = (id: string, name: string, mode: "host" | "join") => {
      const res = reduce(
        r.state,
        {
          type: "JOIN",
          connId: id,
          message: { type: "JOIN", mode, name },
          newSeatId: id,
          newToken: `${id}-${"t".repeat(20)}`,
        },
        { now: 0, random: Math.random, words: WORDS },
      );
      return res.state;
    };
    let s = join("a", "Ann", "host");
    for (const [id, name] of [
      ["b", "Bob"],
      ["c", "Cid"],
      ["d", "Dee"],
    ] as const) {
      s = reduce(
        s,
        {
          type: "JOIN",
          connId: id,
          message: { type: "JOIN", mode: "join", name },
          newSeatId: id,
          newToken: `${id}-${"t".repeat(20)}`,
        },
        { now: 0, random: Math.random, words: WORDS },
      ).state;
    }
    const avatars = s.players.map((p) => p.avatar);
    expect(avatars).toHaveLength(4);
    expect(new Set(avatars).size).toBe(4);
    for (const a of avatars) expect(AVATARS).toContain(a);
  });

  it("lets players switch to a free doodle in the lobby only", () => {
    const r = room();
    r.join("Host", "host");
    r.join("Two");
    const [host, two] = r.state.players;
    const free = AVATARS.find((a) => a !== host.avatar && a !== two.avatar)!;
    r.act("p1", { type: "SET_AVATAR", avatar: free });
    expect(r.state.players[0].avatar).toBe(free);
    expect(r.errorOf(r.act("p2", { type: "SET_AVATAR", avatar: free }))).toBe(
      "AVATAR_TAKEN",
    );
    r.join("Three");
    r.act("p1", { type: "START" });
    expect(
      r.errorOf(r.act("p1", { type: "SET_AVATAR", avatar: host.avatar })),
    ).toBe("WRONG_PHASE");
  });

  it("rejects new players once a round is in progress", () => {
    const { r } = started(3);
    expect(r.errorOf(r.join("Late"))).toBe("IN_PROGRESS");
  });

  it("only the host can start, and only with 3+ connected players", () => {
    const r = room();
    r.join("Host", "host");
    r.join("Two");
    expect(r.errorOf(r.act("p2", { type: "START" }))).toBe("NOT_HOST");
    expect(r.errorOf(r.act("p1", { type: "START" }))).toBe(
      "NOT_ENOUGH_PLAYERS",
    );
    r.join("Three");
    r.act("p1", { type: "START" });
    expect(r.state.phase).toBe("REVEAL");
    expect(r.state.phaseEndsAt).toBe(r.now + TIMINGS.REVEAL_MS);
  });

  it("can't lower max players below the current count", () => {
    const r = room();
    r.join("Host", "host");
    r.join("Two");
    r.join("Three");
    r.join("Four");
    expect(
      r.errorOf(r.act("p1", { type: "SET_MAX_PLAYERS", maxPlayers: 3 })),
    ).toBe("INVALID_MESSAGE");
  });
});

describe("assign and reveal", () => {
  it("deals every player in, picks one imposter and a word", () => {
    const { r, ids } = started(5);
    const round = r.state.round!;
    expect([...round.turnOrder].sort()).toEqual([...ids].sort());
    expect(ids).toContain(round.imposterId);
    expect(WORDS.map((w) => w.id)).toContain(round.secret.id);
  });

  it("never repeats a word in a session until the bank is used up", () => {
    const { r } = started(3, Math.random);
    const seen: string[] = [r.state.round!.secret.id];
    for (let i = 0; i < 2; i++) {
      toVoting(r);
      r.advance(TIMINGS.VOTE_MS);
      r.act(r.state.hostId!, { type: "PLAY_AGAIN" });
      r.act(r.state.hostId!, { type: "START" });
      seen.push(r.state.round!.secret.id);
    }
    expect(new Set(seen).size).toBe(3);
    // Fourth round: bank exhausted → reshuffled, still works.
    toVoting(r);
    r.advance(TIMINGS.VOTE_MS);
    r.act(r.state.hostId!, { type: "PLAY_AGAIN" });
    r.act(r.state.hostId!, { type: "START" });
    expect(r.state.phase).toBe("REVEAL");
  });

  it("sends the word + the imposter's clue to crewmates, only category + clue to the imposter", () => {
    const { r, ids } = started(4);
    const imposter = r.state.round!.imposterId;
    for (const id of ids) {
      const view = toPrivateView(r.state, id)!;
      if (id === imposter) {
        expect(view.role).toBe("imposter");
        expect(view.card).toEqual({
          kind: "imposter",
          category: "Movie",
          clue: "Ocean",
        });
      } else {
        expect(view.role).toBe("crewmate");
        expect(view.card).toEqual({
          kind: "word",
          word: "Titanic",
          category: "Movie",
          imposterClue: "Ocean",
        });
      }
    }
  });

  it("goes to HINTS when the reveal timer ends", () => {
    const { r } = started(3);
    r.advance(TIMINGS.REVEAL_MS);
    expect(r.state.phase).toBe("HINTS");
    expect(toPublicState(r.state).round!.activePlayerId).toBe(
      r.state.round!.turnOrder[0],
    );
  });
});

describe("hints", () => {
  it("only the active player may hint, then the turn passes on", () => {
    const { r } = started(3);
    r.advance(TIMINGS.REVEAL_MS);
    const [first, second] = r.state.round!.turnOrder;
    expect(
      r.errorOf(r.act(second, { type: "SUBMIT_HINT", text: "cold" })),
    ).toBe("NOT_YOUR_TURN");
    r.act(first, { type: "SUBMIT_HINT", text: "cold" });
    expect(r.state.round!.hints).toEqual([{ playerId: first, text: "cold" }]);
    expect(toPublicState(r.state).round!.activePlayerId).toBe(second);
    expect(r.state.phaseEndsAt).toBe(r.now + TIMINGS.HINT_MS);
  });

  it("records (no hint) when a turn times out", () => {
    const { r } = started(3);
    r.advance(TIMINGS.REVEAL_MS);
    const first = r.state.round!.turnOrder[0];
    r.advance(TIMINGS.HINT_MS);
    expect(r.state.round!.hints[0]).toEqual({ playerId: first, text: null });
  });

  it("rejects hints that give the word away", () => {
    const { r } = started(3);
    r.advance(TIMINGS.REVEAL_MS);
    const first = r.state.round!.turnOrder[0];
    expect(
      r.errorOf(r.act(first, { type: "SUBMIT_HINT", text: "TITANIC!" })),
    ).toBe("HINT_REVEALS_WORD");
  });

  it("skips a player who disconnects on their turn, and absent players' turns", () => {
    const { r } = started(4);
    r.advance(TIMINGS.REVEAL_MS);
    const order = r.state.round!.turnOrder;
    r.drop(order[2]); // drops before their turn
    r.drop(order[0]); // drops during their turn
    expect(r.state.round!.hints[0]).toEqual({ playerId: order[0], text: null });
    r.act(order[1], { type: "SUBMIT_HINT", text: "cold" });
    // order[2] is skipped automatically.
    expect(r.state.round!.hints[2]).toEqual({ playerId: order[2], text: null });
    expect(toPublicState(r.state).round!.activePlayerId).toBe(order[3]);
  });

  it("goes to DISCUSSION after the last hint", () => {
    const { r } = started(3);
    throughHints(r);
    expect(r.state.phase).toBe("DISCUSSION");
    expect(r.state.phaseEndsAt).toBe(r.now + TIMINGS.DISCUSSION_MS);
  });

  it("shows the writing doodle only for the active player", () => {
    const { r } = started(3);
    r.advance(TIMINGS.REVEAL_MS);
    const [first, second] = r.state.round!.turnOrder;
    r.act(second, { type: "TYPING", typing: true });
    expect(toPublicState(r.state).round!.activeTyping).toBe(false);
    r.act(first, { type: "TYPING", typing: true });
    expect(toPublicState(r.state).round!.activeTyping).toBe(true);
  });
});

describe("discussion and skipping", () => {
  it("locks skipping for the first 30s", () => {
    const { r, ids } = started(3);
    throughHints(r);
    expect(r.errorOf(r.act(ids[0], { type: "TOGGLE_SKIP" }))).toBe("TOO_EARLY");
  });

  it("starts voting once every connected player skips", () => {
    const { r, ids } = started(3);
    throughHints(r);
    r.advance(TIMINGS.SKIP_UNLOCK_MS);
    r.act(ids[0], { type: "TOGGLE_SKIP" });
    r.act(ids[1], { type: "TOGGLE_SKIP" });
    expect(toPublicState(r.state).round!.skipCount).toBe(2);
    r.act(ids[1], { type: "TOGGLE_SKIP" }); // toggles back off
    expect(toPublicState(r.state).round!.skipCount).toBe(1);
    r.act(ids[1], { type: "TOGGLE_SKIP" });
    r.act(ids[2], { type: "TOGGLE_SKIP" });
    expect(r.state.phase).toBe("VOTING");
  });

  it("leaves disconnected players out of the skip denominator", () => {
    const { r, ids } = started(4);
    throughHints(r);
    r.advance(TIMINGS.SKIP_UNLOCK_MS);
    const imposter = r.state.round!.imposterId;
    const others = ids.filter((id) => id !== imposter);
    r.drop(others[0]);
    expect(toPublicState(r.state).round!.eligibleCount).toBe(3);
    for (const id of [imposter, others[1], others[2]])
      r.act(id, { type: "TOGGLE_SKIP" });
    expect(r.state.phase).toBe("VOTING");
  });

  it("starts voting when the discussion timer runs out", () => {
    const { r } = started(3);
    toVoting(r);
    expect(r.state.phase).toBe("VOTING");
    expect(r.state.phaseEndsAt).toBe(r.now + TIMINGS.VOTE_MS);
  });
});

describe("voting and results", () => {
  it("rejects self-votes and votes for strangers; votes can change until locked", () => {
    const { r, ids } = started(3);
    toVoting(r);
    expect(
      r.errorOf(r.act(ids[0], { type: "CAST_VOTE", targetId: ids[0] })),
    ).toBe("INVALID_TARGET");
    expect(
      r.errorOf(r.act(ids[0], { type: "CAST_VOTE", targetId: "nobody" })),
    ).toBe("INVALID_TARGET");
    expect(r.errorOf(r.act(ids[0], { type: "LOCK_VOTE" }))).toBe(
      "INVALID_TARGET",
    );
    r.act(ids[0], { type: "CAST_VOTE", targetId: ids[1] });
    r.act(ids[0], { type: "CAST_VOTE", targetId: ids[2] });
    expect(toPrivateView(r.state, ids[0])!.myVoteTargetId).toBe(ids[2]);
    r.act(ids[0], { type: "LOCK_VOTE" });
    expect(
      r.errorOf(r.act(ids[0], { type: "CAST_VOTE", targetId: ids[1] })),
    ).toBe("ALREADY_LOCKED");
  });

  it("keeps voting anonymous: only a locked count, and only the tally in the result", () => {
    const { r, ids } = started(3);
    toVoting(r);
    r.act(ids[0], { type: "CAST_VOTE", targetId: ids[1] });
    r.act(ids[0], { type: "LOCK_VOTE" });
    const pub = toPublicState(r.state);
    expect(pub.round!.lockedCount).toBe(1);
    expect(JSON.stringify(pub)).not.toContain(`"${ids[1]}":`);
    expect(pub.result).toBeNull();
    r.act(ids[1], { type: "CAST_VOTE", targetId: ids[2] });
    r.act(ids[1], { type: "LOCK_VOTE" });
    r.act(ids[2], { type: "CAST_VOTE", targetId: ids[1] });
    r.act(ids[2], { type: "LOCK_VOTE" });
    const result = toPublicState(r.state).result!;
    expect(result.tally).toEqual({ [ids[1]]: 2, [ids[2]]: 1 });
    expect(result).not.toHaveProperty("votes");
    expect(result.clue).toBe(r.state.lastResult!.secret.imposterClue);
  });

  it("never publishes the hint order, only whose turn it is", () => {
    const shuffledFirst = () => 0.99; // a shuffle that reverses join order
    const { r, ids } = started(4, shuffledFirst);
    const pub = toPublicState(r.state);
    expect(pub.round!.playerIds).toEqual(ids);
    expect(pub.round).not.toHaveProperty("turnOrder");
  });

  it("ends early when everyone has locked, and catches a top-voted imposter", () => {
    const { r, ids } = started(4);
    toVoting(r);
    const imposter = r.state.round!.imposterId;
    const crew = ids.filter((id) => id !== imposter);
    for (const id of crew) {
      r.act(id, { type: "CAST_VOTE", targetId: imposter });
      r.act(id, { type: "LOCK_VOTE" });
    }
    r.act(imposter, { type: "CAST_VOTE", targetId: crew[0] });
    r.act(imposter, { type: "LOCK_VOTE" });
    expect(r.state.phase).toBe("RESULT");
    const result = toPublicState(r.state).result!;
    expect(result.outcome).toBe("CAUGHT");
    expect(result.word).toBe("Titanic");
    expect(result.tally[imposter]).toBe(3);
  });

  it("counts a tie at the top as ESCAPED, and abstainers count for nobody", () => {
    expect(decideOutcome({ a: "imp", b: "x" }, "imp")).toBe("ESCAPED");
    expect(decideOutcome({ a: "imp", b: "imp", c: "x" }, "imp")).toBe("CAUGHT");
    expect(decideOutcome({ a: "x" }, "imp")).toBe("ESCAPED");
    expect(decideOutcome({}, "imp")).toBe("ESCAPED");
  });

  it("resolves on the vote timer with unlocked votes still counted", () => {
    const { r, ids } = started(3);
    toVoting(r);
    const imposter = r.state.round!.imposterId;
    const crew = ids.filter((id) => id !== imposter);
    r.act(crew[0], { type: "CAST_VOTE", targetId: imposter });
    r.advance(TIMINGS.VOTE_MS);
    expect(toPublicState(r.state).result!.outcome).toBe("CAUGHT");
  });

  it("PLAY_AGAIN (host only) returns to the lobby, ready for a new round", () => {
    const { r, ids } = started(3);
    toVoting(r);
    r.advance(TIMINGS.VOTE_MS);
    expect(r.errorOf(r.act(ids[1], { type: "PLAY_AGAIN" }))).toBe("NOT_HOST");
    r.act(ids[0], { type: "PLAY_AGAIN" });
    expect(r.state.phase).toBe("LOBBY");
    expect(r.state.round).toBeNull();
    r.act(ids[0], { type: "START" });
    expect(r.state.round!.number).toBe(2);
  });

  it("rejects intents in the wrong phase", () => {
    const { r, ids } = started(3);
    expect(
      r.errorOf(r.act(ids[0], { type: "SUBMIT_HINT", text: "cold" })),
    ).toBe("WRONG_PHASE");
    expect(r.errorOf(r.act(ids[0], { type: "TOGGLE_SKIP" }))).toBe(
      "WRONG_PHASE",
    );
    expect(
      r.errorOf(r.act(ids[0], { type: "CAST_VOTE", targetId: ids[1] })),
    ).toBe("WRONG_PHASE");
    expect(r.errorOf(r.act(ids[0], { type: "PLAY_AGAIN" }))).toBe(
      "WRONG_PHASE",
    );
    expect(r.errorOf(r.act(ids[0], { type: "START" }))).toBe("WRONG_PHASE");
  });
});

describe("connections and edge cases", () => {
  it("restores the same seat, role and card with the session token", () => {
    const { r } = started(3);
    const imposter = r.state.round!.imposterId;
    const token = r.state.players.find((p) => p.id === imposter)!.token;
    r.drop(imposter);
    r.advance(5_000);
    r.join("ignored", "join", token);
    expect(r.state.players.find((p) => p.id === imposter)!.connected).toBe(
      true,
    );
    expect(r.state.round!.imposterId).toBe(imposter);
    expect(toPrivateView(r.state, imposter)!.role).toBe("imposter");
    expect(r.effects).toContainEqual(
      expect.objectContaining({ type: "REPLACE_OTHERS", seatId: imposter }),
    );
  });

  it("ends the round as IMPOSTER_FLED once the imposter is gone past the grace period", () => {
    const { r } = started(4);
    const imposter = r.state.round!.imposterId;
    r.drop(imposter);
    r.advance(TIMINGS.RECONNECT_GRACE_MS - 1);
    expect(r.state.phase).not.toBe("RESULT"); // still within the grace period
    r.advance(1);
    expect(r.state.phase).toBe("RESULT");
    expect(r.state.lastResult!.outcome).toBe("IMPOSTER_FLED");
  });

  it("ends the round when fewer than 3 players remain", () => {
    const { r } = started(3);
    const crew = r.state.round!.turnOrder.find(
      (id) => id !== r.state.round!.imposterId,
    )!;
    r.drop(crew);
    r.advance(TIMINGS.RECONNECT_GRACE_MS);
    expect(r.state.lastResult!.outcome).toBe("TOO_FEW_PLAYERS");
  });

  it("shows a dropped player as reconnecting, then as left; the round goes on", () => {
    const { r } = started(5);
    const crew = r.state.round!.turnOrder.find(
      (id) => id !== r.state.round!.imposterId,
    )!;
    const token = r.state.players.find((p) => p.id === crew)!.token;
    r.drop(crew);
    let me = toPublicState(r.state).players.find((p) => p.id === crew)!;
    expect(me).toMatchObject({ connected: false, left: false }); // reconnecting…
    r.advance(TIMINGS.RECONNECT_GRACE_MS);
    me = toPublicState(r.state).players.find((p) => p.id === crew)!;
    expect(me).toMatchObject({ connected: false, left: true }); // left
    expect(r.state.phase).not.toBe("RESULT"); // 4 still here: keep playing
    // Too late to reclaim the seat this round.
    expect(r.errorOf(r.join("again", "join", token))).toBe("IN_PROGRESS");
  });

  it("hands host to the next-earliest player mid-round, and the round continues", () => {
    const { r, ids } = started(4, () => 0.99);
    const imposter = r.state.round!.imposterId;
    expect(imposter).not.toBe(ids[0]);
    r.drop(ids[0]); // the host
    r.advance(TIMINGS.RECONNECT_GRACE_MS - 1);
    expect(r.state.hostId).toBe(ids[0]); // still reconnecting
    r.advance(1);
    expect(r.state.hostId).toBe(ids[1]);
    expect(r.state.phase).not.toBe("RESULT");
  });

  it("drops a vote cast by someone who then left, and refuses votes for them", () => {
    const { r } = started(5);
    toVoting(r);
    const imp = r.state.round!.imposterId;
    const [a, b] = r.state.round!.turnOrder.filter((id) => id !== imp);
    r.act(a, { type: "CAST_VOTE", targetId: imp });
    r.drop(a);
    r.advance(TIMINGS.RECONNECT_GRACE_MS);
    expect(r.state.round!.votes[a]).toBeUndefined();
    expect(r.errorOf(r.act(b, { type: "CAST_VOTE", targetId: a }))).toBe(
      "INVALID_TARGET",
    );
  });

  it("passes host to the longest-connected player after the grace period", () => {
    const r = room();
    r.join("Host", "host");
    r.join("Second");
    r.join("Third");
    r.drop("p1");
    expect(r.state.hostId).toBe("p1"); // a quick refresh keeps host
    r.advance(TIMINGS.RECONNECT_GRACE_MS);
    expect(r.state.hostId).toBe("p2");
    expect(r.state.players.map((p) => p.id)).toEqual(["p2", "p3"]); // seat released
  });

  it("wipes the room 10 minutes after the last player leaves", () => {
    const r = room();
    r.join("Host", "host");
    r.drop("p1");
    expect(nextWakeAt(r.state, r.now)).toBe(r.now + TIMINGS.RECONNECT_GRACE_MS);
    r.advance(TIMINGS.EMPTY_ROOM_TTL_MS);
    expect(r.effects).toContainEqual({ type: "CLEANUP" });
    expect(r.state.hosted).toBe(false);
  });

  it("schedules the next alarm at the earliest deadline", () => {
    const { r } = started(3);
    expect(nextWakeAt(r.state, r.now)).toBe(r.now + TIMINGS.REVEAL_MS);
    expect(nextWakeAt(initialState("X"), 0)).toBeNull();
  });

  it("ignores no-op events without bumping the version", () => {
    const { r } = started(3);
    const before = r.state;
    r.advance(1); // nothing due yet
    expect(r.state).toBe(before);
  });
});

describe("privacy", () => {
  it("never puts the word or imposter in public state before RESULT", () => {
    const { r } = started(LIMITS.MAX_PLAYERS);
    const word = r.state.round!.secret.word;
    const check = () => {
      const pub = toPublicState(r.state);
      expect(publicStateSchema.safeParse(pub).success).toBe(true);
      const json = JSON.stringify(pub);
      if (r.state.phase !== "RESULT") {
        expect(json).not.toContain(word);
        expect(json).not.toContain("imposter");
        expect(json).not.toContain("token-");
      }
    };
    check();
    r.advance(TIMINGS.REVEAL_MS);
    check();
    for (const id of [...r.state.round!.turnOrder]) {
      r.act(id, { type: "SUBMIT_HINT", text: "cold" });
      check();
    }
    r.advance(TIMINGS.DISCUSSION_MS);
    check();
    r.advance(TIMINGS.VOTE_MS);
    expect(toPublicState(r.state).result!.word).toBe(word);
  });

  it("detects hints that reveal the word", () => {
    expect(hintRevealsWord("titanic", "Titanic")).toBe(true);
    expect(hintRevealsWord("TI tanic", "Titanic")).toBe(true);
    expect(hintRevealsWord("big tower", "Eiffel Tower")).toBe(true);
    expect(hintRevealsWord("Paris night", "Eiffel Tower")).toBe(false);
    expect(hintRevealsWord("Pokémon", "Pokemon")).toBe(true);
    expect(hintRevealsWord("cold sea", "Titanic")).toBe(false);
  });
});
