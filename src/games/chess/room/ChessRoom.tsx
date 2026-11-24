"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useSound } from "@/components/fx/Sound";
import { AvatarPicker } from "@/components/room/AvatarPicker";
import { ConnectionDot } from "@/components/room/ConnectionDot";
import { IdentityForm } from "@/components/room/IdentityForm";
import {
  generateRoomCode,
  lastMeRaw,
  parseMe,
  type Identity,
} from "@/components/room/identity";
import { RoomCodeNote } from "@/components/room/RoomCodeNote";
import {
  Centered,
  Joining,
  JoinHeading,
  Loading,
  Toast,
  type Notice,
} from "@/components/room/RoomScreens";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, spring } from "@/lib/motion";
import { ink } from "@/lib/palette";
import { CLOCK_MINUTES } from "@/shared/chess/config";
import type {
  ChessClientMessage,
  ChessGame,
  ChessPrivateView,
  ChessPublicState,
} from "@/shared/chess/protocol";
import {
  capturedPieces,
  materialBalance,
  replay,
  type Color,
} from "@/shared/chess/rules";
import { Board } from "../Board";
import {
  chessIdentity,
  useChessRoom,
  type ChessRoomApi,
  type ChessRoomError,
} from "../useChessRoom";
import {
  COLOR_NAME,
  LobbyPlayer,
  MoveList,
  PlayerCard,
  resultHeadline,
  useNow,
} from "./parts";

const ROOM_PATH = "/games/chess/room";

function subscribe(onChange: () => void) {
  window.addEventListener(chessIdentity.event, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(chessIdentity.event, onChange);
    window.removeEventListener("storage", onChange);
  };
}
const noop = () => () => {};

const JOIN_ERROR_TEXT: Partial<Record<ChessRoomError["code"], string>> = {
  ROOM_NOT_FOUND: "No room with that code. Check it, or host a new one.",
  ROOM_FULL: "This room already has two players.",
};

/** Root of /games/chess/room/[code]. */
export function ChessRoom({ code }: { code: string }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const raw = useSyncExternalStore(
    subscribe,
    () => chessIdentity.readRaw(code),
    () => null,
  );
  const identity = useMemo<Identity | null>(
    () => (raw ? chessIdentity.load(code) : null),
    [raw, code],
  );
  const rememberedRaw = useSyncExternalStore(noop, lastMeRaw, () => null);
  const remembered = useMemo(() => parseMe(rememberedRaw), [rememberedRaw]);
  const room = useChessRoom(code, identity);

  // Host picked a code that's taken: quietly try a fresh one.
  useEffect(() => {
    if (room.joinError?.code === "CODE_IN_USE" && identity) {
      const next = generateRoomCode();
      chessIdentity.save(next, { ...identity, token: undefined });
      router.replace(`${ROOM_PATH}/${next}`);
    }
  }, [room.joinError, identity, router]);

  const adoptIdentity = (next: Identity) => {
    chessIdentity.save(code, next);
    window.dispatchEvent(new Event(chessIdentity.event));
  };

  if (!mounted) return <Loading text="Setting up the board…" />;

  // Invite link opened directly: ask for a name first.
  if (!identity) {
    return (
      <Centered>
        <JoinHeading code={code} />
        <IdentityForm
          mode="join"
          fixedCode={code}
          initial={remembered}
          submitLabel="Join ▶"
          onSubmit={(id) => adoptIdentity(id)}
        />
      </Centered>
    );
  }

  if (room.replaced) {
    return (
      <Centered>
        <HandLettered
          as="h1"
          text="Open in another tab"
          seed="chess-replaced"
          className="font-hand text-5xl"
        />
        <p className="max-w-md text-xl">
          You opened this game somewhere else, so that tab has your seat now.
        </p>
        <SketchButton
          seed="chess-use-this-tab"
          filled
          color="blue"
          onClick={() => window.location.reload()}
        >
          Use this tab instead
        </SketchButton>
      </Centered>
    );
  }

  const joinError = room.joinError;
  if (joinError?.code === "NAME_TAKEN") {
    return (
      <Centered>
        <JoinHeading code={code} />
        <IdentityForm
          key={joinError.at}
          mode={identity.mode}
          fixedCode={code}
          initial={{ name: identity.name, avatar: identity.avatar }}
          error={joinError.message}
          submitLabel="Try again ▶"
          onSubmit={(id) => {
            const next = {
              ...identity,
              ...id,
              mode: identity.mode,
              token: undefined,
            };
            chessIdentity.save(code, next);
            room.retryJoin(next);
          }}
        />
      </Centered>
    );
  }
  if (joinError && JOIN_ERROR_TEXT[joinError.code]) {
    return (
      <Centered>
        <HandLettered
          as="h1"
          text="Can't join"
          seed="chess-cant-join"
          className="font-hand text-5xl"
        />
        <p className="max-w-md text-xl" role="alert">
          {JOIN_ERROR_TEXT[joinError.code]}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <SketchButton
            seed="chess-retry-join"
            color="blue"
            onClick={() => room.retryJoin()}
          >
            Try again
          </SketchButton>
          <Link
            href="/games/chess/play"
            className="min-h-11 py-2 font-hand text-xl underline decoration-wavy underline-offset-4"
          >
            Host or join another room
          </Link>
        </div>
      </Centered>
    );
  }

  if (!room.state || !room.you) return <Joining status={room.status} />;
  return <RoomView room={room} state={room.state} you={room.you} />;
}

