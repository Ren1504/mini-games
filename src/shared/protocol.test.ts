import { describe, expect, it } from "vitest";
import { LIMITS, ROOM_CODE_ALPHABET } from "./config";
import {
  clockOffset,
  nameKey,
  parseClientMessage,
  publicStateSchema,
  roomCodeSchema,
  serverMessageSchema,
  type PublicState,
} from "./protocol";

const send = (msg: unknown) => parseClientMessage(JSON.stringify(msg));

describe("room codes", () => {
  it("accepts 5 unambiguous characters, case-insensitively", () => {
    expect(roomCodeSchema.parse(" ab2cd ")).toBe("AB2CD");
  });

  it("rejects look-alike characters and wrong lengths", () => {
    for (const bad of [
      "AB0CD",
      "ABOCD",
      "AB1CD",
      "ABICD",
      "ABCD",
      "ABCDEF",
      "",
    ]) {
      expect(roomCodeSchema.safeParse(bad).success, bad).toBe(false);
    }
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OI]/);
  });
});

describe("client intents", () => {
  const join = { type: "JOIN", mode: "join", name: "Ren", avatar: "cat" };

  it("accepts every intent in its valid shape", () => {
    const valid = [
      join,
      { ...join, mode: "host", maxPlayers: 6 },
      { ...join, token: "x".repeat(32) },
      { type: "JOIN", mode: "join", name: "NoDoodle" },
      { type: "SET_AVATAR", avatar: "owl" },
      { type: "START" },
      { type: "SET_MAX_PLAYERS", maxPlayers: 10 },
      { type: "TYPING", typing: true },
      { type: "SUBMIT_HINT", text: "very cold" },
      { type: "TOGGLE_SKIP" },
      { type: "CAST_VOTE", targetId: "p2" },
      { type: "LOCK_VOTE" },
      { type: "PLAY_AGAIN" },
      { type: "PING", clientTime: 123 },
    ];
    for (const msg of valid)
      expect(send(msg).ok, JSON.stringify(msg)).toBe(true);
  });

  it("normalizes names and enforces 2–16 characters (emoji count once)", () => {
    const r = send({ ...join, name: "   Big    Ren  " });
    expect(r.ok && r.message.type === "JOIN" && r.message.name).toBe("Big Ren");
    expect(send({ ...join, name: "R" }).ok).toBe(false);
    expect(send({ ...join, name: "x".repeat(LIMITS.NAME_MAX + 1) }).ok).toBe(
      false,
    );
    expect(send({ ...join, name: "🐸🐸" }).ok).toBe(true);
    expect(nameKey(" REN ")).toBe(nameKey("ren"));
  });

  it("limits hints to 3 words / 30 characters", () => {
    expect(send({ type: "SUBMIT_HINT", text: "big   cold sea" }).ok).toBe(true);
    expect(send({ type: "SUBMIT_HINT", text: "one two three four" }).ok).toBe(
      false,
    );
    expect(send({ type: "SUBMIT_HINT", text: "x".repeat(31) }).ok).toBe(false);
    expect(send({ type: "SUBMIT_HINT", text: "   " }).ok).toBe(false);
  });

  it("rejects unknown types, extra fields, bad avatars and junk frames", () => {
    expect(send({ type: "KICK", targetId: "p2" }).ok).toBe(false); // no kick feature
    expect(send({ type: "START", sneaky: true }).ok).toBe(false);
    expect(send({ ...join, avatar: "dragon" }).ok).toBe(false);
    expect(send({ type: "SET_AVATAR", avatar: "dragon" }).ok).toBe(false);
    expect(send({ ...join, mode: "host", maxPlayers: 11 }).ok).toBe(false);
    expect(parseClientMessage("not json").ok).toBe(false);
    expect(parseClientMessage(42).ok).toBe(false);
    expect(parseClientMessage("x".repeat(3_000)).ok).toBe(false);
  });
});

describe("public state can't leak secrets", () => {
  const state: PublicState = {
    code: "AB2CD",
    version: 3,
    phase: "VOTING",
    phaseEndsAt: 1000,
    maxPlayers: 10,
    hostId: "p1",
    players: [
      {
        id: "p1",
        name: "Ren",
        avatar: "cat",
        connected: true,
        isHost: true,
      },
    ],
    round: {
      number: 1,
      turnOrder: ["p1"],
      activePlayerId: null,
      activeTyping: false,
      hints: [{ playerId: "p1", text: "cold" }],
      skipUnlocksAt: null,
      skipCount: 0,
      eligibleCount: 1,
      lockedVoterIds: [],
    },
    result: null,
  };

  it("accepts a valid public state", () => {
    expect(publicStateSchema.safeParse(state).success).toBe(true);
  });

  it("rejects any extra field that could carry the word, imposter or token", () => {
    const leaks = [
      { ...state, word: "Titanic" },
      { ...state, imposterId: "p1" },
      { ...state, round: { ...state.round, imposterId: "p1" } },
      { ...state, round: { ...state.round, votes: { p1: "p2" } } },
      {
        ...state,
        players: [{ ...state.players[0], token: "secret-token-123456" }],
      },
      { ...state, players: [{ ...state.players[0], role: "imposter" }] },
    ];
    for (const leak of leaks)
      expect(publicStateSchema.safeParse(leak).success).toBe(false);
  });

  it("validates every server message kind", () => {
    const you = {
      playerId: "p1",
      token: "t".repeat(32),
      role: "imposter",
      card: { kind: "imposter", category: "Movie", clue: "Ocean" },
      myVoteTargetId: null,
      myVoteLocked: false,
      mySkip: false,
    };
    const ok = [
      { type: "STATE", state },
      { type: "YOU", you },
      { type: "PONG", clientTime: 1, serverTime: 2 },
      { type: "ERROR", code: "ROOM_FULL", message: "Room is full (10/10)" },
    ];
    for (const m of ok)
      expect(serverMessageSchema.safeParse(m).success, m.type).toBe(true);
    expect(
      serverMessageSchema.safeParse({
        type: "ERROR",
        code: "NOPE",
        message: "",
      }).success,
    ).toBe(false);
  });
});

describe("clock offset", () => {
  it("uses the median so one slow round trip doesn't skew it", () => {
    // Server is 500ms ahead; one sample has a 2s round trip.
    const samples = [
      { sent: 0, received: 40, serverTime: 520 },
      { sent: 100, received: 140, serverTime: 620 },
      { sent: 200, received: 2200, serverTime: 1700 },
      { sent: 300, received: 340, serverTime: 820 },
      { sent: 400, received: 440, serverTime: 920 },
    ];
    expect(clockOffset(samples)).toBe(500);
    expect(clockOffset([])).toBe(0);
  });
});
