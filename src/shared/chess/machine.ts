/**
 * Chess room: the pure state machine (no I/O, no timers, no randomness of
 * its own). The server adapter feeds it events and carries out the
 * effects, exactly like Imposter's game-machine.ts:
 *
 *   JOIN / INTENT / DISCONNECT / TICK  →  reduce()  →  new state + effects
 *
 * Time comes in as ctx.now; deadlines (clock flags, reconnect grace, empty
 * room) are found by nextWakeAt() and handled on TICK.
 */
import type { AvatarId } from "../config";
import { AVATARS } from "../config";
import { nameKey } from "../protocol";
import {
  CHESS_LIMITS,
  CHESS_TIMINGS,
  DEFAULT_CLOCK_MINUTES,
  type ClockMinutes,
} from "./config";
import type {
  ChessClientMessage,
  ChessErrorCode,
  ChessOutcome,
  ChessPrivateView,
  ChessPublicState,
} from "./protocol";
import {
  canStillMate,
  other,
  positionEnd,
  replay,
  tryMove,
  type Color,
} from "./rules";

// ── State ───────────────────────────────────────────────────────────

export type Seat = {
  id: string;
  /** Secret: proves the seat on reconnect. Never broadcast. */
  token: string;
  name: string;
  avatar: AvatarId;
  joinedAt: number;
  connected: boolean;
  disconnectedAt: number | null;
};

export type GameRecord = {
  number: number;
  whiteId: string;
  blackId: string;
  moves: string[];
  clockMinutes: ClockMinutes;
  /** Each side's time left when the current turn started; null = no clock. */
  remaining: Record<Color, number> | null;
  turnStartedAt: number;
  drawOfferBy: Color | null;
};

type Side = { id: string; name: string; avatar: AvatarId };

export type ResultRecord = {
  number: number;
  outcome: ChessOutcome;
  winner: Color | null;
  white: Side;
  black: Side;
  moves: string[];
};

export type ChessRoomState = {
  code: string;
  version: number;
  hosted: boolean;
  hostId: string | null;
  phase: "LOBBY" | "PLAYING";
  clockMinutes: ClockMinutes;
  players: Seat[];
  game: GameRecord | null;
  result: ResultRecord | null;
  gamesPlayed: number;
  emptySince: number | null;
};

// ── Events, effects, context ────────────────────────────────────────

type JoinMessage = Extract<ChessClientMessage, { type: "JOIN" }>;
export type ChessIntent = Exclude<
  ChessClientMessage,
  { type: "JOIN" | "PING" }
>;

export type ChessEvent =
  | {
      type: "JOIN";
      connId: string;
      message: JoinMessage;
      /** Fresh ids the adapter generates (crypto) in case a new seat is made. */
      newSeatId: string;
      newToken: string;
    }
  | { type: "INTENT"; connId: string; seatId: string; message: ChessIntent }
  /** The seat's last connection closed. */
  | { type: "DISCONNECT"; seatId: string }
  /** An alarm fired: process every deadline that is due. */
  | { type: "TICK" };

export type ChessEffect =
  | { type: "BIND"; connId: string; seatId: string }
  | { type: "REPLACE_OTHERS"; connId: string; seatId: string }
  | { type: "ERROR"; connId: string; code: ChessErrorCode; message: string }
  | { type: "CLEANUP" };

export type ChessContext = {
  now: number;
  /** Uniform [0, 1). Injected so tests are deterministic. */
  random: () => number;
};

export type ChessReduceResult = {
  state: ChessRoomState;
  effects: ChessEffect[];
};

// ── Helpers ─────────────────────────────────────────────────────────

export function initialChessState(code: string): ChessRoomState {
  return {
    code,
    version: 0,
    hosted: false,
    hostId: null,
    phase: "LOBBY",
    clockMinutes: DEFAULT_CLOCK_MINUTES,
    players: [],
    game: null,
    result: null,
    gamesPlayed: 0,
    emptySince: null,
  };
}

const seat = (s: ChessRoomState, id: string | null | undefined) =>
  id ? s.players.find((p) => p.id === id) : undefined;

/** Still in the room: connected, or dropped less than the grace period ago. */
const present = (p: Seat, now: number) =>
  p.connected ||
  (p.disconnectedAt !== null &&
    now - p.disconnectedAt < CHESS_TIMINGS.RECONNECT_GRACE_MS);

