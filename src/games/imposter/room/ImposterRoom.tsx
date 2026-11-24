"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ConnectionDot } from "@/components/room/ConnectionDot";
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
import { SketchButton } from "@/components/sketch/SketchButton";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, spring } from "@/lib/motion";
import { TIMINGS } from "@/shared/config";
import type { Phase } from "@/shared/model";
import type { PublicState } from "@/shared/protocol";
import {
  generateRoomCode,
  IDENTITY_EVENT,
  lastMeRaw,
  readIdentityRaw,
  parseMe,
  loadIdentity,
  saveIdentity,
  type Identity,
} from "../identity";
import { IdentityForm } from "@/components/room/IdentityForm";
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
import { PlayerBoard, TimerRing, type PlayerMark } from "./parts";

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
    () => readIdentityRaw(code),
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
  const notice = useRoomNotices(state, you.playerId);

  const marks = useMemo(() => {
    const m: Record<string, PlayerMark> = {};
    const round = state.round;
    if (!round) return m;
    if (state.phase === "HINTS") {
      round.hints.forEach(
        (h) => (m[h.playerId] = h.text === null ? "skipped" : "done"),
      );
      if (round.activePlayerId) m[round.activePlayerId] = "active";
    }
    return m;
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="sr-only">
        Imposter, room {code}: {PHASE_NAME[state.phase]}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <RoomCodeNote code={code} roomPath="/games/imposter/room" />
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

      <div className="grid gap-8 lg:grid-cols-[1fr_14rem]">
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

      <Toast item={lastError} role="alert" />
      <Toast item={notice} role="status" className="bottom-24" />
    </div>
  );
}

/**
 * "Ann left" once a player's reconnect grace runs out, and "Bob is now
 * the host" when host passes on. Derived by comparing each new state with
 * the previous one.
 */
function useRoomNotices(state: PublicState, youId: string): Notice | null {
  const [prev, setPrev] = useState(state);
  const [notice, setNotice] = useState<Notice | null>(null);
  if (prev !== state) {
    const messages: string[] = [];
    const now = new Map(state.players.map((p) => [p.id, p]));
    for (const before of prev.players) {
      const after = now.get(before.id);
      // In a round the player stays listed as left; in the lobby the
      // seat of someone who was reconnecting is simply released.
      const leftRound = after && !before.left && after.left;
      const leftLobby =
        !after &&
        !before.connected &&
        prev.phase === "LOBBY" &&
        state.phase === "LOBBY";
      if (leftRound || leftLobby) messages.push(`${before.name} left`);
    }
    if (prev.hostId && state.hostId && prev.hostId !== state.hostId) {
      const host = now.get(state.hostId);
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
