/**
 * Imposter: the authoritative room state held by the game server (one
 * Durable Object per room) and persisted to its storage on every change.
 *
 * SECURITY: this type contains secrets (the word, the imposter's id,
 * session tokens, live vote targets). It must never be sent to clients
 * as-is. The server derives a sanitized PublicState for broadcasts and a
 * per-player PrivateView sent only on that player's own connection
 * (see protocol.ts and game-machine.ts).
 */
import type { AvatarId } from "./config";

export type Phase =
  "LOBBY" | "REVEAL" | "HINTS" | "DISCUSSION" | "VOTING" | "RESULT";

export type WordCategory =
  | "Celebrity"
  | "Movie"
  | "TV Series"
  | "Brand"
  | "Place"
  | "Food"
  | "Animal"
  | "Object"
  | "Sport"
  | "Character";

/** The round's secret, copied from the word bank when the round starts. */
export type SecretWord = {
  id: string;
  word: string;
  category: WordCategory;
  imposterClue: string;
};

export type Player = {
  /** Public, stable seat id (safe to show; NOT the session token). */
  id: string;
  /** Secret, given only to this player; proves the seat on reconnect. */
  token: string;
  name: string;
  avatar: AvatarId;
  /** Join time; the longest-connected player inherits host. */
  joinedAt: number;
  connected: boolean;
  /** When the player dropped (for the reconnect grace period). */
  disconnectedAt: number | null;
  /** Joined mid-round: watches until the next round starts. */
  spectator: boolean;
};

export type Hint = {
  playerId: string;
  /** null = time ran out or the player was skipped ("(no hint)"). */
  text: string | null;
};

export type RoundState = {
  number: number;
  secret: SecretWord;
  imposterId: string;
  /** Seat ids of everyone dealt into this round, in hint order. */
  turnOrder: string[];
  /** Index into turnOrder of the active hinter (HINTS phase). */
  turnIndex: number;
  hints: Hint[];
  /** When DISCUSSION started (skip unlocks SKIP_UNLOCK_MS later). */
  discussionStartedAt: number | null;
  /** Players who toggled "skip to voting". */
  skips: string[];
  /** voterId → targetId. Hidden from everyone but the voter until RESULT. */
  votes: Record<string, string>;
  /** Voters who pressed "Lock vote". */
  locked: string[];
};

export type Outcome =
  /** Imposter alone got the most votes: crewmates win. */
  | "CAUGHT"
  /** Imposter not top-voted, or tied at the top: imposter wins. */
  | "ESCAPED"
  /** Imposter was disconnected longer than the grace period. */
  | "IMPOSTER_FLED"
  /** Fewer than MIN_PLAYERS connected mid-round. */
  | "TOO_FEW_PLAYERS";

export type RoundResult = {
  outcome: Outcome;
  imposterId: string;
  secret: SecretWord;
  /** voterId → targetId, revealed in RESULT. Abstainers are absent. */
  votes: Record<string, string>;
  /** targetId → vote count. */
  tally: Record<string, number>;
};

export type RoomState = {
  code: string;
  /** False until a player connects with the "host" intent. */
  hosted: boolean;
  hostId: string | null;
  maxPlayers: number;
  phase: Phase;
  /** Server time (ms) when the current phase ends; null in LOBBY/RESULT. */
  phaseEndsAt: number | null;
  players: Player[];
  round: RoundState | null;
  lastResult: RoundResult | null;
  /** Word ids already used this session (never repeated until exhausted). */
  usedWordIds: string[];
  /** Incremented on every change; lets clients drop out-of-order states. */
  version: number;
};
