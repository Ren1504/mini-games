/**
 * Imposter: the game rules as a pure reducer.
 *
 *   reduce(state, event, ctx) → { state, effects }
 *
 * No I/O, no clocks, no randomness of its own: time, randomness and the
 * word list come in through `ctx`, so every rule is unit-testable and the
 * Durable Object (party/src/index.ts) is a thin adapter that turns
 * WebSocket frames and alarms into events, persists the new state,
 * broadcasts it, carries out `effects` and schedules `nextWakeAt()`.
 *
 * Shared code: relative imports only.
 */
import { LIMITS, TIMINGS, type AvatarId } from "./config";
import type { Hint, Player, RoomState, RoundResult, SecretWord } from "./model";
import {
  nameKey,
  type ClientMessage,
  type ErrorCode,
  type PrivateView,
  type PublicState,
} from "./protocol";

// ── Events, effects, context ────────────────────────────────────────

type JoinMessage = Extract<ClientMessage, { type: "JOIN" }>;
/** Seated intents (everything except JOIN, which binds a seat, and PING). */
export type SeatIntent = Exclude<ClientMessage, { type: "JOIN" | "PING" }>;

export type MachineEvent =
  | {
      type: "JOIN";
      connId: string;
      message: JoinMessage;
      /** Fresh ids the adapter generates (crypto) in case a new seat is made. */
      newSeatId: string;
      newToken: string;
    }
  | { type: "INTENT"; connId: string; seatId: string; message: SeatIntent }
  /** The seat's last connection closed. */
  | { type: "DISCONNECT"; seatId: string }
  /** An alarm fired: process every deadline that is due. */
  | { type: "TICK" };

export type Effect =
  /** Bind this connection to the seat (store seatId in connection state). */
  | { type: "BIND"; connId: string; seatId: string }
  /** Tell every other connection holding this seat that it was replaced. */
  | { type: "REPLACE_OTHERS"; connId: string; seatId: string }
  | { type: "ERROR"; connId: string; code: ErrorCode; message: string }
  /** The room has been empty long enough: wipe its storage. */
  | { type: "CLEANUP" };

export type MachineContext = {
  now: number;
  /** Uniform [0, 1). Injected so tests are deterministic. */
  random: () => number;
  words: readonly SecretWord[];
};

export type ReduceResult = { state: RoomState; effects: Effect[] };

// ── Helpers ─────────────────────────────────────────────────────────

export function initialState(code: string): RoomState {
  return {
    code,
    hosted: false,
    hostId: null,
    maxPlayers: LIMITS.MAX_PLAYERS,
    phase: "LOBBY",
    phaseEndsAt: null,
    players: [],
    round: null,
    lastResult: null,
    roundsPlayed: 0,
    usedWordIds: [],
    emptySince: null,
    version: 0,
  };
}

const isRoundPhase = (s: RoomState) =>
  s.phase === "REVEAL" ||
  s.phase === "HINTS" ||
  s.phase === "DISCUSSION" ||
  s.phase === "VOTING";

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const seat = (s: RoomState, id: string | null | undefined) =>
  id ? s.players.find((p) => p.id === id) : undefined;

/** Still counts as "in the room": connected, or dropped less than 30s ago. */
const present = (p: Player, now: number) =>
  p.connected ||
  (p.disconnectedAt !== null &&
    now - p.disconnectedAt < TIMINGS.RECONNECT_GRACE_MS);

/** Dealt into the current round. */
const inRound = (s: RoomState, id: string) =>
  Boolean(s.round?.turnOrder.includes(id));

/** Connected players dealt into the round: the skip and vote denominator. */
function eligible(s: RoomState): Player[] {
  return s.players.filter((p) => p.connected && inRound(s, p.id));
}

/** Host passes to the longest-connected player if the host is gone. */
function ensureHost(s: RoomState, now: number) {
  const host = seat(s, s.hostId);
  if (host && present(host, now)) return;
  const next = s.players
    .filter((p) => p.connected)
    .sort((a, b) => a.joinedAt - b.joinedAt)[0];
  if (next) s.hostId = next.id;
  else if (!host) s.hostId = null;
}

const letters = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/**
 * True if a hint gives the word away: it contains the whole word (ignoring
 * case, accents, spaces and punctuation), or repeats any 4+ letter part of
 * it ("Eiffel Tower" → "tower" is blocked).
 */