/** Host passes to the other player if the host is gone. */
function ensureHost(s: ChessRoomState, now: number) {
  const host = seat(s, s.hostId);
  if (host && present(host, now)) return;
  const next = s.players
    .filter((p) => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (next) s.hostId = next.id;
  else if (!host) s.hostId = null;
}

const colorOf = (game: GameRecord, seatId: string): Color | null =>
  game.whiteId === seatId ? "w" : game.blackId === seatId ? "b" : null;

/** Whose turn it is: White on even plies. */
const toMove = (game: GameRecord): Color =>
  game.moves.length % 2 === 0 ? "w" : "b";

/** Server time when the side to move runs out of time (null: no clock). */
export function flagAt(game: GameRecord): number | null {
  return game.remaining
    ? game.turnStartedAt + game.remaining[toMove(game)]
    : null;
}

function sideOf(s: ChessRoomState, id: string): Side {
  const p = seat(s, id);
  return { id, name: p?.name ?? "?", avatar: p?.avatar ?? "cat" };
}

/** Ends the game in progress and goes back to the waiting room. */
function finish(
  s: ChessRoomState,
  outcome: ChessOutcome,
  winner: Color | null,
) {
  const game = s.game;
  if (!game) return;
  s.result = {
    number: game.number,
    outcome,
    winner,
    white: sideOf(s, game.whiteId),
    black: sideOf(s, game.blackId),
    moves: game.moves,
  };
  s.phase = "LOBBY";
  s.game = null;
}

/** Ran out of time: a loss, unless the opponent has nothing left to mate with. */
function flag(s: ChessRoomState, game: GameRecord) {
  const loser = toMove(game);
  const chess = replay(game.moves);
  if (canStillMate(chess, other(loser))) finish(s, "TIMEOUT", other(loser));
  else finish(s, "TIMEOUT_DRAW", null);
}

/**
 * Grace period over. Mid-game, a player who didn't come back loses (if
 * both are gone, whoever dropped first). In the waiting room the seat is
 * just freed.
 */
function releaseExpiredSeats(s: ChessRoomState, now: number) {
  const game = s.game;
  if (s.phase === "PLAYING" && game) {
    const gone = s.players
      .filter((p) => colorOf(game, p.id) && !present(p, now))
      .sort((a, b) => (a.disconnectedAt ?? 0) - (b.disconnectedAt ?? 0))[0];
    if (gone) finish(s, "ABANDONED", other(colorOf(game, gone.id)!));
  }
  if (s.phase === "LOBBY") s.players = s.players.filter((p) => present(p, now));
}

function startGame(
  s: ChessRoomState,
  ctx: { now: number; random: () => number },
) {
  const [a, b] = s.players;
  // First game: random colors. After that, colors swap every game.
  const lastWhite = s.result?.white.id;
  const aIsWhite =
    lastWhite === a.id ? false : lastWhite === b.id ? true : ctx.random() < 0.5;
  const ms = s.clockMinutes * 60_000;
  s.game = {
    number: s.gamesPlayed + 1,
    whiteId: aIsWhite ? a.id : b.id,
    blackId: aIsWhite ? b.id : a.id,
    moves: [],
    clockMinutes: s.clockMinutes,
    remaining: ms > 0 ? { w: ms, b: ms } : null,
    turnStartedAt: ctx.now,
    drawOfferBy: null,
  };
  s.gamesPlayed += 1;
  s.phase = "PLAYING";
  s.result = null;
}

// ── Reducer ─────────────────────────────────────────────────────────

export function reduceChess(
  prev: ChessRoomState,
  event: ChessEvent,
  ctx: ChessContext,
): ChessReduceResult {
  const s = structuredClone(prev);
  const effects: ChessEffect[] = [];
  const fail = (
    connId: string,
    code: ChessErrorCode,
    message: string,
  ): ChessReduceResult => ({
    state: prev,
    effects: [{ type: "ERROR", connId, code, message }],
  });

  switch (event.type) {
    case "JOIN": {
      const { message, connId } = event;

      // Reclaim a seat with its token (refresh, reconnect, second tab).
      const owned = message.token
        ? s.players.find((p) => p.token === message.token)
        : undefined;
      if (owned) {
        owned.connected = true;
        owned.disconnectedAt = null;
        s.emptySince = null;
        effects.push(
          { type: "BIND", connId, seatId: owned.id },
          { type: "REPLACE_OTHERS", connId, seatId: owned.id },
        );
        break;
      }

      // A token that matches no seat means this browser was in the room
      // before. If the room has closed since, it stays closed: the code
      // can't be brought back to life, not even by its old host.
      if (message.token && !s.hosted) {
        return fail(connId, "ROOM_NOT_FOUND", "This room has closed.");
      }

      if (message.mode === "host") {
        const occupied = s.hosted && s.players.some((p) => present(p, ctx.now));
        if (occupied) {
          return fail(
            connId,
            "CODE_IN_USE",
            "That room code is already in use. Try another.",
          );
        }
        Object.assign(s, initialChessState(s.code), {
          hosted: true,
          version: s.version,
        });
      } else {
        if (!s.hosted)
          return fail(connId, "ROOM_NOT_FOUND", "No room with that code.");
        releaseExpiredSeats(s, ctx.now);
        if (s.players.length >= CHESS_LIMITS.PLAYERS) {
          return fail(
            connId,
            "ROOM_FULL",
            s.phase === "PLAYING"
              ? "A game is being played in this room."
              : "This room already has two players.",
          );
        }
        if (s.players.some((p) => nameKey(p.name) === nameKey(message.name))) {
          return fail(connId, "NAME_TAKEN", "Your opponent has that name.");
        }
      }

      const taken = new Set(s.players.map((p) => p.avatar));
      const free = AVATARS.filter((a) => !taken.has(a));
      const avatar: AvatarId =
        message.avatar && !taken.has(message.avatar)
          ? message.avatar
          : free[Math.floor(ctx.random() * free.length)];

      const player: Seat = {
        id: event.newSeatId,
        token: event.newToken,
        name: message.name,
        avatar,
        joinedAt: ctx.now,
        connected: true,
        disconnectedAt: null,
      };
      s.players.push(player);
      s.emptySince = null;
      if (message.mode === "host") s.hostId = player.id;
      effects.push({ type: "BIND", connId, seatId: player.id });
      break;
    }

    case "INTENT": {
      const { connId, seatId, message } = event;
      const me = seat(s, seatId);
      if (!me) return fail(connId, "NOT_SEATED", "Join the room first.");
      const isHost = s.hostId === seatId;
      const game = s.game;
      const myColor = game ? colorOf(game, seatId) : null;

      switch (message.type) {
        case "SET_AVATAR": {
          if (s.phase !== "LOBBY")
            return fail(connId, "WRONG_PHASE", "Change doodles between games.");
          if (
            s.players.some((p) => p.id !== me.id && p.avatar === message.avatar)
          )
            return fail(
              connId,
              "AVATAR_TAKEN",
              "Your opponent has that doodle.",
            );
          me.avatar = message.avatar;
          break;
        }

        case "SET_CLOCK": {
          if (!isHost)
            return fail(connId, "NOT_HOST", "Only the host sets the clock.");
          if (s.phase !== "LOBBY")
            return fail(connId, "WRONG_PHASE", "The game has already started.");
          s.clockMinutes = message.minutes;
          break;
        }

        case "START": {
          if (!isHost)
            return fail(connId, "NOT_HOST", "Only the host can start.");
          if (s.phase !== "LOBBY")
            return fail(connId, "WRONG_PHASE", "The game has already started.");
          if (
            s.players.length < CHESS_LIMITS.PLAYERS ||
            s.players.some((p) => !p.connected)
          ) {
            return fail(
              connId,
              "NOT_ENOUGH_PLAYERS",
              "Wait for your opponent to join.",
            );
          }
          startGame(s, ctx);
          break;
        }

        case "MOVE": {
          if (!game || s.phase !== "PLAYING")
            return fail(connId, "WRONG_PHASE", "No game in progress.");
          if (!myColor || myColor !== toMove(game))
            return fail(connId, "NOT_YOUR_TURN", "It's not your turn.");
          // Out of time already (the alarm may lag a little): flag first.
          const deadline = flagAt(game);
          if (deadline !== null && ctx.now >= deadline) {
            flag(s, game);
            break;
          }
          if (game.moves.length >= CHESS_LIMITS.MAX_PLIES)
            return fail(connId, "ILLEGAL_MOVE", "This game is too long.");
          const played = tryMove(game.moves, message.uci);
          if (!played)
            return fail(connId, "ILLEGAL_MOVE", "That move isn't allowed.");

          if (game.remaining) {
            game.remaining[myColor] -= ctx.now - game.turnStartedAt;
          }
          game.turnStartedAt = ctx.now;
          game.moves.push(message.uci);
          // Moving instead of answering declines the opponent's offer.
          if (game.drawOfferBy && game.drawOfferBy !== myColor)
            game.drawOfferBy = null;

          const end = positionEnd(played.chess);
          if (end) finish(s, end.reason, end.winner);
          break;
        }

        case "LEAVE": {
          // Leaving mid-game loses it, like walking away from the board.
          if (game && myColor) finish(s, "ABANDONED", other(myColor));
          s.players = s.players.filter((p) => p.id !== me.id);
          break;
        }

        case "RESIGN": {
          if (!game || !myColor)
            return fail(connId, "WRONG_PHASE", "No game in progress.");
          finish(s, "RESIGNED", other(myColor));
          break;
        }

        case "OFFER_DRAW": {
          if (!game || !myColor)
            return fail(connId, "WRONG_PHASE", "No game in progress.");
          if (game.drawOfferBy === other(myColor)) {
            finish(s, "DRAW_AGREED", null);
          } else {
            game.drawOfferBy = myColor;
          }
          break;
        }

        case "ANSWER_DRAW": {
          if (!game || !myColor)
            return fail(connId, "WRONG_PHASE", "No game in progress.");
          if (game.drawOfferBy !== other(myColor))
            return fail(connId, "NO_DRAW_OFFER", "There's no draw offer.");
          if (message.accept) finish(s, "DRAW_AGREED", null);
          else game.drawOfferBy = null;
          break;
        }
      }
      break;
    }

    case "DISCONNECT": {
      const me = seat(s, event.seatId);
      if (!me || !me.connected) return { state: prev, effects: [] };
      me.connected = false;
      me.disconnectedAt = ctx.now;
      if (!s.players.some((p) => p.connected)) s.emptySince = ctx.now;
      break;
    }

    case "TICK": {
      const now = ctx.now;
      if (
        s.emptySince !== null &&
        now - s.emptySince >= CHESS_TIMINGS.EMPTY_ROOM_TTL_MS
      ) {
        return {
          state: { ...initialChessState(s.code), version: s.version + 1 },
          effects: [{ type: "CLEANUP" }],
        };
      }
      const game = s.game;
      const deadline = game ? flagAt(game) : null;
      if (game && deadline !== null && now >= deadline) flag(s, game);
      break;
    }
  }

  // Idempotent housekeeping after every event.
  releaseExpiredSeats(s, ctx.now);
  ensureHost(s, ctx.now);

  // Everyone has gone (left, or away past the reconnect window): the room
  // stops existing, so its code can't be joined any more.
  if (s.hosted && s.players.length === 0) {
    return {
      state: { ...initialChessState(s.code), version: prev.version + 1 },
      effects: [...effects, { type: "CLEANUP" }],
    };
  }

  const changed =
    JSON.stringify({ ...s, version: 0 }) !==
    JSON.stringify({ ...prev, version: 0 });
  return {
    state: changed ? { ...s, version: prev.version + 1 } : prev,
    effects,
  };
}

// ── Scheduling ──────────────────────────────────────────────────────

/** Earliest moment the room must wake up (for the Durable Object alarm). */
export function chessNextWakeAt(s: ChessRoomState, now: number): number | null {
  const times: number[] = [];
  const deadline = s.game ? flagAt(s.game) : null;
  if (deadline !== null) times.push(deadline);
  for (const p of s.players) {
    if (!p.connected && p.disconnectedAt !== null) {
      const expiry = p.disconnectedAt + CHESS_TIMINGS.RECONNECT_GRACE_MS;
      if (expiry > now) times.push(expiry);
    }
  }
  if (s.emptySince !== null)
    times.push(s.emptySince + CHESS_TIMINGS.EMPTY_ROOM_TTL_MS);
  // A time already in the past simply fires the alarm right away.
  return times.length ? Math.min(...times) : null;
}

// ── Views ───────────────────────────────────────────────────────────

/** Everything except tokens: chess has no other secrets. */
export function toChessPublicState(s: ChessRoomState): ChessPublicState {
  return {
    code: s.code,
    version: s.version,
    phase: s.phase,
    hostId: s.hostId,
    clockMinutes: s.clockMinutes,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      awayUntil:
        !p.connected && p.disconnectedAt !== null
          ? p.disconnectedAt + CHESS_TIMINGS.RECONNECT_GRACE_MS
          : null,
      isHost: p.id === s.hostId,
    })),
    game: s.game
      ? {
          number: s.game.number,
          whiteId: s.game.whiteId,
          blackId: s.game.blackId,
          moves: s.game.moves,
          clockMinutes: s.game.clockMinutes,
          remaining: s.game.remaining,
          turnStartedAt: s.game.turnStartedAt,
          drawOfferBy: s.game.drawOfferBy,
        }
      : null,
    result: s.result,
  };
}

export function toChessPrivateView(
  s: ChessRoomState,
  seatId: string,
): ChessPrivateView | null {
  const me = seat(s, seatId);
  return me ? { playerId: me.id, token: me.token } : null;
}