type ViewProps = {
  room: ChessRoomApi;
  state: ChessPublicState;
  you: ChessPrivateView;
};

function RoomView({ room, state, you }: ViewProps) {
  const reduced = useReducedMotionSafe();
  const notice = useRoomNotices(state, you.playerId);
  const [nudge, setNudge] = useState<Notice | null>(null);
  const playing = state.phase === "PLAYING" && state.game;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">
        Chess, room {state.code}:{" "}
        {playing ? "game in progress" : "waiting room"}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RoomCodeNote code={state.code} roomPath={ROOM_PATH} />
        <ConnectionDot status={room.status} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={playing ? `game-${state.game!.number}` : "lobby"}
          initial={
            reduced ? { opacity: 0 } : { opacity: 0, x: 24, rotate: 0.6 }
          }
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -24, rotate: -0.6 }}
          transition={reduced ? { duration: duration.reduced } : spring}
        >
          {playing ? (
            <GameView
              room={room}
              state={state}
              you={you}
              game={state.game!}
              onNotYourTurn={() =>
                setNudge({ message: "Wait for your turn", at: Date.now() })
              }
            />
          ) : (
            <Lobby room={room} state={state} you={you} />
          )}
        </motion.div>
      </AnimatePresence>
      <Toast item={room.lastError} role="alert" />
      <Toast item={nudge} role="status" className="bottom-24" />
      <Toast item={notice} role="status" className="bottom-24" />
    </div>
  );
}

/** "Bob left", "You're the host now". */
function useRoomNotices(state: ChessPublicState, youId: string): Notice | null {
  const [prev, setPrev] = useState(state);
  const [notice, setNotice] = useState<Notice | null>(null);
  if (prev !== state) {
    const messages: string[] = [];
    const now = new Set(state.players.map((p) => p.id));
    for (const before of prev.players)
      if (!now.has(before.id) && before.id !== youId)
        messages.push(`${before.name} left`);
    if (prev.hostId && state.hostId && prev.hostId !== state.hostId) {
      const host = state.players.find((p) => p.id === state.hostId);
      if (host)
        messages.push(
          host.id === youId
            ? "You're the host now"
            : `${host.name} is now the host`,
        );
    }
    setPrev(state);
    if (messages.length)
      setNotice({ message: messages.join(" · "), at: state.version });
  }
  return notice;
}

