"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { TornEdge } from "@/components/paper/TornEdge";
import { Annotate } from "@/components/sketch/Annotate";
import { DoodleAvatar, AVATAR_NAMES } from "@/components/sketch/DoodleAvatar";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { HandLettered } from "@/components/sketch/HandLettered";
import { RPath } from "@/components/sketch/Rough";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, spring } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import { LIMITS } from "@/shared/config";
import {
  hintSchema,
  type ClientMessage,
  type PrivateView,
  type PublicState,
} from "@/shared/protocol";
import { HintsNotebook, playerMap } from "./parts";
import { SecretCard } from "./SecretCard";

type PanelProps = {
  state: PublicState;
  you: PrivateView;
  send: (m: ClientMessage) => void;
  /** Server time now (ms), clock-skew corrected. */
  serverNow: () => number;
};

const Title = ({ children }: { children: string }) => (
  <HandLettered
    as="h2"
    text={children}
    seed={`title-${children}`}
    className="font-hand text-4xl sm:text-5xl"
  />
);

// ── LOBBY ───────────────────────────────────────────────────────────

export function LobbyPanel({ state, you, send }: PanelProps) {
  const isHost = state.hostId === you.playerId;
  const connected = state.players.filter((p) => p.connected).length;
  const need = Math.max(0, LIMITS.MIN_PLAYERS - connected);
  const host = playerMap(state).get(state.hostId ?? "");
  const last = state.result;

  return (
    <div className="flex flex-col gap-6">
      <Title>Waiting room</Title>
      {last && (
        <p className="font-note text-2xl text-sketch">
          Last round: the word was{" "}
          <strong className="font-hand text-graphite">{last.word}</strong>.
        </p>
      )}
      <p className="text-xl">
        Share the room code or invite link. You need at least{" "}
        {LIMITS.MIN_PLAYERS} players.
      </p>

      {isHost ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            <span id="lobby-max" className="font-hand text-2xl">
              Max players
            </span>
            <div
              role="group"
              aria-labelledby="lobby-max"
              className="flex items-center gap-3"
            >
              <button
                type="button"
                aria-label="Fewer players"
                disabled={
                  state.maxPlayers <=
                  Math.max(LIMITS.MIN_PLAYERS, state.players.length)
                }
                onClick={() =>
                  send({
                    type: "SET_MAX_PLAYERS",
                    maxPlayers: state.maxPlayers - 1,
                  })
                }
                className="grid size-11 place-items-center font-hand text-3xl disabled:opacity-30"
              >
                −
              </button>
              <output className="w-10 text-center font-hand text-3xl">
                {state.maxPlayers}
              </output>
              <button
                type="button"
                aria-label="More players"
                disabled={state.maxPlayers >= LIMITS.MAX_PLAYERS}
                onClick={() =>
                  send({
                    type: "SET_MAX_PLAYERS",
                    maxPlayers: state.maxPlayers + 1,
                  })
                }
                className="grid size-11 place-items-center font-hand text-3xl disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SketchButton
              seed="imposter-start"
              filled
              color="green"
              size="lg"
              disabled={need > 0}
              onClick={() => send({ type: "START" })}
            >
              START ▶
            </SketchButton>
            {need > 0 && (
              <span className="font-note text-2xl text-sketch">
                Need {need} more player{need === 1 ? "" : "s"}…
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="font-note text-2xl text-sketch" aria-live="polite">
          Waiting for {host?.name ?? "the host"} to start…
        </p>
      )}
    </div>
  );
}

// ── REVEAL ──────────────────────────────────────────────────────────

export function RevealPanel({ you }: PanelProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Title>Your secret card</Title>
      <p className="max-w-md text-xl">
        Look at it without letting anyone else see. Everyone has the same word…
        except the imposter.
      </p>
      {you.card && <SecretCard card={you.card} />}
    </div>
  );
}

/** Small "peek again" card for later phases. */
export function PeekAgain({ you }: { you: PrivateView }) {
  const [open, setOpen] = useState(false);
  if (!you.card) return null;
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="min-h-11 font-hand text-xl underline decoration-wavy underline-offset-4"
      >
        {open ? "Hide my card" : "Peek at my card again"}
      </button>
      {open && <SecretCard card={you.card} compact />}
    </div>
  );
}

