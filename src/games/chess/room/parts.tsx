"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DoodleAvatar } from "@/components/sketch/DoodleAvatar";
import { SketchBox } from "@/components/sketch/SketchBox";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { crayon, ink } from "@/lib/palette";
import type {
  ChessOutcome,
  ChessPlayer,
  ChessResult,
} from "@/shared/chess/protocol";
import type { Chess } from "chess.js";
import type { Color, PieceSymbol } from "@/shared/chess/rules";
import { PIECE_INK, PIECE_PAPER, PIECE_NAME, PieceArt } from "../PieceArt";

export const COLOR_NAME: Record<Color, string> = { w: "White", b: "Black" };

/** 83_400 → "1:24"; under 20s shows tenths ("0:07.3"). */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const total = Math.floor(clamped / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  if (clamped < 20_000)
    return `${m}:${s}.${Math.floor((clamped % 1000) / 100)}`;
  return `${m}:${s}`;
}

/** Re-renders ~10×/s while `active`, returning Date.now(). */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

const OUTCOME_TEXT: Record<ChessOutcome, string> = {
  CHECKMATE: "by checkmate",
  RESIGNED: "by resignation",
  TIMEOUT: "on time",
  TIMEOUT_DRAW: "time ran out, but there was nothing left to mate with",
  ABANDONED: "(opponent left)",
  STALEMATE: "by stalemate",
  DRAW_AGREED: "by agreement",
  REPETITION: "by threefold repetition",
  FIFTY_MOVES: "by the 50-move rule",
  INSUFFICIENT: "not enough pieces left to mate",
};

/** "Ann wins by checkmate!" / "Draw by stalemate". */
export function resultHeadline(result: ChessResult, youId: string) {
  if (!result.winner) {
    const why = OUTCOME_TEXT[result.outcome];
    return {
      title: "It's a draw",
      detail:
        result.outcome === "TIMEOUT_DRAW" || result.outcome === "INSUFFICIENT"
          ? `Draw: ${why}.`
          : `Draw ${why}.`,
    };
  }
  const winner = result.winner === "w" ? result.white : result.black;
  const you = winner.id === youId;
  return {
    title: you ? "You win!" : `${winner.name} wins!`,
    detail: `${you ? "You won" : `${winner.name} won`} ${OUTCOME_TEXT[result.outcome]}.`,
  };
}

/** A small dot showing which color someone plays. */
function ColorDot({ color }: { color: Color }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3.5 shrink-0 rounded-full border-2"
      style={{
        borderColor: PIECE_INK,
        background: color === "w" ? PIECE_PAPER : PIECE_INK,
      }}
    />
  );
}

/**
 * One player beside the board: doodle, name, color, clock, and the pieces
 * they've captured (with a +N material lead) underneath the name.
 */