// ── Waiting room ────────────────────────────────────────────────────

function Lobby({ room, state, you }: ViewProps) {
  const send = room.send;
  const me = state.players.find((p) => p.id === you.playerId);
  const opponent = state.players.find((p) => p.id !== you.playerId);
  const isHost = state.hostId === you.playerId;
  const ready =
    state.players.length === 2 && state.players.every((p) => p.connected);
  const result = state.result;
  // Ticks only while someone is reconnecting (for their countdown).
  const now = useNow(state.players.some((p) => p.awayUntil !== null));
  const headline = result ? resultHeadline(result, you.playerId) : null;
  const finalChess = useMemo(
    () => (result ? replay(result.moves) : null),
    [result],
  );
  const myResultColor: Color | null = result
    ? result.white.id === you.playerId
      ? "w"
      : result.black.id === you.playerId
        ? "b"
        : null
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-6">
        {result && headline && finalChess ? (
          <section
            aria-labelledby="chess-result"
            className="flex flex-col gap-4"
          >
            <HandLettered
              as="h2"
              id="chess-result"
              text={headline.title}
              seed={`result-${result.number}`}
              className="font-hand text-5xl"
            />
            <p className="text-xl">
              {headline.detail}{" "}
              {result.moves.length > 0 && (
                <span className="text-sketch">
                  ({Math.ceil(result.moves.length / 2)} moves)
                </span>
              )}
            </p>
            <div className="mx-auto w-full max-w-md">
              <Board
                moves={result.moves}
                bottom={myResultColor ?? "w"}
                myColor={null}
                canMove={false}
                onMove={() => {}}
              />
            </div>
          </section>
        ) : (
          <HandLettered
            as="h2"
            text="Waiting room"
            seed="chess-lobby"
            className="font-hand text-5xl"
          />
        )}

        {me && (
          <AvatarPicker
            value={me.avatar}
            taken={opponent ? [opponent.avatar] : []}
            onChange={(avatar) => {
              send({ type: "SET_AVATAR", avatar });
              chessIdentity.saveAvatarPreference(state.code, avatar);
            }}
          />
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <section aria-label="Players" className="flex flex-col gap-2">
          <h2 className="font-hand text-2xl">Players</h2>
          {[me, opponent].map((p) =>
            p ? (
              <LobbyPlayer
                key={p.id}
                player={p}
                isYou={p.id === you.playerId}
                serverNow={now + room.offset}
              />
            ) : (
              <p
                key="waiting"
                className="rounded-md border-2 border-dashed border-[var(--rule-line)] px-3 py-4 font-note text-xl text-sketch"
              >
                Waiting for your opponent… send them the invite link.
              </p>
            ),
          )}
          <p className="font-note text-lg text-sketch">
            {state.result
              ? "Colors swap every game."
              : "Colors are picked at random."}
          </p>
        </section>

        <section
          aria-labelledby="chess-clock-label"
          className="flex flex-col gap-2"
        >
          <h2 id="chess-clock-label" className="font-hand text-2xl">
            Clock
          </h2>
          {isHost ? (
            <div
              role="group"
              aria-labelledby="chess-clock-label"
              className="flex flex-wrap gap-2"
            >
              {CLOCK_MINUTES.map((m) => (
                <SketchButton
                  key={m}
                  seed={`clock-${m}`}
                  color="purple"
                  filled={state.clockMinutes === m}
                  aria-pressed={state.clockMinutes === m}
                  onClick={() => send({ type: "SET_CLOCK", minutes: m })}
                  className="[&>span]:min-h-10 [&>span]:px-3 [&>span]:text-lg"
                >
                  {m === 0 ? "No clock" : `${m} min`}
                </SketchButton>
              ))}
            </div>
          ) : (
            <p className="text-xl">
              {state.clockMinutes === 0
                ? "No clock"
                : `${state.clockMinutes} minutes each`}
              <span className="text-sketch"> (host picks)</span>
            </p>
          )}
        </section>

        {isHost ? (
          <div className="flex flex-col gap-2">
            <SketchButton
              seed="chess-start"
              color="green"
              filled
              size="lg"
              disabled={!ready}
              onClick={() => send({ type: "START" })}
            >
              {state.result ? "Play again ▶" : "Start game ▶"}
            </SketchButton>
            {!ready && (
              <p className="font-note text-lg text-sketch">
                {state.players.length < 2
                  ? "You can start once your opponent joins."
                  : "Waiting for your opponent to reconnect…"}
              </p>
            )}
          </div>
        ) : (
          <p className="font-note text-2xl text-sketch">
            Waiting for the host to start…
          </p>
        )}
      </aside>
    </div>
  );
}

// ── Game ────────────────────────────────────────────────────────────

/**
 * Moves shown on the board: the server's, plus mine until it answers. The
 * pending move remembers which move list (and error) it was made on, so
 * it disappears by itself as soon as the server sends a new list (my move
 * confirmed) or an error (my move rejected).
 */
function useShownMoves(game: ChessGame, error: ChessRoomError | null) {
  const [pending, setPending] = useState<{
    uci: string;
    base: readonly string[];
    error: ChessRoomError | null;
  } | null>(null);
  const active =
    pending !== null && pending.base === game.moves && pending.error === error;
  const moves = useMemo(
    () => (active ? [...game.moves, pending.uci] : game.moves),
    [active, game.moves, pending],
  );
  const play = (uci: string) => setPending({ uci, base: game.moves, error });
  return { moves, play };
}

function GameView({
  room,
  state,
  you,
  game,
  onNotYourTurn,
}: ViewProps & { game: ChessGame; onNotYourTurn: () => void }) {
  const send = (m: ChessClientMessage) => room.send(m);
  const { moves, play } = useShownMoves(game, room.lastError);
  const chess = useMemo(() => replay(moves), [moves]);
  const myColor: Color | null =
    game.whiteId === you.playerId
      ? "w"
      : game.blackId === you.playerId
        ? "b"
        : null;
  const bottom = myColor ?? "w";
  const top: Color = bottom === "w" ? "b" : "w";
  const turn = chess.turn();
  const myTurn = myColor === turn && moves.length === game.moves.length;
  const captured = useMemo(() => capturedPieces(chess), [chess]);
  const balance = useMemo(() => materialBalance(chess), [chess]);
  const timed = game.remaining !== null;
  const anyoneAway = state.players.some((p) => p.awayUntil !== null);
  const now = useNow(timed || anyoneAway);
  const serverNow = now + room.offset;
  useMoveSounds(chess, moves.length);

  const clockFor = (c: Color) => {
    if (!game.remaining) return null;
    const base = game.remaining[c];
    // Only the side to move (per the server) is ticking.
    const serverTurn: Color = game.moves.length % 2 === 0 ? "w" : "b";
    return c === serverTurn ? base - (serverNow - game.turnStartedAt) : base;
  };
  const player = (c: Color) =>
    state.players.find(
      (p) => p.id === (c === "w" ? game.whiteId : game.blackId),
    );

  const card = (c: Color) => (
    <PlayerCard
      player={player(c)}
      color={c}
      isYou={player(c)?.id === you.playerId}
      captured={captured[c]}
      lead={c === "w" ? balance : -balance}
      clockMs={clockFor(c)}
      ticking={timed && turn === c}
      toMove={turn === c}
      serverNow={serverNow}
    />
  );

  const opponentName =
    player(myColor ? (myColor === "w" ? "b" : "w") : "b")?.name ?? "Opponent";
  const status = chess.isCheck()
    ? myTurn
      ? "Check! Your move."
      : `Check! ${opponentName} is thinking…`
    : myTurn
      ? "Your move"
      : `${opponentName} is thinking…`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_1fr]">
      <div className="flex flex-col gap-2">
        {card(top)}
        <Board
          moves={moves}
          bottom={bottom}
          myColor={myColor}
          canMove={myTurn}
          onMove={(uci) => {
            play(uci);
            send({ type: "MOVE", uci });
          }}
          onNotYourTurn={onNotYourTurn}
        />
        {card(bottom)}
      </div>

      <div className="flex flex-col gap-5">
        <p
          aria-live="polite"
          className={cn(
            "font-hand text-3xl",
            chess.isCheck() && "text-crayon-red",
          )}
        >
          {status}
        </p>
        <DrawAndResign
          game={game}
          myColor={myColor}
          send={send}
          opponentName={opponentName}
        />
        <SketchBox
          seed="chess-moves"
          fill={ink.card}
          fillStyle="solid"
          strokeWidth={1.8}
          className="px-4 py-3"
        >
          <MoveList chess={chess} />
        </SketchBox>
        <p className="font-note text-lg text-sketch">
          You play {myColor ? COLOR_NAME[myColor] : "nothing (watching)"}.{" "}
          {game.clockMinutes ? `${game.clockMinutes} min each.` : "No clock."}
        </p>
      </div>
    </div>
  );
}