export function hintRevealsWord(hint: string, word: string): boolean {
  const h = letters(hint);
  const w = letters(word);
  if (w && h.replace(/ /g, "").includes(w.replace(/ /g, ""))) return true;
  const hintWords = new Set(h.split(" "));
  return w.split(" ").some((part) => part.length >= 4 && hintWords.has(part));
}

function pickWord(s: RoomState, ctx: MachineContext): SecretWord {
  let pool = ctx.words.filter((w) => !s.usedWordIds.includes(w.id));
  if (pool.length === 0) {
    // Every word used this session: reshuffle the whole bank.
    s.usedWordIds = [];
    pool = [...ctx.words];
  }
  const word = pool[Math.floor(ctx.random() * pool.length)];
  s.usedWordIds.push(word.id);
  return word;
}

function finishRound(s: RoomState, outcome: RoundResult["outcome"]) {
  const round = s.round;
  if (!round) return;
  const tally: Record<string, number> = {};
  for (const target of Object.values(round.votes))
    tally[target] = (tally[target] ?? 0) + 1;
  s.lastResult = {
    outcome,
    imposterId: round.imposterId,
    secret: round.secret,
    votes: { ...round.votes },
    tally,
  };
  s.phase = "RESULT";
  s.phaseEndsAt = null;
  round.activeTyping = false;
}

/** Imposter alone on top → CAUGHT; otherwise (incl. ties) → ESCAPED. */
export function decideOutcome(
  votes: Record<string, string>,
  imposterId: string,
): "CAUGHT" | "ESCAPED" {
  const tally = new Map<string, number>();
  for (const target of Object.values(votes))
    tally.set(target, (tally.get(target) ?? 0) + 1);
  const max = Math.max(0, ...tally.values());
  if (max === 0) return "ESCAPED";
  const top = [...tally].filter(([, n]) => n === max).map(([id]) => id);
  return top.length === 1 && top[0] === imposterId ? "CAUGHT" : "ESCAPED";
}

function startVoting(s: RoomState, now: number) {
  if (!s.round) return;
  s.phase = "VOTING";
  s.phaseEndsAt = now + TIMINGS.VOTE_MS;
  s.round.votes = {};
  s.round.locked = [];
}

function startDiscussion(s: RoomState, now: number) {
  if (!s.round) return;
  s.phase = "DISCUSSION";
  s.phaseEndsAt = now + TIMINGS.DISCUSSION_MS;
  s.round.discussionStartedAt = now;
  s.round.skips = [];
  s.round.activeTyping = false;
}

/** Moves to the next hinter, skipping (as "no hint") anyone disconnected. */
function advanceHints(s: RoomState, now: number) {
  const round = s.round;
  if (!round) return;
  round.activeTyping = false;
  while (round.turnIndex < round.turnOrder.length) {
    const id = round.turnOrder[round.turnIndex];
    const player = seat(s, id);
    if (player?.connected) {
      s.phaseEndsAt = now + TIMINGS.HINT_MS;
      return;
    }
    round.hints.push({ playerId: id, text: null });
    round.turnIndex++;
  }
  startDiscussion(s, now);
}

function recordHint(s: RoomState, text: string | null, now: number) {
  const round = s.round;
  if (!round) return;
  const id = round.turnOrder[round.turnIndex];
  round.hints.push({ playerId: id, text } satisfies Hint);
  round.turnIndex++;
  advanceHints(s, now);
}

/** Early-end checks after any skip/vote/connection change. */
function maybeEndEarly(s: RoomState, ctx: MachineContext) {
  const round = s.round;
  if (!round) return;
  const voters = eligible(s);
  if (s.phase === "DISCUSSION" && voters.length > 0) {
    if (voters.every((p) => round.skips.includes(p.id)))
      startVoting(s, ctx.now);
  } else if (s.phase === "VOTING" && voters.length > 0) {
    if (voters.every((p) => round.locked.includes(p.id))) {
      finishRound(s, decideOutcome(round.votes, round.imposterId));
    }
  }
}

