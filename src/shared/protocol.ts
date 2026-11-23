/**
 * Imposter: the WebSocket protocol, validated with zod on both ends.
 *
 * Client → server messages are INTENTS only ("I want to vote for X"); the
 * server decides what actually happens. Server → client messages are:
 *   STATE: sanitized public state, broadcast to everyone in the room
 *   YOU:   private view (role, card, own vote), sent ONLY to its owner
 *   PONG:  clock-sync reply
 *   ERROR: why an intent was rejected
 *
 * Shared by the Next.js client and the /party server: relative imports
 * only, no dependencies besides zod.
 */
import { z } from "zod";
import {
  AVATARS,
  LIMITS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from "./config";

// ── Building blocks ─────────────────────────────────────────────────

const codeChars = `[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}`;
export const roomCodeSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(new RegExp(`^${codeChars}$`), "Invalid room code"));

/** Code points, not UTF-16 units, so "🐸" counts as one character. */
const length = (s: string) => [...s].length;

/** Trims and collapses inner whitespace. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export const nameSchema = z
  .string()
  .transform(normalizeName)
  .refine(
    (s) => length(s) >= LIMITS.NAME_MIN,
    `At least ${LIMITS.NAME_MIN} characters`,
  )
  .refine(
    (s) => length(s) <= LIMITS.NAME_MAX,
    `At most ${LIMITS.NAME_MAX} characters`,
  );

/** Names are unique per room, ignoring case. */
export const nameKey = (name: string) =>
  normalizeName(name).toLocaleLowerCase();

export const hintSchema = z
  .string()
  .transform(normalizeName)
  .refine((s) => length(s) >= 1, "Write a hint first")
  .refine(
    (s) => length(s) <= LIMITS.HINT_MAX_CHARS,
    `At most ${LIMITS.HINT_MAX_CHARS} characters`,
  )
  .refine(
    (s) => s.split(" ").length <= LIMITS.HINT_MAX_WORDS,
    `At most ${LIMITS.HINT_MAX_WORDS} words`,
  );

export const avatarSchema = z.enum(AVATARS);
const seatIdSchema = z.string().min(1).max(64);
const tokenSchema = z.string().min(16).max(128);

// ── Client → server (intents) ───────────────────────────────────────

