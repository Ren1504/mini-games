/**
 * Imposter: every tunable number in one place.
 *
 * Shared by the Next.js client and the /party game server, so keep this
 * file dependency-free and use relative imports only.
 */

/** Phase durations in milliseconds. Change these to tune the game. */
export const TIMINGS = {
  REVEAL_MS: 20_000,
  /** Per player, during the hint phase. */
  HINT_MS: 20_000,
  DISCUSSION_MS: 150_000,
  /** Skip-to-voting stays locked for this long at the start of discussion. */
  SKIP_UNLOCK_MS: 30_000,
  VOTE_MS: 30_000,
  /** A dropped player keeps their seat (and role) this long. */
  RECONNECT_GRACE_MS: 30_000,
  /** Room storage is wiped this long after the last player leaves. */
  EMPTY_ROOM_TTL_MS: 10 * 60_000,
} as const;

export const LIMITS = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 10,
  NAME_MIN: 2,
  NAME_MAX: 16,
  HINT_MAX_CHARS: 30,
  HINT_MAX_WORDS: 3,
  /** Per connection: at most RATE_MAX messages in any RATE_WINDOW_MS. */
  RATE_MAX: 20,
  RATE_WINDOW_MS: 5_000,
  /** Clock sync: round trips measured on connect (median offset is used). */
  CLOCK_SYNC_PINGS: 5,
} as const;

/**
 * Room codes: 5 characters, no look-alikes (no 0/O, no 1/I).
 * 32 symbols ^ 5 ≈ 33.5 million codes.
 */
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_LENGTH = 5;

/** Doodle avatars; each can be taken by one player per room. */
export const AVATARS = [
  "cat",
  "dog",
  "frog",
  "owl",
  "fox",
  "bear",
  "bunny",
  "penguin",
  "octopus",
  "robot",
  "ghost",
  "alien",
] as const;

export type AvatarId = (typeof AVATARS)[number];

/**
 * How often each difficulty is picked (relative weights per tier, not per
 * word): ~60% easy, 30% medium, 10% hard.
 */
export const DIFFICULTY_WEIGHTS = { 1: 6, 2: 3, 3: 1 } as const;

/** The PartyServer party name (kebab-case of the Durable Object binding). */
export const PARTY_NAME = "imposter-room";
