/**
 * Simulated games: 5 fake clients against the room logic, with message
 * delivery that mirrors the Durable Object adapter (party/src/index.ts):
 * every change broadcasts the public STATE to all seated connections and
 * each private YOU only to its owner; alarms fire from nextWakeAt() on a
 * fake clock. Lets us assert what each client actually *receives*.
 */
import { describe, expect, it } from "vitest";
import { IMPOSTER_WORDS } from "../data/imposter-words";
import { AVATARS, TIMINGS } from "./config";
import {
  initialState,
  nextWakeAt,
  reduce,
  toPrivateView,
  toPublicState,
  type MachineEvent,
  type SeatIntent,
} from "./game-machine";
import type { RoomState } from "./model";
import {
  serverMessageSchema,
  type PrivateView,
  type PublicState,
  type ServerMessage,
} from "./protocol";

type Conn = {
  id: string;
  seatId: string | null;
  open: boolean;
  inbox: ServerMessage[];
};

class SimRoom {
  state: RoomState = initialState("SIM42");
  now = 1_000_000;
  conns = new Map<string, Conn>();
  private n = 0;
  private seq = 0;
  /** Deterministic randomness for the deal. */
  private seed = 7;
  private random = () =>
    (this.seed = (this.seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

  connect(): Conn {
    const conn: Conn = {
      id: `conn-${++this.n}`,
      seatId: null,
      open: true,
      inbox: [],
    };
    this.conns.set(conn.id, conn);
    return conn;
  }

  private deliver(conn: Conn, message: ServerMessage) {
    // Everything on the wire must match the protocol schema.
    expect(serverMessageSchema.safeParse(message).success).toBe(true);
    if (conn.open) conn.inbox.push(structuredClone(message));
  }

  private sendStateTo(conn: Conn) {
    if (!conn.open || !conn.seatId) return;
    const you = toPrivateView(this.state, conn.seatId);
    if (!you) {
      conn.seatId = null;
      return;
    }
    this.deliver(conn, { type: "STATE", state: toPublicState(this.state) });
    this.deliver(conn, { type: "YOU", you });
  }

  apply(event: MachineEvent, origin?: Conn) {
    const prev = this.state;
    const { state, effects } = reduce(prev, event, {
      now: this.now,
      random: this.random,
      words: IMPOSTER_WORDS,
    });
    let bound: Conn | null = null;
    for (const e of effects) {
      if (e.type === "ERROR" && origin?.id === e.connId) {
        this.deliver(origin, {
          type: "ERROR",
          code: e.code,
          message: e.message,
        });
      } else if (e.type === "BIND" && origin?.id === e.connId) {
        origin.seatId = e.seatId;
        bound = origin;
      } else if (e.type === "REPLACE_OTHERS") {
        for (const other of this.conns.values()) {
          if (
            other.id !== e.connId &&
            other.seatId === e.seatId &&
            other.open
          ) {
            this.deliver(other, {
              type: "ERROR",
              code: "REPLACED",
              message: "Replaced",
            });
            other.seatId = null;
            other.open = false;
          }
        }
      }
    }
    this.state = state;
    if (state !== prev)
      for (const c of this.conns.values()) this.sendStateTo(c);
    else if (bound) this.sendStateTo(bound);
  }

  join(
    conn: Conn,
    name: string,
    mode: "host" | "join" = "join",
    token?: string,
  ) {
    // Each new seat gets its own doodle (avatars are unique per room).
    const seat = ++this.seq;
    this.apply(
      {
        type: "JOIN",
        connId: conn.id,
        message: {
          type: "JOIN",
          mode,
          name,
          avatar: AVATARS[seat % AVATARS.length],
          ...(token ? { token } : {}),
        },
        newSeatId: `seat-${seat}`,
        newToken: `token-${seat}-${"x".repeat(20)}`,
      },
      conn,
    );
  }

  act(conn: Conn, message: SeatIntent) {
    if (!conn.seatId) throw new Error(`${conn.id} is not seated`);
    this.apply(
      { type: "INTENT", connId: conn.id, seatId: conn.seatId, message },
      conn,
    );
  }

  /** Socket closes; DISCONNECT only if no other connection holds the seat. */
  close(conn: Conn) {
    conn.open = false;
    const seatId = conn.seatId;
    conn.seatId = null;
    if (!seatId) return;
    const stillHeld = [...this.conns.values()].some(
      (c) => c.open && c.seatId === seatId,
    );
    if (!stillHeld) this.apply({ type: "DISCONNECT", seatId });
  }

  /** Moves the clock forward, firing every alarm that falls due on the way. */
  advance(ms: number) {
    const target = this.now + ms;
    for (let guard = 0; guard < 1000; guard++) {
      const wake = nextWakeAt(this.state, this.now);
      if (wake === null || wake > target) break;
      this.now = Math.max(this.now, wake);
      const before = this.state;
      this.apply({ type: "TICK" });
      if (this.state === before && nextWakeAt(this.state, this.now) === wake)
        break;
    }
    this.now = target;
  }
}

const lastOf = <T extends ServerMessage["type"]>(conn: Conn, type: T) =>
  [...conn.inbox].reverse().find((m) => m.type === type) as
    Extract<ServerMessage, { type: T }> | undefined;
const pub = (conn: Conn): PublicState => lastOf(conn, "STATE")!.state;
const you = (conn: Conn): PrivateView => lastOf(conn, "YOU")!.you;
const errors = (conn: Conn) =>
  conn.inbox
    .filter((m) => m.type === "ERROR")
    .map((m) => (m.type === "ERROR" ? m.code : ""));

/** Host + 4 players seated in a fresh room, round started. */
function fiveStarted() {
  const room = new SimRoom();
  const clients = Array.from({ length: 5 }, () => room.connect());
  room.join(clients[0], "Host", "host");
  ["Ann", "Bob", "Cid", "Dee"].forEach((name, i) =>
    room.join(clients[i + 1], name),
  );
  room.act(clients[0], { type: "START" });
  return { room, clients };
}

function hintAll(room: SimRoom, clients: Conn[]) {
  room.advance(TIMINGS.REVEAL_MS);
  for (let i = 0; i < 10 && room.state.phase === "HINTS"; i++) {
    const activeSeat = room.state.round!.turnOrder[room.state.round!.turnIndex];
    const active = clients.find((c) => c.seatId === activeSeat && c.open);
    if (!active) {
      room.advance(TIMINGS.HINT_MS);
      continue;
    }
    room.act(active, { type: "SUBMIT_HINT", text: `hint ${i + 1}` });
  }
}

describe("simulated 5-player game", () => {
  it("plays a full round, then a second one, with private cards kept private", () => {
    const { room, clients } = fiveStarted();
    expect(pub(clients[0]).phase).toBe("REVEAL");

    // Every client gets exactly its own private view, never someone else's.
    for (const c of clients) {
      for (const m of c.inbox)
        if (m.type === "YOU") expect(m.you.playerId).toBe(c.seatId);
    }
    const views = clients.map(you);
    const imposters = views.filter((v) => v.role === "imposter");
    const crew = views.filter((v) => v.role === "crewmate");
    expect(imposters).toHaveLength(1);
    expect(crew).toHaveLength(4);
    const word = crew[0].card!.kind === "word" ? crew[0].card!.word : "";
    for (const v of crew) expect(v.card).toMatchObject({ kind: "word", word });
    expect(imposters[0].card).toMatchObject({ kind: "imposter" });
    const imposterClient = clients.find((c) => you(c).role === "imposter")!;
    // The imposter never receives the word, in any frame.
    expect(JSON.stringify(imposterClient.inbox)).not.toContain(`"${word}"`);

    hintAll(room, clients);
    expect(pub(clients[2]).phase).toBe("DISCUSSION");
    expect(pub(clients[2]).round!.hints.map((h) => h.text)).toEqual([
      "hint 1",
      "hint 2",
      "hint 3",
      "hint 4",
      "hint 5",
    ]);

    room.advance(TIMINGS.SKIP_UNLOCK_MS);
    for (const c of clients) room.act(c, { type: "TOGGLE_SKIP" });
    expect(pub(clients[0]).phase).toBe("VOTING");

    // No public STATE frame mentions the word before RESULT.
    for (const c of clients) {
      for (const m of c.inbox) {
        if (
          m.type === "STATE" &&
          m.state.phase !== "RESULT" &&
          !m.state.result
        ) {
          expect(JSON.stringify(m.state)).not.toContain(word);
        }
      }
    }

    const imposterSeat = imposterClient.seatId!;
    const crewClients = clients.filter((c) => c !== imposterClient);
    for (const c of crewClients) {
      room.act(c, { type: "CAST_VOTE", targetId: imposterSeat });
      room.act(c, { type: "LOCK_VOTE" });
    }
    room.act(imposterClient, {
      type: "CAST_VOTE",
      targetId: crewClients[0].seatId!,
    });
    room.act(imposterClient, { type: "LOCK_VOTE" });

    const result = pub(clients[3]).result!;
    expect(pub(clients[3]).phase).toBe("RESULT");
    expect(result).toMatchObject({
      outcome: "CAUGHT",
      imposterId: imposterSeat,
      word,
    });
    expect(result.tally[imposterSeat]).toBe(4);

    room.act(clients[0], { type: "PLAY_AGAIN" });
    room.act(clients[0], { type: "START" });
    expect(pub(clients[1]).round!.number).toBe(2);
    const word2 = clients.map(you).find((v) => v.card?.kind === "word")!.card;
    expect(word2).not.toMatchObject({ word });
  });
});

describe("edge cases", () => {
  it("reconnect within the grace period restores the same seat, role and card", () => {
    const { room, clients } = fiveStarted();
    const victim = clients[2];
    const before = you(victim);
    room.close(victim);
    room.advance(TIMINGS.RECONNECT_GRACE_MS - 2_000);
    const again = room.connect();
    room.join(again, "Whatever", "join", before.token);
    expect(you(again)).toMatchObject({
      playerId: before.playerId,
      role: before.role,
      card: before.card,
    });
    expect(room.state.round!.imposterId).toBe(
      clients.map(you).find((v) => v.role === "imposter")!.playerId,
    );
  });

  it("disconnecting on your hint turn skips it right away", () => {
    const { room, clients } = fiveStarted();
    room.advance(TIMINGS.REVEAL_MS);
    const activeSeat = room.state.round!.turnOrder[room.state.round!.turnIndex];
    const active = clients.find((c) => c.seatId === activeSeat)!;
    room.close(active);
    const hints = pub(clients.find((c) => c.open)!).round!.hints;
    expect(hints[0]).toEqual({ playerId: activeSeat, text: null });
  });

  it("imposter gone longer than the grace period ends the round as IMPOSTER_FLED", () => {
    const { room, clients } = fiveStarted();
    const imposter = clients.find((c) => you(c).role === "imposter")!;
    room.close(imposter);
    room.advance(TIMINGS.RECONNECT_GRACE_MS + 1);
    const watcher = clients.find((c) => c.open)!;
    expect(pub(watcher).phase).toBe("RESULT");
    expect(pub(watcher).result!.outcome).toBe("IMPOSTER_FLED");
  });

  it("host leaving passes host to the longest-connected player", () => {
    const { room, clients } = fiveStarted();
    const host = clients[0];
    room.close(host);
    room.advance(TIMINGS.RECONNECT_GRACE_MS + 1);
    const state = pub(clients[1]);
    expect(state.hostId).toBe(clients[1].seatId); // Ann joined right after the host
    expect(state.players.find((p) => p.isHost)!.name).toBe("Ann");
  });

  it("dropping below 3 players ends the round gracefully", () => {
    const { room, clients } = fiveStarted();
    const crew = clients.filter((c) => you(c).role === "crewmate");
    room.close(crew[0]);
    room.close(crew[1]);
    room.close(crew[2]);
    room.advance(TIMINGS.RECONNECT_GRACE_MS + 1);
    const watcher = clients.find((c) => c.open)!;
    expect(pub(watcher).result!.outcome).toBe("TOO_FEW_PLAYERS");
  });

  it("late joiners are told a game is in progress", () => {
    const { room } = fiveStarted();
    const late = room.connect();
    room.join(late, "Late");
    expect(errors(late)).toEqual(["IN_PROGRESS"]);
    expect(late.inbox.some((m) => m.type === "STATE")).toBe(false);
  });

  it("disconnected players aren't counted in the skip or vote denominators", () => {
    const { room, clients } = fiveStarted();
    hintAll(room, clients);
    room.advance(TIMINGS.SKIP_UNLOCK_MS);
    const imposter = clients.find((c) => you(c).role === "imposter")!;
    const leaver = clients.find((c) => c !== imposter && c !== clients[0])!;
    room.close(leaver);
    const remaining = clients.filter((c) => c.open);
    expect(pub(remaining[0]).round!.eligibleCount).toBe(4);
    for (const c of remaining) room.act(c, { type: "TOGGLE_SKIP" });
    expect(pub(remaining[0]).phase).toBe("VOTING");
    for (const c of remaining) {
      const target = remaining.find((o) => o !== c)!;
      room.act(c, { type: "CAST_VOTE", targetId: target.seatId! });
      room.act(c, { type: "LOCK_VOTE" });
    }
    expect(pub(remaining[0]).phase).toBe("RESULT");
  });

  it("two tabs: the newest connection takes the seat, the old one is told", () => {
    const { room, clients } = fiveStarted();
    const tab1 = clients[3];
    const token = you(tab1).token;
    const tab2 = room.connect();
    room.join(tab2, "Cid", "join", token);
    expect(errors(tab1)).toContain("REPLACED");
    expect(tab1.open).toBe(false);
    expect(you(tab2).playerId).toBe(you(tab1).playerId);
    // The seat stayed connected throughout: nobody saw it drop.
    expect(pub(clients[0]).players.every((p) => p.connected)).toBe(true);
  });
});
