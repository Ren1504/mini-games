/**
 * Chess: every tunable number in one place.
 *
 * Shared by the Next.js client and the /party game server, so keep this
 * file dependency-free and use relative imports only.
 */

export const CHESS_TIMINGS = {
  /**
   * A dropped player shows "reconnecting…" with a countdown for this long.
   * Mid-game, not coming back in time loses the game; in the waiting room
   * the seat is simply freed.
   */
  RECONNECT_GRACE_MS: 60_000,
  /** Room storage is wiped this long after the last player leaves. */
  EMPTY_ROOM_TTL_MS: 10 * 60_000,
} as const;

/** Clock choices in minutes per player; 0 means no clock. */
export const CLOCK_MINUTES = [0, 5, 10, 15] as const;
export type ClockMinutes = (typeof CLOCK_MINUTES)[number];
export const DEFAULT_CLOCK_MINUTES: ClockMinutes = 10;

export const CHESS_LIMITS = {
  PLAYERS: 2,
  /** A game this long is surely broken: stop accepting moves. */
  MAX_PLIES: 1_000,
} as const;

/** The PartyServer party name (kebab-case of the Durable Object binding). */
export const CHESS_PARTY_NAME = "chess-room";
