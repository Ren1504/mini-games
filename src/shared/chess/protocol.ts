/**
 * Chess: the WebSocket protocol, validated with zod on both ends.
 *
 * Clients send INTENTS ("I want to play e2e4"); the server checks them
 * against the real game and broadcasts the result. Nothing in chess is
 * secret, so everyone gets the same STATE; YOU only carries your seat id
 * and the token that reclaims it after a refresh.
 *
 * Shared by the Next.js client and the /party server: relative imports
 * only, no dependencies besides zod.
 */
import { z } from "zod";
import { avatarSchema, nameSchema } from "../protocol";
import { CLOCK_MINUTES } from "./config";
import { UCI_PATTERN } from "./rules";

const seatIdSchema = z.string().min(1).max(64);
const tokenSchema = z.string().min(16).max(128);
const colorSchema = z.enum(["w", "b"]);
/** zod 4's z.literal takes the whole list of allowed values. */
const clockMinutesSchema = z.literal(CLOCK_MINUTES);
const uciSchema = z.string().regex(UCI_PATTERN, "Not a move");

// ── Client → server (intents) ───────────────────────────────────────

export const chessClientMessageSchema = z.discriminatedUnion("type", [
  /**
   * Take a seat. "host" creates the room; "join" needs a hosted room with
   * a free seat. With a token, the server restores that seat instead.
   */
  z
    .object({
      type: z.literal("JOIN"),
      mode: z.enum(["host", "join"]),
      name: nameSchema,
      avatar: avatarSchema.optional(),
      token: tokenSchema.optional(),
    })
    .strict(),
  /** Host, waiting room: minutes per player (0 = no clock). */
  z
    .object({ type: z.literal("SET_CLOCK"), minutes: clockMinutesSchema })
    .strict(),
  z.object({ type: z.literal("SET_AVATAR"), avatar: avatarSchema }).strict(),
  /** Host, waiting room, both players here. */
  z.object({ type: z.literal("START") }).strict(),
  z.object({ type: z.literal("MOVE"), uci: uciSchema }).strict(),
  z.object({ type: z.literal("RESIGN") }).strict(),
  /** Offer a draw (or accept one the opponent already offered). */
  z.object({ type: z.literal("OFFER_DRAW") }).strict(),
  z.object({ type: z.literal("ANSWER_DRAW"), accept: z.boolean() }).strict(),
  z
    .object({ type: z.literal("PING"), clientTime: z.number().finite() })
    .strict(),
]);

export type ChessClientMessage = z.infer<typeof chessClientMessageSchema>;

/** Parses a raw WebSocket frame. Never throws. */
export function parseChessClientMessage(
  raw: unknown,
): { ok: true; message: ChessClientMessage } | { ok: false; error: string } {
  if (typeof raw !== "string" || raw.length > 1_000)
    return { ok: false, error: "Bad frame" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Not JSON" };
  }
  const result = chessClientMessageSchema.safeParse(json);
  return result.success
    ? { ok: true, message: result.data }
    : {
        ok: false,
        error: result.error.issues[0]?.message ?? "Invalid message",
      };
}

// ── Server → client ─────────────────────────────────────────────────

export const chessPlayerSchema = z
  .object({
    id: seatIdSchema,
    name: z.string(),
    avatar: avatarSchema,
    connected: z.boolean(),
    /** Server time when a dropped player's grace period runs out. */
    awayUntil: z.number().nullable(),
    isHost: z.boolean(),
  })
  .strict();

export const chessGameSchema = z
  .object({
    number: z.number().int().positive(),
    whiteId: seatIdSchema,
    blackId: seatIdSchema,
    /** Every move so far, in UCI ("e2e4", "e7e8q"). */
    moves: z.array(uciSchema),
    /** Minutes per player, 0 = no clock. */
    clockMinutes: z.number().int().nonnegative(),
    /** Time left for each side when the current turn started (ms). */
    remaining: z.object({ w: z.number(), b: z.number() }).strict().nullable(),
    /** Server time when the side to move started thinking. */
    turnStartedAt: z.number(),
    /** A draw offer waiting for an answer, and who made it. */
    drawOfferBy: colorSchema.nullable(),
  })
  .strict();

export const outcomeSchema = z.enum([
  "CHECKMATE",
  "RESIGNED",
  "TIMEOUT",
  /** Ran out of time, but the opponent couldn't possibly mate. */
  "TIMEOUT_DRAW",
  /** Disconnected and didn't come back in time. */
  "ABANDONED",
  "STALEMATE",
  "DRAW_AGREED",
  "REPETITION",
  "FIFTY_MOVES",
  "INSUFFICIENT",
]);

const sideSchema = z
  .object({ id: seatIdSchema, name: z.string(), avatar: avatarSchema })
  .strict();

export const chessResultSchema = z
  .object({
    number: z.number().int().positive(),
    outcome: outcomeSchema,
    winner: colorSchema.nullable(),
    white: sideSchema,
    black: sideSchema,
    /** The finished game, so the final position stays on screen. */
    moves: z.array(uciSchema),
  })
  .strict();

export const chessPublicStateSchema = z
  .object({
    code: z.string(),
    version: z.number().int().nonnegative(),
    phase: z.enum(["LOBBY", "PLAYING"]),
    hostId: seatIdSchema.nullable(),
    /** Clock for the next game (host's choice). */
    clockMinutes: z.number().int().nonnegative(),
    players: z.array(chessPlayerSchema),
    game: chessGameSchema.nullable(),
    /** The last finished game, shown in the waiting room. */
    result: chessResultSchema.nullable(),
  })
  .strict();

export const chessPrivateViewSchema = z
  .object({
    playerId: seatIdSchema,
    /** Store it (localStorage) to reclaim this seat after a refresh. */
    token: tokenSchema,
  })
  .strict();

export const chessErrorCodeSchema = z.enum([
  "ROOM_NOT_FOUND",
  "CODE_IN_USE",
  "ROOM_FULL",
  "NAME_TAKEN",
  "AVATAR_TAKEN",
  "NOT_HOST",
  "WRONG_PHASE",
  "NOT_ENOUGH_PLAYERS",
  "NOT_YOUR_TURN",
  "ILLEGAL_MOVE",
  "NO_DRAW_OFFER",
  "NOT_SEATED",
  "INVALID_MESSAGE",
  "RATE_LIMITED",
  /** This seat was taken over by a newer tab/connection. */
  "REPLACED",
]);

export const chessServerMessageSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("STATE"), state: chessPublicStateSchema })
    .strict(),
  z.object({ type: z.literal("YOU"), you: chessPrivateViewSchema }).strict(),
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
      code: chessErrorCodeSchema,
      message: z.string(),
    })
    .strict(),
]);

export type ChessPlayer = z.infer<typeof chessPlayerSchema>;
export type ChessGame = z.infer<typeof chessGameSchema>;
export type ChessOutcome = z.infer<typeof outcomeSchema>;
export type ChessResult = z.infer<typeof chessResultSchema>;
export type ChessPublicState = z.infer<typeof chessPublicStateSchema>;
export type ChessPrivateView = z.infer<typeof chessPrivateViewSchema>;
export type ChessErrorCode = z.infer<typeof chessErrorCodeSchema>;
export type ChessServerMessage = z.infer<typeof chessServerMessageSchema>;
