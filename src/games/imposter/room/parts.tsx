"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useSound } from "@/components/fx/Sound";
import { StickyNote } from "@/components/paper/StickyNote";
import { DoodleAvatar } from "@/components/sketch/DoodleAvatar";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { RCircle } from "@/components/sketch/Rough";
import { SketchBox } from "@/components/sketch/SketchBox";
import { Tape } from "@/components/paper/Tape";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, spring, strokeEase } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import { seededRange } from "@/lib/seed";
import type { PublicPlayer, PublicState } from "@/shared/protocol";
import type { ConnectionStatus } from "../useImposterRoom";

// ── Timer ring ──────────────────────────────────────────────────────

/**
 * Pencil-drawn ring that erases itself as time runs out. The last 5
 * seconds turn red and wobble.
 */
export function TimerRing({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const reduced = useReducedMotionSafe();
  const { tick } = useSound();
  const seconds = Math.ceil(remaining / 1000);
  const urgent = seconds <= 5;

  // One soft tick per second in the last 5 seconds (only if sound is on).
  useEffect(() => {
    if (seconds >= 1 && seconds <= 5) tick();
  }, [seconds, tick]);
  const progress = Math.max(0, Math.min(1, remaining / total));
  return (
    <motion.div
      role="timer"
      aria-label={`${seconds} seconds left`}
      className="relative grid size-16 shrink-0 place-items-center sm:size-20"
      animate={
        urgent && !reduced
          ? { rotate: [0, -4, 4, 0], scale: [1, 1.06, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={
        urgent && !reduced ? { duration: 0.5, repeat: Infinity } : spring
      }
    >
      <svg
        viewBox="0 0 80 80"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <RCircle
          cx={40}
          cy={40}
          d={66}
          seed={700}
          stroke={ink.sketch}
          strokeWidth={1.2}
          roughness={0.8}
        />
        <circle
          cx={40}
          cy={40}
          r={33}
          fill="none"
          stroke={urgent ? crayon.red : ink.graphite}
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - progress}
          transform="rotate(-90 40 40)"
          style={{
            transition: reduced
              ? "none"
              : "stroke-dashoffset 0.12s linear, stroke 0.3s",
          }}
        />
      </svg>
      <span
        className={cn(
          "relative font-hand text-2xl sm:text-3xl",
          urgent && "text-crayon-red",
        )}
        aria-hidden="true"
      >
        {seconds}
      </span>
    </motion.div>
  );
}

// ── Connection status ───────────────────────────────────────────────

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

/** Tiny doodle: green dot (connected), wobbling orange (reconnecting), red (offline). */
export function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const reduced = useReducedMotionSafe();
  const color =
    status === "connected"
      ? crayon.green
      : status === "offline"
        ? crayon.red
        : crayon.orange;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-lg"
      role="status"
      aria-live="polite"
    >
      <motion.svg
        viewBox="0 0 20 20"
        width={18}
        height={18}
        aria-hidden="true"
        animate={
          status === "reconnecting" && !reduced
            ? { rotate: 360 }
            : { rotate: 0 }
        }
        transition={
          status === "reconnecting"
            ? { duration: 1.2, repeat: Infinity, ease: "linear" }
            : { duration: 0 }
        }
      >
        <RCircle
          cx={10}
          cy={10}
          d={14}
          seed={710}
          fill={color}
          fillStyle="solid"
          strokeWidth={1.4}
        />
      </motion.svg>
      <span className={status === "connected" ? "sr-only sm:not-sr-only" : ""}>
        {STATUS_TEXT[status]}
      </span>
    </span>
  );
}

// ── Room code note ──────────────────────────────────────────────────

/** Room code on a sticky note, with a "copy invite link" doodle button. */
export function RoomCodeNote({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}/games/imposter/room/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  };
  return (
    <StickyNote rotate={-2} className="w-fit">
      <div className="-mx-2 -my-3 flex items-center gap-3">
        <div className="flex flex-col leading-none">
          <span className="font-note text-lg">room code</span>
          <span
            className="font-hand text-4xl tracking-[0.2em]"
            aria-label={`Room code ${code.split("").join(" ")}`}
          >
            {code}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex min-h-11 items-center gap-1 rounded px-1 font-hand text-lg underline decoration-wavy underline-offset-4"
        >
          <DoodleIcon name={copied ? "check" : "link"} size={20} />
          {copied ? "copied!" : "copy invite"}
        </button>
      </div>
    </StickyNote>
  );
}

// ── Players ─────────────────────────────────────────────────────────

export type PlayerMark = "active" | "done" | "skipped" | "locked" | null;