// ── HINTS ───────────────────────────────────────────────────────────

export function HintsPanel({ state, you, send }: PanelProps) {
  const round = state.round!;
  const players = playerMap(state);
  const activeId = round.activePlayerId;
  const active = activeId ? players.get(activeId) : null;
  const myTurn = activeId === you.playerId;

  return (
    <div className="flex flex-col gap-5">
      <Title>Hint time</Title>
      <ol aria-label="Turn order" className="flex flex-wrap items-center gap-2">
        {round.turnOrder.map((id, i) => {
          const p = players.get(id);
          const done = i < round.hints.length;
          const isActive = id === activeId;
          return (
            <li key={id} className="flex items-center gap-1">
              <span
                className={cn(
                  "relative grid place-items-center rounded-full p-1",
                  done && "opacity-50",
                )}
              >
                {isActive ? (
                  <Annotate
                    type="circle"
                    show
                    color={crayon.red}
                    padding={2}
                    strokeWidth={2.4}
                  >
                    {p && (
                      <DoodleAvatar
                        avatar={p.avatar}
                        size={36}
                        label={`${p.name}, now`}
                      />
                    )}
                  </Annotate>
                ) : (
                  p && (
                    <DoodleAvatar
                      avatar={p.avatar}
                      size={36}
                      label={`${p.name}${done ? ", done" : ""}`}
                    />
                  )
                )}
              </span>
              {i < round.turnOrder.length - 1 && (
                <span aria-hidden="true" className="text-sketch">
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {myTurn ? (
        <HintInput send={send} />
      ) : (
        <p className="font-note text-2xl" aria-live="polite">
          {active
            ? `${active.name}'s turn${round.activeTyping ? " (writing…)" : ""}`
            : "Next…"}
        </p>
      )}

      <HintsNotebook
        state={state}
        activeId={activeId}
        activeTyping={round.activeTyping}
      />
      <PeekAgain you={you} />
    </div>
  );
}

function HintInput({ send }: { send: (m: ClientMessage) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const typingRef = useRef(false);
  const check = hintSchema.safeParse(text);
  const chars = [...text.trim()].length;

  const setTyping = (typing: boolean) => {
    if (typingRef.current === typing) return;
    typingRef.current = typing;
    send({ type: "TYPING", typing });
  };

  useEffect(
    () => () => {
      if (typingRef.current) send({ type: "TYPING", typing: false });
    },
    [send],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!check.success) return;
    send({ type: "SUBMIT_HINT", text: check.data });
    setTyping(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label
        htmlFor={`${id}-hint`}
        className="font-hand text-3xl text-crayon-red"
      >
        Your turn! Give a hint.
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <SketchBox
          seed="hint-input"
          strokeWidth={2.4}
          className="min-w-0 flex-1 px-4"
        >
          <input
            id={`${id}-hint`}
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setTyping(e.target.value.trim().length > 0);
            }}
            onBlur={() => setTyping(false)}
            maxLength={60}
            autoComplete="off"
            aria-describedby={`${id}-help`}
            className="w-full bg-transparent py-3 font-hand text-2xl text-graphite outline-none"
          />
        </SketchBox>
        <SketchButton
          seed="hint-submit"
          type="submit"
          filled
          color="yellow"
          disabled={!check.success}
        >
          Write it ▶
        </SketchButton>
      </div>
      <p
        id={`${id}-help`}
        className={cn(
          "text-lg",
          text && !check.success ? "text-crayon-red" : "text-sketch",
        )}
      >
        {text && !check.success
          ? check.error.issues[0]?.message
          : `Up to ${LIMITS.HINT_MAX_WORDS} words · ${chars}/${LIMITS.HINT_MAX_CHARS}. Don't say the word!`}
      </p>
    </form>
  );
}

// ── DISCUSSION ──────────────────────────────────────────────────────

export function DiscussionPanel({ state, you, send, serverNow }: PanelProps) {
  const round = state.round!;
  const unlocksAt = round.skipUnlocksAt ?? 0;
  const [, force] = useState(0);
  const locked = serverNow() < unlocksAt;
  useEffect(() => {
    if (!locked) return;
    const t = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(t);
  }, [locked]);
  const secondsToUnlock = Math.max(
    0,
    Math.ceil((unlocksAt - serverNow()) / 1000),
  );

  return (
    <div className="flex flex-col gap-5">
      <Title>Talk it over!</Title>
      <p className="text-xl">
        Who&apos;s bluffing? Discuss out loud (or on your call), then vote.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <SketchButton
          seed="skip-voting"
          color="purple"
          filled={you.mySkip}
          disabled={locked}
          aria-pressed={you.mySkip}
          onClick={() => send({ type: "TOGGLE_SKIP" })}
        >
          {locked
            ? `Skip unlocks in ${secondsToUnlock}s`
            : you.mySkip
              ? "✓ Ready to vote"
              : "Skip to voting"}
        </SketchButton>
        <span className="font-note text-2xl" aria-live="polite">
          Skip votes: {round.skipCount}/{round.eligibleCount}
        </span>
      </div>
      <HintsNotebook state={state} />
      <PeekAgain you={you} />
    </div>
  );
}

// ── VOTING ──────────────────────────────────────────────────────────

export function VotingPanel({ state, you, send }: PanelProps) {
  const round = state.round!;
  const players = playerMap(state);
  const candidates = round.turnOrder.filter((id) => id !== you.playerId);
  const locked = you.myVoteLocked;

  return (
    <div className="flex flex-col gap-5">
      <Title>Who&apos;s the imposter?</Title>
      <p className="text-xl">
        Tap a player to circle them, then lock in your vote.
      </p>
      <div
        role="radiogroup"
        aria-label="Vote for the imposter"
        className="flex flex-wrap gap-4"
      >
        {candidates.map((id) => {
          const p = players.get(id);
          if (!p) return null;
          const chosen = you.myVoteTargetId === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={chosen}
              aria-label={`${p.name} (${AVATAR_NAMES[p.avatar]})`}
              disabled={locked}
              onClick={() => send({ type: "CAST_VOTE", targetId: id })}
              className="flex w-24 flex-col items-center gap-1 disabled:cursor-default"
            >
              <Annotate
                type="circle"
                show={chosen}
                color={crayon.red}
                padding={6}
                strokeWidth={3}
                durationMs={450}
              >
                <DoodleAvatar
                  avatar={p.avatar}
                  size={64}
                  faded={!p.connected}
                />
              </Annotate>
              <span className="max-w-full truncate text-lg">{p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {locked ? (
          <span className="flex items-center gap-2 font-hand text-2xl">
            <DoodleIcon
              name="check"
              size={28}
              color={crayon.green}
              strokeWidth={3}
            />
            Vote locked!
          </span>
        ) : (
          <SketchButton
            seed="lock-vote"
            filled
            color="red"
            disabled={!you.myVoteTargetId}
            onClick={() => send({ type: "LOCK_VOTE" })}
          >
            Lock vote
          </SketchButton>
        )}
        <span className="font-note text-2xl" aria-live="polite">
          Locked: {round.lockedVoterIds.length}/{round.eligibleCount}
        </span>
      </div>
      <HintsNotebook state={state} />
    </div>
  );
}

// ── RESULT ──────────────────────────────────────────────────────────

const OUTCOME_TEXT = {
  CAUGHT: { stamp: "CAUGHT!", line: "Crewmates win!", color: crayon.green },
  ESCAPED: { stamp: "ESCAPED!", line: "The imposter wins!", color: crayon.red },
  IMPOSTER_FLED: {
    stamp: "FLED!",
    line: "The imposter left the room.",
    color: crayon.orange,
  },
  TOO_FEW_PLAYERS: {
    stamp: "PAUSED",
    line: "Too many players left, so the round ended.",
    color: crayon.orange,
  },
} as const;

export function ResultPanel({ state, you, send }: PanelProps) {
  const reduced = useReducedMotionSafe();
  const result = state.result!;
  const players = playerMap(state);
  const imposter = players.get(result.imposterId);
  const isHost = state.hostId === you.playerId;
  const host = players.get(state.hostId ?? "");
  const outcome = OUTCOME_TEXT[result.outcome];
  const [revealed, setRevealed] = useState(false);

  // Drumroll pause before the big reveal.
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), reduced ? 300 : 1500);
    return () => window.clearTimeout(t);
  }, [reduced]);

  const voters = state.round?.turnOrder ?? Object.keys(result.votes);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.p
            key="drumroll"
            className="py-16 font-hand text-4xl sm:text-5xl"
            initial={{ opacity: 0 }}
            animate={
              reduced ? { opacity: 1 } : { opacity: 1, rotate: [-1, 1, -1] }
            }
            exit={{ opacity: 0 }}
            transition={
              reduced
                ? { duration: duration.reduced }
                : { rotate: { duration: 0.3, repeat: Infinity } }
            }
          >
            And the imposter was…
          </motion.p>
        ) : (
          <motion.div
            key="reveal"
            className="flex flex-col items-center gap-4"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: duration.reduced } : spring}
          >
            {/* The stamp sits on a wrapper, not inside the torn paper:
                the paper's ragged edge is a clip mask and would cut it. */}
            <div className="relative">
              <TornEdge
                seed="reveal-paper"
                paperClassName="relative px-12 pt-14 pb-6 sm:px-16"
              >
                <div className="flex flex-col items-center gap-2">
                  {imposter && (
                    <DoodleAvatar
                      avatar={imposter.avatar}
                      size={110}
                      label={imposter.name}
                    />
                  )}
                  <span className="font-hand text-3xl">
                    {imposter?.name ?? "Someone"}
                  </span>
                  <span className="font-note text-xl text-sketch">
                    was the imposter
                  </span>
                </div>
              </TornEdge>
              <motion.span
                aria-hidden="true"
                className="absolute -top-3 -right-6 z-10 rotate-12 border-4 bg-card/70 px-2 font-hand text-2xl whitespace-nowrap sm:-right-10 sm:text-3xl"
                style={{ color: outcome.color, borderColor: outcome.color }}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 2.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduced
                    ? { duration: duration.reduced }
                    : { ...spring, delay: 0.3 }
                }
              >
                {outcome.stamp}
              </motion.span>
            </div>
            <p className="font-hand text-3xl" role="status">
              {outcome.line}
            </p>
            <p className="text-xl">
              The word was{" "}
              <strong className="font-hand text-3xl">{result.word}</strong>{" "}
              <span className="text-sketch">({result.category})</span>
            </p>

            <section
              aria-labelledby="votes-heading"
              className="w-full max-w-md text-left"
            >
              <h3 id="votes-heading" className="font-note text-2xl font-bold">
                Who voted for whom
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {voters.map((voterId) => {
                  const voter = players.get(voterId);
                  const target = players.get(result.votes[voterId] ?? "");
                  if (!voter) return null;
                  return (
                    <li
                      key={voterId}
                      className="flex items-center gap-2 text-lg"
                    >
                      <DoodleAvatar avatar={voter.avatar} size={30} />
                      <span className="w-24 truncate">{voter.name}</span>
                      {target ? (
                        <>
                          <svg
                            viewBox="0 0 60 20"
                            width={52}
                            height={18}
                            aria-hidden="true"
                            className="overflow-visible"
                          >
                            <RPath
                              d="M2 10 L54 10 M46 4 L56 10 L46 16"
                              seed={800 + voter.name.length}
                              strokeWidth={1.8}
                              stroke={ink.graphite}
                            />
                          </svg>
                          <span className="sr-only">voted for</span>
                          <DoodleAvatar avatar={target.avatar} size={30} />
                          <span
                            className={cn(
                              "truncate",
                              target.id === result.imposterId &&
                                "font-hand text-crayon-red",
                            )}
                          >
                            {target.name}
                          </span>
                        </>
                      ) : (
                        <span className="font-note text-sketch">
                          didn&apos;t vote
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {isHost ? (
              <SketchButton
                seed="play-again"
                filled
                color="green"
                size="lg"
                onClick={() => send({ type: "PLAY_AGAIN" })}
              >
                Play again ▶
              </SketchButton>
            ) : (
              <p className="font-note text-2xl text-sketch">
                Waiting for {host?.name ?? "the host"} to play again…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