/** Resign (tap twice to confirm), offer a draw, answer an offer. */
function DrawAndResign({
  game,
  myColor,
  send,
  opponentName,
}: {
  game: ChessGame;
  myColor: Color | null;
  send: (m: ChessClientMessage) => void;
  opponentName: string;
}) {
  const [confirmResign, setConfirmResign] = useState(false);
  useEffect(() => {
    if (!confirmResign) return;
    const t = window.setTimeout(() => setConfirmResign(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmResign]);
  if (!myColor) return null;
  const offer = game.drawOfferBy;
  const theyOffered = offer !== null && offer !== myColor;
  const iOffered = offer === myColor;

  return (
    <div className="flex flex-col gap-3">
      {theyOffered && (
        <div
          role="alert"
          className="sticky-note flex flex-wrap items-center gap-3 px-4 py-3 text-[#2b2b2b]"
        >
          <span className="font-hand text-xl">
            {opponentName} offers a draw.
          </span>
          <SketchButton
            seed="draw-accept"
            color="green"
            filled
            onClick={() => send({ type: "ANSWER_DRAW", accept: true })}
          >
            Accept
          </SketchButton>
          <SketchButton
            seed="draw-decline"
            color="red"
            onClick={() => send({ type: "ANSWER_DRAW", accept: false })}
          >
            Decline
          </SketchButton>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <SketchButton
          seed="draw-offer"
          color="blue"
          disabled={iOffered || theyOffered}
          onClick={() => send({ type: "OFFER_DRAW" })}
        >
          {iOffered ? "Draw offered…" : "Offer draw"}
        </SketchButton>
        <SketchButton
          seed="resign"
          color="red"
          filled={confirmResign}
          onClick={() => {
            if (confirmResign) send({ type: "RESIGN" });
            else setConfirmResign(true);
          }}
        >
          {confirmResign ? "Sure? Tap again" : "Resign"}
        </SketchButton>
      </div>
    </div>
  );
}

/**
 * Soft sounds as the game goes (only when sound is on): a tick for a
 * move, a rustle for a capture, the chime for check.
 */
function useMoveSounds(chess: ReturnType<typeof replay>, plies: number) {
  const { tick, rustle, chime } = useSound();
  const heard = useRef(plies);
  useEffect(() => {
    if (plies <= heard.current) return;
    heard.current = plies;
    const last = chess.history({ verbose: true }).at(-1);
    if (!last) return;
    if (chess.isCheck()) chime();
    else if (last.captured) rustle();
    else tick();
  }, [plies, chess, chime, rustle, tick]);
}
