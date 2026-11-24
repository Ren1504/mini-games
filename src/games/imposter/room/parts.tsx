"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useSound } from "@/components/fx/Sound";
import { DoodleAvatar } from "@/components/sketch/DoodleAvatar";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { RCircle } from "@/components/sketch/Rough";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, spring, strokeEase } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import type { PublicPlayer, PublicState } from "@/shared/protocol";

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

// ── Players ─────────────────────────────────────────────────────────

export type PlayerMark = "active" | "done" | "skipped" | null;

/** "reconnecting…" while inside the grace period, "left" after it. */
const presence = (p: PublicPlayer) =>
  p.left ? "left" : p.connected ? null : "reconnecting";

/** One compact row: small doodle, name, and a short status tag. */
function PlayerRow({
  player,
  isYou,
  mark,
  typing,
}: {
  player: PublicPlayer;
  isYou: boolean;
  mark: PlayerMark;
  typing: boolean;
}) {
  const reduced = useReducedMotionSafe();
  const away = presence(player);
  const tag =
    away === "left"
      ? "left"
      : away === "reconnecting"
        ? "reconnecting…"
        : mark === "active"
          ? typing
            ? "writing…"
            : "their turn"
          : null;
  return (
    <li
      className={cn(
        "flex min-h-11 items-center gap-2 border-b border-[var(--rule-line)] py-1",
        mark === "active" && !away && "text-crayon-red",
      )}
    >
      <DoodleAvatar
        avatar={player.avatar}
        size={30}
        crown={player.isHost}
        faded={Boolean(away)}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-lg leading-tight",
          away === "left" && "text-sketch line-through",
        )}
      >
        {player.name}
        {isYou && <span className="text-sketch"> (you)</span>}
      </span>
      <span className="sr-only">
        {player.isHost ? "Host. " : ""}
        {mark === "done"
          ? "Gave a hint. "
          : mark === "skipped"
            ? "No hint. "
            : ""}
      </span>
      {tag ? (
        <motion.span
          className={cn(
            "shrink-0 font-note text-lg",
            away === "reconnecting"
              ? "text-crayon-orange"
              : away
                ? "text-sketch"
                : "",
          )}
          animate={
            away === "reconnecting" && !reduced
              ? { opacity: [0.4, 1, 0.4] }
              : undefined
          }
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          {tag}
        </motion.span>
      ) : (
        mark &&
        mark !== "active" && (
          <DoodleIcon
            name={mark === "skipped" ? "close" : "check"}
            size={20}
            color={mark === "skipped" ? ink.sketch : crayon.green}
            strokeWidth={2.6}
          />
        )
      )}
    </li>
  );
}

/** Narrow list of players beside the game. */
export function PlayerBoard({
  state,
  youId,
  marks = {},
}: {
  state: PublicState;
  youId: string;
  marks?: Record<string, PlayerMark>;
}) {
  const here = state.players.filter((p) => !p.left).length;
  return (
    <section aria-labelledby="players-heading" className="flex flex-col gap-1">
      <h2 id="players-heading" className="font-hand text-2xl">
        Players{" "}
        <span className="text-sketch">
          {here}/{state.maxPlayers}
        </span>
      </h2>
      <ul aria-live="polite" className="flex flex-col">
        {state.players.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            isYou={p.id === youId}
            mark={marks[p.id] ?? null}
            typing={Boolean(state.round?.activeTyping)}
          />
        ))}
      </ul>
    </section>
  );
}

// ── Shared notebook page of hints ───────────────────────────────────

/** Hints written on a notebook page, in the order given, one line each. */
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
      className="torn-paper relative min-h-72 px-5 py-6 sm:px-8"
    >
      <h2 id="hints-heading" className="mb-3 font-note text-3xl font-bold">
        Hints so far
      </h2>
      {hints.length === 0 && !active && (
        <p className="text-xl text-sketch">No hints yet.</p>
      )}
      <ol className="flex flex-col">
        {hints.map((h, i) => {
          const p = byId.get(h.playerId);
          return (
            <motion.li
              key={`${h.playerId}-${i}`}
              className="flex min-h-[3.25rem] items-center gap-4 border-b border-[var(--rule-line)]"
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
              {p && <DoodleAvatar avatar={p.avatar} size={40} />}
              <span className="w-28 shrink-0 truncate text-xl text-sketch sm:w-36">
                {p?.name ?? "?"}
              </span>
              <span
                className={cn(
                  "font-hand text-3xl sm:text-4xl",
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
            className="flex min-h-[3.25rem] items-center gap-4 border-b border-[var(--rule-line)]"
            aria-live="polite"
          >
            <DoodleAvatar avatar={active.avatar} size={40} />
            <span className="w-28 shrink-0 truncate text-xl text-sketch sm:w-36">
              {active.name}
            </span>
            <span className="font-note text-3xl text-sketch">
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