/** A player as a little taped note: doodle, name, host crown, status. */
export function PlayerNote({
  player,
  isYou,
  mark,
  size = 52,
}: {
  player: PublicPlayer;
  isYou: boolean;
  mark?: PlayerMark;
  size?: number;
}) {
  const tilt = seededRange(`${player.id}:note`, -4, 4);
  return (
    <li className="relative list-none" style={{ rotate: `${tilt}deg` }}>
      <SketchBox
        seed={`note-${player.id}`}
        fill={ink.card}
        fillStyle="solid"
        shadow="rest"
        stroke={mark === "active" ? crayon.red : ink.graphite}
        strokeWidth={mark === "active" ? 2.6 : 1.6}
        className="flex w-24 flex-col items-center gap-1 px-2 pt-4 pb-2 sm:w-28"
      >
        <DoodleAvatar
          avatar={player.avatar}
          size={size}
          crown={player.isHost}
          faded={!player.connected}
        />
        <span className="max-w-full truncate text-center text-lg leading-tight">
          {player.name}
          {isYou && <span className="text-sketch"> (you)</span>}
        </span>
        <span className="sr-only">
          {player.isHost ? "Host. " : ""}
          {!player.connected ? "Offline. " : ""}
          {mark === "active"
            ? "Their turn. "
            : mark === "done"
              ? "Gave a hint. "
              : mark === "skipped"
                ? "No hint. "
                : mark === "locked"
                  ? "Vote locked. "
                  : ""}
        </span>
        {mark && mark !== "active" && (
          <span className="absolute -top-2 -right-2" aria-hidden="true">
            <DoodleIcon
              name={mark === "skipped" ? "close" : "check"}
              size={22}
              color={mark === "skipped" ? ink.sketch : crayon.green}
              strokeWidth={2.6}
            />
          </span>
        )}
        {!player.connected && (
          <span className="font-note text-lg text-sketch">zzz…</span>
        )}
      </SketchBox>
      <Tape
        seed={`tape-${player.id}`}
        height={16}
        className="absolute -top-2 left-1/2 -translate-x-1/2 scale-75"
      />
    </li>
  );
}

export function PlayerBoard({
  state,
  youId,
  marks = {},
}: {
  state: PublicState;
  youId: string;
  marks?: Record<string, PlayerMark>;
}) {
  return (
    <section aria-labelledby="players-heading" className="flex flex-col gap-3">
      <h2 id="players-heading" className="font-hand text-2xl">
        Players{" "}
        <span className="text-sketch">
          {state.players.length}/{state.maxPlayers}
        </span>
      </h2>
      <ul className="flex flex-wrap gap-x-2 gap-y-5 pt-2">
        {state.players.map((p) => (
          <PlayerNote
            key={p.id}
            player={p}
            isYou={p.id === youId}
            mark={marks[p.id] ?? null}
          />
        ))}
      </ul>
    </section>
  );
}

// ── Shared notebook page of hints ───────────────────────────────────

/** Hints written on a notebook page, in turn order, one line each. */
export function HintsNotebook({
  state,
  activeId,
  activeTyping,
}: {
  state: PublicState;
  activeId?: string | null;
  activeTyping?: boolean;
}) {
  const reduced = useReducedMotionSafe();
  const hints = state.round?.hints ?? [];
  // How many hints existed when this page appeared (e.g. after a phase change).
  const [seenOnMount] = useState(hints.length);
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const active = activeId ? byId.get(activeId) : null;
  return (
    <section
      aria-labelledby="hints-heading"
      className="torn-paper relative px-4 py-4 sm:px-6"
    >
      <h2 id="hints-heading" className="mb-2 font-note text-2xl font-bold">
        Hints so far
      </h2>
      {hints.length === 0 && !active && (
        <p className="text-lg text-sketch">No hints yet.</p>
      )}
      <ol className="flex flex-col">
        {hints.map((h, i) => {
          const p = byId.get(h.playerId);
          return (
            <motion.li
              key={`${h.playerId}-${i}`}
              className="flex min-h-[2rem] items-center gap-3"
              // Only hints added while you watch write themselves in;
              // ones already on the page when it appears show at once.
              initial={
                i < seenOnMount
                  ? false
                  : reduced
                    ? { opacity: 0 }
                    : { opacity: 0, clipPath: "inset(0 100% 0 0)" }
              }
              animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              transition={{
                duration: reduced ? duration.reduced : duration.strokeLong,
                ease: strokeEase,
              }}
            >
              {p && <DoodleAvatar avatar={p.avatar} size={28} />}
              <span className="w-24 shrink-0 truncate text-lg text-sketch sm:w-28">
                {p?.name ?? "?"}
              </span>
              <span
                className={cn(
                  "font-hand text-2xl",
                  h.text === null && "text-sketch",
                )}
              >
                {h.text ?? "(no hint)"}
              </span>
            </motion.li>
          );
        })}
        {active && (
          <li
            className="flex min-h-[2rem] items-center gap-3"
            aria-live="polite"
          >
            <DoodleAvatar avatar={active.avatar} size={28} />
            <span className="w-24 shrink-0 truncate text-lg text-sketch sm:w-28">
              {active.name}
            </span>
            <span className="font-note text-2xl text-sketch">
              {activeTyping ? (
                <>
                  writing
                  <motion.span
                    aria-hidden="true"
                    animate={reduced ? undefined : { opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    …
                  </motion.span>
                </>
              ) : (
                "thinking…"
              )}
            </span>
          </li>
        )}
      </ol>
    </section>
  );
}

/** Small "who's who" lookup used by several panels. */
export const playerMap = (state: PublicState) =>
  new Map(state.players.map((p) => [p.id, p]));