export const clientMessageSchema = z.discriminatedUnion("type", [
  /**
   * Take a seat. "host" creates the room (only if nobody hosted it yet);
   * "join" requires an existing hosted room. With a token, the server
   * restores that seat instead (reconnect / refresh / second tab).
   * `avatar` is only a preference: if it's free you get it, otherwise the
   * server assigns a free doodle (change it in the lobby with SET_AVATAR).
   */
  z
    .object({
      type: z.literal("JOIN"),
      mode: z.enum(["host", "join"]),
      name: nameSchema,
      avatar: avatarSchema.optional(),
      token: tokenSchema.optional(),
      maxPlayers: z
        .number()
        .int()
        .min(LIMITS.MIN_PLAYERS)
        .max(LIMITS.MAX_PLAYERS)
        .optional(),
    })
    .strict(),
  z.object({ type: z.literal("START") }).strict(),
  z
    .object({
      type: z.literal("SET_MAX_PLAYERS"),
      maxPlayers: z
        .number()
        .int()
        .min(LIMITS.MIN_PLAYERS)
        .max(LIMITS.MAX_PLAYERS),
    })
    .strict(),
  /** Pick a different (free) doodle. Lobby only. */
  z.object({ type: z.literal("SET_AVATAR"), avatar: avatarSchema }).strict(),
  /** The active hinter is typing (drives the "writing…" doodle). */
  z.object({ type: z.literal("TYPING"), typing: z.boolean() }).strict(),
  z.object({ type: z.literal("SUBMIT_HINT"), text: hintSchema }).strict(),
  z.object({ type: z.literal("TOGGLE_SKIP") }).strict(),
  z.object({ type: z.literal("CAST_VOTE"), targetId: seatIdSchema }).strict(),
  z.object({ type: z.literal("LOCK_VOTE") }).strict(),
  z.object({ type: z.literal("PLAY_AGAIN") }).strict(),
  z
    .object({ type: z.literal("PING"), clientTime: z.number().finite() })
    .strict(),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ClientMessageType = ClientMessage["type"];

/** Parses a raw WebSocket frame. Never throws. */
export function parseClientMessage(
  raw: unknown,
): { ok: true; message: ClientMessage } | { ok: false; error: string } {
  if (typeof raw !== "string" || raw.length > 2_000)
    return { ok: false, error: "Bad frame" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Not JSON" };
  }
  const result = clientMessageSchema.safeParse(json);
  return result.success
    ? { ok: true, message: result.data }
    : {
        ok: false,
        error: result.error.issues[0]?.message ?? "Invalid message",
      };
}

// ── Server → client ─────────────────────────────────────────────────

const phaseSchema = z.enum([
  "LOBBY",
  "REVEAL",
  "HINTS",
  "DISCUSSION",
  "VOTING",
  "RESULT",
]);
const categorySchema = z.enum([
  "Celebrity",
  "Movie",
  "TV Series",
  "Brand",
  "Place",
  "Food",
  "Animal",
  "Object",
  "Sport",
  "Character",
]);

export const publicPlayerSchema = z
  .object({
    id: seatIdSchema,
    name: z.string(),
    avatar: avatarSchema,
    connected: z.boolean(),
    isHost: z.boolean(),
  })
  .strict();

/**
 * What everyone may know about the round in progress. Deliberately has
 * no word, no category, no imposter id and no vote targets.
 */
export const publicRoundSchema = z
  .object({
    number: z.number().int().positive(),
    turnOrder: z.array(seatIdSchema),
    /** Active hinter during HINTS, else null. */
    activePlayerId: seatIdSchema.nullable(),
    /** The active hinter is typing right now. */
    activeTyping: z.boolean(),
    hints: z.array(
      z
        .object({ playerId: seatIdSchema, text: z.string().nullable() })
        .strict(),
    ),
    /** Server time when "skip to voting" unlocks (DISCUSSION). */
    skipUnlocksAt: z.number().nullable(),
    skipCount: z.number().int().nonnegative(),
    /** Connected, dealt-in players: the denominator for skips and votes. */
    eligibleCount: z.number().int().nonnegative(),
    /** Players who locked a vote (who, not for whom). */
    lockedVoterIds: z.array(seatIdSchema),
  })
  .strict();

export const publicResultSchema = z
  .object({
    outcome: z.enum(["CAUGHT", "ESCAPED", "IMPOSTER_FLED", "TOO_FEW_PLAYERS"]),
    imposterId: seatIdSchema,
    word: z.string(),
    category: categorySchema,
    votes: z.record(z.string(), seatIdSchema),
    tally: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();

export const publicStateSchema = z
  .object({
    code: z.string(),
    version: z.number().int().nonnegative(),
    phase: phaseSchema,
    /** Server clock (ms). Clients add their measured offset to compare. */
    phaseEndsAt: z.number().nullable(),
    maxPlayers: z.number().int(),
    hostId: seatIdSchema.nullable(),
    players: z.array(publicPlayerSchema),
    round: publicRoundSchema.nullable(),
    /** Set in RESULT, and kept in the lobby until the next round starts. */
    result: publicResultSchema.nullable(),
  })
  .strict();

/** Sent only on the owner's connection. */
export const privateViewSchema = z
  .object({
    playerId: seatIdSchema,
    /** Store it (localStorage) to reclaim this seat after a refresh. */
    token: tokenSchema,
    role: z.enum(["lobby", "crewmate", "imposter"]),
    card: z
      .discriminatedUnion("kind", [
        z
          .object({
            kind: z.literal("word"),
            word: z.string(),
            category: categorySchema,
          })
          .strict(),
        z
          .object({
            kind: z.literal("imposter"),
            category: categorySchema,
            clue: z.string(),
          })
          .strict(),
      ])
      .nullable(),
    myVoteTargetId: seatIdSchema.nullable(),
    myVoteLocked: z.boolean(),
    mySkip: z.boolean(),
  })
  .strict();

export const errorCodeSchema = z.enum([
  "ROOM_NOT_FOUND",
  "CODE_IN_USE",
  "ROOM_FULL",
  /** A round is being played; joining is only possible in the lobby. */
  "IN_PROGRESS",
  "NAME_TAKEN",
  "AVATAR_TAKEN",
  "NOT_HOST",
  "WRONG_PHASE",
  "NOT_YOUR_TURN",
  "TOO_LATE",
  "TOO_EARLY",
  "HINT_REVEALS_WORD",
  "INVALID_TARGET",
  "ALREADY_LOCKED",
  "NOT_ENOUGH_PLAYERS",
  "NOT_SEATED",
  "INVALID_MESSAGE",
  "RATE_LIMITED",
  /** This seat was taken over by a newer tab/connection. */
  "REPLACED",
]);

export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("STATE"), state: publicStateSchema }).strict(),
  z.object({ type: z.literal("YOU"), you: privateViewSchema }).strict(),
  z
    .object({
      type: z.literal("PONG"),
      clientTime: z.number(),
      serverTime: z.number(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ERROR"),
      code: errorCodeSchema,
      message: z.string(),
    })
    .strict(),
]);

export type PublicPlayer = z.infer<typeof publicPlayerSchema>;
export type PublicRound = z.infer<typeof publicRoundSchema>;
export type PublicResult = z.infer<typeof publicResultSchema>;
export type PublicState = z.infer<typeof publicStateSchema>;
export type PrivateView = z.infer<typeof privateViewSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

// ── Clock sync ──────────────────────────────────────────────────────

/**
 * Offset to add to Date.now() to get server time, from PING/PONG round
 * trips: offset = serverTime − (sent + received) / 2. Uses the median so
 * one slow round trip doesn't skew every countdown.
 */
export function clockOffset(
  samples: ReadonlyArray<{
    sent: number;
    received: number;
    serverTime: number;
  }>,
): number {
  if (samples.length === 0) return 0;
  const offsets = samples
    .map((s) => s.serverTime - (s.sent + s.received) / 2)
    .sort((a, b) => a - b);
  const mid = Math.floor(offsets.length / 2);
  return offsets.length % 2
    ? offsets[mid]
    : (offsets[mid - 1] + offsets[mid]) / 2;
}