export function PlayerCard({
  player,
  color,
  isYou,
  captured,
  lead,
  clockMs,
  ticking,
  toMove,
  serverNow,
}: {
  player: ChessPlayer | undefined;
  color: Color;
  isYou: boolean;
  /** Opponent pieces this player has taken. */
  captured: PieceSymbol[];
  /** Material lead (only shown when positive). */
  lead: number;
  /** Time left, or null when there's no clock. */
  clockMs: number | null;
  ticking: boolean;
  toMove: boolean;
  serverNow: number;
}) {
  const reduced = useReducedMotionSafe();
  const awaySeconds =
    player?.awayUntil != null
      ? Math.max(0, Math.ceil((player.awayUntil - serverNow) / 1000))
      : null;
  const low = clockMs !== null && clockMs < 20_000;
  const takenColor: Color = color === "w" ? "b" : "w";
  return (
    <div
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-md px-2 py-1.5",
        toMove && "bg-[var(--color-highlighter)]/30",
      )}
    >
      {player ? (
        <DoodleAvatar
          avatar={player.avatar}
          size={44}
          crown={player.isHost}
          faded={!player.connected}
        />
      ) : (
        <span className="size-11" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <ColorDot color={color} />
          <span className="truncate font-hand text-2xl leading-tight">
            {player?.name ?? "…"}
            {isYou && <span className="text-sketch"> (you)</span>}
          </span>
          {awaySeconds !== null && (
            <motion.span
              className="shrink-0 font-note text-lg text-crayon-orange"
              animate={reduced ? undefined : { opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              reconnecting… {awaySeconds}s
            </motion.span>
          )}
        </div>
        {/* Captured pieces, below the name. */}
        <div
          className="flex min-h-6 flex-wrap items-center"
          aria-label={
            captured.length
              ? `Captured: ${captured.map((p) => PIECE_NAME[p]).join(", ")}`
              : "No captures yet"
          }
          role="img"
        >
          {captured.map((p, i) => (
            <PieceArt
              key={`${p}-${i}`}
              type={p}
              color={takenColor}
              className={cn(
                "size-6",
                i > 0 && captured[i - 1] === p && "-ml-3",
              )}
            />
          ))}
          {lead > 0 && (
            <span className="ml-1 font-note text-lg text-sketch">+{lead}</span>
          )}
        </div>
      </div>
      {clockMs !== null && (
        <SketchBox
          seed={`clock-${color}`}
          fill={ticking ? (low ? crayon.red : ink.key) : undefined}
          fillStyle="solid"
          strokeWidth={2}
          className={cn(
            "shrink-0 px-3 py-1 font-code text-2xl font-bold tabular-nums",
            !ticking && "text-sketch",
            ticking && low && "text-[#fffdf7]",
          )}
          role="timer"
          aria-label={`${COLOR_NAME[color]}'s clock: ${formatClock(clockMs)}`}
        >
          {formatClock(clockMs)}
        </SketchBox>
      )}
    </div>
  );
}

/** A player in the waiting room (colors aren't decided yet). */
export function LobbyPlayer({
  player,
  isYou,
  serverNow,
}: {
  player: ChessPlayer;
  isYou: boolean;
  serverNow: number;
}) {
  const awaySeconds =
    player.awayUntil != null
      ? Math.max(0, Math.ceil((player.awayUntil - serverNow) / 1000))
      : null;
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-[var(--rule-line)] py-1">
      <DoodleAvatar
        avatar={player.avatar}
        size={40}
        crown={player.isHost}
        faded={!player.connected}
      />
      <span className="min-w-0 flex-1 truncate font-hand text-2xl">
        {player.name}
        {isYou && <span className="text-sketch"> (you)</span>}
        <span className="sr-only">{player.isHost ? ", host" : ""}</span>
      </span>
      {awaySeconds !== null && (
        <span className="shrink-0 font-note text-lg text-crayon-orange">
          reconnecting… {awaySeconds}s
        </span>
      )}
    </div>
  );
}

/** Moves in a notebook list: "1. e4 e5", newest at the bottom. */
export function MoveList({ chess }: { chess: Chess }) {
  const history = useMemo(() => chess.history(), [chess]);
  const rows = useMemo(() => {
    const out: { n: number; w: string; b?: string }[] = [];
    for (let i = 0; i < history.length; i += 2)
      out.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] });
    return out;
  }, [history]);
  const endRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [rows.length]);
  return (
    <section aria-label="Moves" className="flex min-h-0 flex-col gap-1">
      <h2 className="font-hand text-2xl">Moves</h2>
      {rows.length === 0 ? (
        <p className="font-note text-xl text-sketch">No moves yet.</p>
      ) : (
        <ol className="max-h-64 overflow-y-auto pr-1 font-body text-lg lg:max-h-96">
          {rows.map((r, i) => (
            <li
              key={r.n}
              ref={i === rows.length - 1 ? endRef : undefined}
              className="grid grid-cols-[2.5rem_1fr_1fr] border-b border-[var(--rule-line)] leading-8"
            >
              <span className="text-sketch">{r.n}.</span>
              <span>{r.w}</span>
              <span>{r.b ?? ""}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
