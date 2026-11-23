"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchButton } from "@/components/sketch/SketchButton";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, spring } from "@/lib/motion";
import { TIMINGS } from "@/shared/config";
import type { Phase } from "@/shared/model";
import type { PublicState } from "@/shared/protocol";
import {
  generateRoomCode,
  lastMeRaw,
  parseMe,
  loadIdentity,
  saveIdentity,
  type Identity,
} from "../identity";
import { IdentityForm } from "../ui/IdentityForm";
import {
  useCountdown,
  useImposterRoom,
  type RoomError,
} from "../useImposterRoom";
import {
  DiscussionPanel,
  HintsPanel,
  LobbyPanel,
  ResultPanel,
  RevealPanel,
  VotingPanel,
} from "./panels";
import {
  ConnectionDot,
  PlayerBoard,
  RoomCodeNote,
  TimerRing,
  type PlayerMark,
} from "./parts";

const IDENTITY_EVENT = "doodle-arcade:imposter:identity";
const storageKey = (code: string) => `doodle-arcade:imposter:room:${code}`;

/** Raw identity string: a stable snapshot for useSyncExternalStore. */
function readRaw(code: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(code));
  } catch {
    return null;
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener(IDENTITY_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(IDENTITY_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
const noop = () => () => {};

const PHASE_TOTAL: Partial<Record<Phase, number>> = {
  REVEAL: TIMINGS.REVEAL_MS,
  HINTS: TIMINGS.HINT_MS,
  DISCUSSION: TIMINGS.DISCUSSION_MS,
  VOTING: TIMINGS.VOTE_MS,
};

const PHASE_NAME: Record<Phase, string> = {
  LOBBY: "Waiting room",
  REVEAL: "Secret cards",
  HINTS: "Hints",
  DISCUSSION: "Discussion",
  VOTING: "Voting",
  RESULT: "Result",
};

const JOIN_ERROR_TEXT: Partial<Record<RoomError["code"], string>> = {
  ROOM_NOT_FOUND: "No room with that code. Check it, or host a new one.",
  ROOM_FULL: "That room is full.",
  IN_PROGRESS: "A round is being played right now. Try again in a moment.",
};

/** Root of /games/imposter/room/[code]. */
export function ImposterRoom({ code }: { code: string }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(code),
    () => null,
  );
  const identity = useMemo<Identity | null>(
    () => (raw ? loadIdentity(code) : null),
    [raw, code],
  );
  const rememberedRaw = useSyncExternalStore(noop, lastMeRaw, () => null);
  const remembered = useMemo(() => parseMe(rememberedRaw), [rememberedRaw]);
  const room = useImposterRoom(code, identity);

  // Host picked a code that's taken: quietly try a fresh one.
  useEffect(() => {
    if (room.joinError?.code === "CODE_IN_USE" && identity) {
      const next = generateRoomCode();
      saveIdentity(next, { ...identity, token: undefined });
      router.replace(`/games/imposter/room/${next}`);
    }
  }, [room.joinError, identity, router]);

  const adoptIdentity = (next: Identity) => {
    saveIdentity(code, next);
    window.dispatchEvent(new Event(IDENTITY_EVENT));
  };

  if (!mounted) return <Loading text="Opening the room…" />;

  // Invite link opened directly: ask for a name and doodle first.
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
          seed="replaced"
          className="font-hand text-5xl"
        />
        <p className="max-w-md text-xl">
          You opened this room somewhere else, so that tab has your seat now.
        </p>
        <SketchButton
          seed="use-this-tab"
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
  if (joinError && joinError.code === "NAME_TAKEN") {
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
            saveIdentity(code, next);
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
          seed="cant-join"
          className="font-hand text-5xl"
        />
        <p className="max-w-md text-xl" role="alert">
          {JOIN_ERROR_TEXT[joinError.code]}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <SketchButton
            seed="retry-join"
            color="blue"
            onClick={() => room.retryJoin()}
          >
            Try again
          </SketchButton>
          <Link
            href="/games/imposter/play"
            className="min-h-11 py-2 font-hand text-xl underline decoration-wavy underline-offset-4"
          >
            Host or join another room
          </Link>
        </div>
      </Centered>
    );
  }

  if (!room.state || !room.you) return <Joining status={room.status} />;

  return (
    <RoomView
      code={code}
      state={room.state}
      you={room.you}
      send={room.send}
      status={room.status}
      offset={room.offset}
      lastError={room.lastError}
    />
  );
}

function RoomView({
  code,
  state,
  you,
  send,
  status,
  offset,
  lastError,
}: {
  code: string;
  state: PublicState;
  you: NonNullable<ReturnType<typeof useImposterRoom>["you"]>;
  send: ReturnType<typeof useImposterRoom>["send"];
  status: ReturnType<typeof useImposterRoom>["status"];
  offset: number;
  lastError: RoomError | null;
}) {
  const reduced = useReducedMotionSafe();
  const remaining = useCountdown(state.phaseEndsAt, offset);
  const total = PHASE_TOTAL[state.phase];
  const serverNow = () => Date.now() + offset;
  const props = { state, you, send, serverNow };

  const marks = useMemo(() => {
    const m: Record<string, PlayerMark> = {};
    const round = state.round;
    if (!round) return m;
    if (state.phase === "HINTS") {
      round.hints.forEach(
        (h) => (m[h.playerId] = h.text === null ? "skipped" : "done"),
      );
      if (round.activePlayerId) m[round.activePlayerId] = "active";
    } else if (state.phase === "VOTING") {
      round.lockedVoterIds.forEach((id) => (m[id] = "locked"));
    }
    return m;
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">
        Imposter, room {code}: {PHASE_NAME[state.phase]}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RoomCodeNote code={code} />
        <div className="flex items-center gap-4">
          <ConnectionDot status={status} />
          {remaining !== null && total && (
            <TimerRing remaining={remaining} total={total} />
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {PHASE_NAME[state.phase]}
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
        <AnimatePresence mode="wait">
          <motion.section
            key={state.phase + (state.round?.number ?? 0)}
            aria-label={PHASE_NAME[state.phase]}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, x: 24, rotate: 0.6 }
            }
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={
              reduced ? { opacity: 0 } : { opacity: 0, x: -24, rotate: -0.6 }
            }
            transition={reduced ? { duration: duration.reduced } : spring}
            className="min-w-0"
          >
            {state.phase === "LOBBY" && <LobbyPanel {...props} />}
            {state.phase === "REVEAL" && <RevealPanel {...props} />}
            {state.phase === "HINTS" && <HintsPanel {...props} />}
            {state.phase === "DISCUSSION" && <DiscussionPanel {...props} />}
            {state.phase === "VOTING" && <VotingPanel {...props} />}
            {state.phase === "RESULT" && state.result && (
              <ResultPanel {...props} />
            )}
          </motion.section>
        </AnimatePresence>
        <aside>
          <PlayerBoard state={state} youId={you.playerId} marks={marks} />
        </aside>
      </div>

      <ErrorToast error={lastError} />
    </div>
  );
}

/** Rejected actions (wrong turn, hint gives the word away…), for 4s. */
function ErrorToast({ error }: { error: RoomError | null }) {
  const [visible, setVisible] = useState<RoomError | null>(null);
  const [lastShown, setLastShown] = useState<number | null>(null);
  if (error && error.at !== lastShown) {
    setLastShown(error.at);
    setVisible(error);
  }
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(null), 4000);
    return () => window.clearTimeout(t);
  }, [visible]);
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <AnimatePresence>
        {visible && (
          <motion.p
            key={visible.at}
            className="sticky-note px-5 py-3 font-hand text-xl text-[#2b2b2b]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {visible.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      {children}
    </div>
  );
}