/** Round-ending conditions based on who is still present. */
function checkPresence(s: RoomState, ctx: MachineContext) {
  if (!isRoundPhase(s) || !s.round) return;
  const imposter = seat(s, s.round.imposterId);
  if (!imposter || !present(imposter, ctx.now)) {
    finishRound(s, "IMPOSTER_FLED");
    return;
  }
  const stillHere = s.round.turnOrder.filter((id) => {
    const p = seat(s, id);
    return p && present(p, ctx.now);
  });
  if (stillHere.length < LIMITS.MIN_PLAYERS) finishRound(s, "TOO_FEW_PLAYERS");
}

/** In the lobby, a seat is released once its grace period runs out. */
function releaseExpiredLobbySeats(s: RoomState, now: number) {
  if (s.phase !== "LOBBY") return;
  s.players = s.players.filter((p) => present(p, now));
}

// ── Reducer ─────────────────────────────────────────────────────────

export function reduce(
  prev: RoomState,
  event: MachineEvent,
  ctx: MachineContext,
): ReduceResult {
  const s = structuredClone(prev);
  const effects: Effect[] = [];
  const fail = (
    connId: string,
    code: ErrorCode,
    message: string,
  ): ReduceResult => ({
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
        ensureHost(s, ctx.now);
        break;
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
        Object.assign(s, initialState(s.code), {
          hosted: true,
          maxPlayers: message.maxPlayers ?? LIMITS.MAX_PLAYERS,
          usedWordIds: [],
          version: s.version,
        });
      } else {
        if (!s.hosted)
          return fail(connId, "ROOM_NOT_FOUND", "No room with that code.");
        releaseExpiredLobbySeats(s, ctx.now);
        if (s.phase !== "LOBBY") {
          return fail(
            connId,
            "IN_PROGRESS",
            "A round is being played. Try again in a moment.",
          );
        }
        if (s.players.length >= s.maxPlayers) {
          return fail(
            connId,
            "ROOM_FULL",
            `Room is full (${s.players.length}/${s.maxPlayers}).`,
          );
        }
        if (s.players.some((p) => nameKey(p.name) === nameKey(message.name))) {
          return fail(connId, "NAME_TAKEN", "Someone already has that name.");
        }
        if (s.players.some((p) => p.avatar === message.avatar)) {
          return fail(
            connId,
            "AVATAR_TAKEN",
            "That doodle is taken. Pick another.",
          );
        }
      }

      const player: Player = {
        id: event.newSeatId,
        token: event.newToken,
        name: message.name,
        avatar: message.avatar as AvatarId,
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
      const round = s.round;

      switch (message.type) {
        case "SET_MAX_PLAYERS": {
          if (!isHost)
            return fail(connId, "NOT_HOST", "Only the host can change that.");
          if (s.phase !== "LOBBY")
            return fail(connId, "WRONG_PHASE", "Only in the lobby.");
          if (message.maxPlayers < s.players.length) {
            return fail(
              connId,
              "INVALID_MESSAGE",
              `There are already ${s.players.length} players in the room.`,
            );
          }
          s.maxPlayers = message.maxPlayers;
          break;
        }

        case "START": {
          if (!isHost)
            return fail(connId, "NOT_HOST", "Only the host can start.");
          if (s.phase !== "LOBBY")
            return fail(connId, "WRONG_PHASE", "A round is already running.");
          // Players who dropped from the lobby don't get dealt in.
          s.players = s.players.filter((p) => p.connected);
          if (s.players.length < LIMITS.MIN_PLAYERS) {
            return fail(
              connId,
              "NOT_ENOUGH_PLAYERS",
              `Need at least ${LIMITS.MIN_PLAYERS} players to start.`,
            );
          }
          const order = shuffle(
            s.players.map((p) => p.id),
            ctx.random,
          );
          const secret = pickWord(s, ctx);
          const imposterId =
            s.players[Math.floor(ctx.random() * s.players.length)].id;
          s.round = {
            number: s.roundsPlayed + 1,
            secret,
            imposterId,
            turnOrder: order,
            turnIndex: 0,
            hints: [],
            activeTyping: false,
            discussionStartedAt: null,
            skips: [],
            votes: {},
            locked: [],
          };
          s.roundsPlayed += 1;
          s.lastResult = null;
          s.phase = "REVEAL";
          s.phaseEndsAt = ctx.now + TIMINGS.REVEAL_MS;
          break;
        }

        case "TYPING": {
          if (s.phase !== "HINTS" || !round)
            return { state: prev, effects: [] };
          if (round.turnOrder[round.turnIndex] !== seatId)
            return { state: prev, effects: [] };
          round.activeTyping = message.typing;
          break;
        }

        case "SUBMIT_HINT": {
          if (s.phase !== "HINTS" || !round)
            return fail(connId, "WRONG_PHASE", "Not hint time.");
          if (round.turnOrder[round.turnIndex] !== seatId) {
            return fail(connId, "NOT_YOUR_TURN", "Wait for your turn.");
          }
          if (s.phaseEndsAt !== null && ctx.now > s.phaseEndsAt) {
            return fail(connId, "TOO_LATE", "Time ran out for that hint.");
          }
          if (hintRevealsWord(message.text, round.secret.word)) {
            return fail(
              connId,
              "HINT_REVEALS_WORD",
              "That gives the word away! Try another hint.",
            );
          }
          recordHint(s, message.text, ctx.now);
          break;
        }

        case "TOGGLE_SKIP": {
          if (s.phase !== "DISCUSSION" || !round) {
            return fail(
              connId,
              "WRONG_PHASE",
              "Skipping is only for discussion.",
            );
          }
          if (!inRound(s, seatId))
            return fail(connId, "NOT_SEATED", "You're not in this round.");
          const unlocksAt =
            (round.discussionStartedAt ?? ctx.now) + TIMINGS.SKIP_UNLOCK_MS;
          if (ctx.now < unlocksAt)
            return fail(connId, "TOO_EARLY", "Skipping unlocks after 30s.");
          round.skips = round.skips.includes(seatId)
            ? round.skips.filter((id) => id !== seatId)
            : [...round.skips, seatId];
          maybeEndEarly(s, ctx);
          break;
        }

        case "CAST_VOTE": {
          if (s.phase !== "VOTING" || !round)
            return fail(connId, "WRONG_PHASE", "Not voting time.");
          if (!inRound(s, seatId))
            return fail(connId, "NOT_SEATED", "You're not in this round.");
          if (s.phaseEndsAt !== null && ctx.now > s.phaseEndsAt) {
            return fail(connId, "TOO_LATE", "Voting is over.");
          }
          if (round.locked.includes(seatId)) {
            return fail(connId, "ALREADY_LOCKED", "Your vote is locked in.");
          }
          if (message.targetId === seatId || !inRound(s, message.targetId)) {
            return fail(
              connId,
              "INVALID_TARGET",
              "You can't vote for that player.",
            );
          }
          round.votes[seatId] = message.targetId;
          break;
        }

        case "LOCK_VOTE": {
          if (s.phase !== "VOTING" || !round)
            return fail(connId, "WRONG_PHASE", "Not voting time.");
          if (round.locked.includes(seatId)) {
            return fail(connId, "ALREADY_LOCKED", "Your vote is locked in.");
          }
          if (!round.votes[seatId])
            return fail(connId, "INVALID_TARGET", "Circle someone first.");
          round.locked.push(seatId);
          maybeEndEarly(s, ctx);
          break;
        }

        case "PLAY_AGAIN": {
          if (!isHost)
            return fail(
              connId,
              "NOT_HOST",
              "Only the host can start a new round.",
            );
          if (s.phase !== "RESULT")
            return fail(connId, "WRONG_PHASE", "The round isn't over yet.");
          s.phase = "LOBBY";
          s.phaseEndsAt = null;
          s.round = null;
          s.players = s.players.filter((p) => p.connected);
          ensureHost(s, ctx.now);
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
      const round = s.round;
      // Disconnecting during your own hint turn skips it right away.
      if (
        s.phase === "HINTS" &&
        round &&
        round.turnOrder[round.turnIndex] === me.id
      ) {
        recordHint(s, null, ctx.now);
      }
      maybeEndEarly(s, ctx);
      break;
    }

    case "TICK": {
      const now = ctx.now;
      if (
        s.emptySince !== null &&
        now - s.emptySince >= TIMINGS.EMPTY_ROOM_TTL_MS
      ) {
        return {
          state: { ...initialState(s.code), version: s.version + 1 },
          effects: [{ type: "CLEANUP" }],
        };
      }
      if (s.phaseEndsAt !== null && now >= s.phaseEndsAt) {
        if (s.phase === "REVEAL") {
          s.phase = "HINTS";
          if (s.round) s.round.turnIndex = 0;
          advanceHints(s, now);
        } else if (s.phase === "HINTS") {
          recordHint(s, null, now);
        } else if (s.phase === "DISCUSSION") {
          startVoting(s, now);
        } else if (s.phase === "VOTING" && s.round) {
          finishRound(s, decideOutcome(s.round.votes, s.round.imposterId));
        }
      }
      releaseExpiredLobbySeats(s, now);
      break;
    }
  }

  // Idempotent housekeeping after every event.
  checkPresence(s, ctx);
  ensureHost(s, ctx.now);

  const changed =
    JSON.stringify({ ...s, version: 0 }) !==
    JSON.stringify({ ...prev, version: 0 });
  return {
    state: changed ? { ...s, version: prev.version + 1 } : prev,
    effects,
  };
}

// ── Scheduling ──────────────────────────────────────────────────────

/** Earliest future moment the room must wake up (for the DO alarm). */
export function nextWakeAt(s: RoomState, now: number): number | null {
  const times: number[] = [];
  if (s.phaseEndsAt !== null) times.push(s.phaseEndsAt);
  for (const p of s.players) {
    if (!p.connected && p.disconnectedAt !== null) {
      const expiry = p.disconnectedAt + TIMINGS.RECONNECT_GRACE_MS;
      if (expiry > now) times.push(expiry);
    }
  }
  if (s.emptySince !== null)
    times.push(s.emptySince + TIMINGS.EMPTY_ROOM_TTL_MS);
  // A time already in the past simply fires the alarm right away.
  return times.length ? Math.min(...times) : null;
}

// ── Views ───────────────────────────────────────────────────────────

/** The only state ever broadcast. Never contains secrets before RESULT. */
export function toPublicState(s: RoomState): PublicState {
  const round = s.round;
  const reveal = s.lastResult && (s.phase === "RESULT" || s.phase === "LOBBY");
  return {
    code: s.code,
    version: s.version,
    phase: s.phase,
    phaseEndsAt: s.phaseEndsAt,
    maxPlayers: s.maxPlayers,
    hostId: s.hostId,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      isHost: p.id === s.hostId,
    })),
    round: round
      ? {
          number: round.number,
          turnOrder: [...round.turnOrder],
          activePlayerId:
            s.phase === "HINTS"
              ? (round.turnOrder[round.turnIndex] ?? null)
              : null,
          activeTyping: s.phase === "HINTS" && round.activeTyping,
          hints: round.hints.map((h) => ({
            playerId: h.playerId,
            text: h.text,
          })),
          skipUnlocksAt:
            s.phase === "DISCUSSION" && round.discussionStartedAt !== null
              ? round.discussionStartedAt + TIMINGS.SKIP_UNLOCK_MS
              : null,
          skipCount:
            s.phase === "DISCUSSION"
              ? round.skips.filter((id) => eligible(s).some((p) => p.id === id))
                  .length
              : 0,
          eligibleCount: eligible(s).length,
          lockedVoterIds: s.phase === "VOTING" ? [...round.locked] : [],
        }
      : null,
    result:
      reveal && s.lastResult
        ? {
            outcome: s.lastResult.outcome,
            imposterId: s.lastResult.imposterId,
            word: s.lastResult.secret.word,
            category: s.lastResult.secret.category,
            votes: { ...s.lastResult.votes },
            tally: { ...s.lastResult.tally },
          }
        : null,
  };
}

/** Sent only on the seat owner's connection. */
export function toPrivateView(
  s: RoomState,
  seatId: string,
): PrivateView | null {
  const me = seat(s, seatId);
  if (!me) return null;
  const round = s.round;
  const dealt =
    round && round.turnOrder.includes(seatId) && s.phase !== "LOBBY";
  const isImposter = Boolean(dealt && round.imposterId === seatId);
  return {
    playerId: me.id,
    token: me.token,
    role: !dealt ? "lobby" : isImposter ? "imposter" : "crewmate",
    card: !dealt
      ? null
      : isImposter
        ? {
            kind: "imposter",
            category: round.secret.category,
            clue: round.secret.imposterClue,
          }
        : {
            kind: "word",
            word: round.secret.word,
            category: round.secret.category,
          },
    myVoteTargetId: dealt ? (round.votes[seatId] ?? null) : null,
    myVoteLocked: Boolean(dealt && round.locked.includes(seatId)),
    mySkip: Boolean(dealt && round.skips.includes(seatId)),
  };
}