/** How long to wait before saying the game server can't be reached. */
const UNREACHABLE_AFTER_MS = 6000;

/**
 * "Joining the room…", but if nothing arrives within a few seconds and
 * the socket isn't connected, say so plainly instead of spinning forever.
 */
function Joining({
  status,
}: {
  status: ReturnType<typeof useImposterRoom>["status"];
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), UNREACHABLE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!slow) return <Loading text="Joining the room…" />;
  if (status === "connected") return <Loading text="Still joining…" />;
  return (
    <Centered>
      <HandLettered
        as="h1"
        text="Can't reach the game server"
        seed="unreachable"
        className="font-hand text-4xl sm:text-5xl"
      />
      <p className="max-w-md text-xl" role="alert">
        {status === "offline"
          ? "You seem to be offline. Check your internet connection."
          : "The game server isn't answering. It keeps retrying in the background."}
      </p>
      <p className="max-w-md font-note text-xl text-sketch">
        Running it on your own computer? Make sure <code>npm run dev:all</code>{" "}
        is running (it starts the game server on port 1999).
      </p>
      <SketchButton
        seed="unreachable-retry"
        filled
        color="blue"
        onClick={() => window.location.reload()}
      >
        Try again
      </SketchButton>
    </Centered>
  );
}

/** "Join room" in hand lettering, the code itself in the clear code font. */
function JoinHeading({ code }: { code: string }) {
  return (
    <h1 className="flex flex-col items-center gap-2">
      <HandLettered
        as="span"
        text="Join room"
        seed="join-room"
        className="font-hand text-5xl"
      />
      <span
        className="font-code text-4xl font-bold tracking-[0.15em] text-graphite"
        aria-label={code.split("").join(" ")}
      >
        {code}
      </span>
    </h1>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="py-24 text-center font-note text-3xl text-sketch"
    >
      {text}
    </p>
  );
}
