"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useSound } from "@/components/fx/Sound";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { duration, spring } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import type { SketchOptions } from "@/lib/rough";
import {
  SIZE,
  isGameState,
  move,
  newGame,
  type Direction,
  type GameState,
  type Tile,
} from "./logic";

const SAVE_KEY = "doodle-arcade:2048:game";
const BEST_KEY = "doodle-arcade:2048:best";

/** Board geometry in % of the board: 3% padding and gaps, 4 cells. */
const PAD = 3;
const CELL = (100 - PAD * (SIZE + 1)) / SIZE; // 21.25
/** One cell step, as a % of the tile's own width (for translate). */
const STEP = ((CELL + PAD) / CELL) * 100;

const KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

/** Crayon gets denser and changes color as numbers grow. */
const TILE_LOOK: Record<
  number,
  {
    color: string;
    gap: number;
    weight: number;
    style: SketchOptions["fillStyle"];
  }
> = {
  2: { color: crayon.yellow, gap: 9, weight: 1.4, style: "hachure" },
  4: { color: crayon.yellow, gap: 5, weight: 1.8, style: "hachure" },
  8: { color: crayon.orange, gap: 7, weight: 1.8, style: "hachure" },
  16: { color: crayon.orange, gap: 4.5, weight: 2, style: "hachure" },
  32: { color: crayon.red, gap: 6, weight: 2, style: "hachure" },
  64: { color: crayon.red, gap: 4, weight: 2.2, style: "hachure" },
  128: { color: crayon.green, gap: 5, weight: 2, style: "hachure" },
  256: { color: crayon.green, gap: 3.5, weight: 2.2, style: "hachure" },
  512: { color: crayon.blue, gap: 4, weight: 2.2, style: "hachure" },
  1024: { color: crayon.purple, gap: 3.5, weight: 2.4, style: "hachure" },
  2048: { color: crayon.red, gap: 3, weight: 2.4, style: "zigzag" },
};

const FONT_BY_DIGITS = [
  "",
  "text-[10cqw]",
  "text-[9cqw]",
  "text-[7.5cqw]",
  "text-[6cqw]",
];

function readJSON(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the game still works, it just won't resume.
  }
}

function TileView({ tile, under = false }: { tile: Tile; under?: boolean }) {
  const look = TILE_LOOK[tile.value] ?? TILE_LOOK[2048];
  const digits = String(tile.value).length;
  return (
    <motion.div
      className={`absolute ${under ? "z-0" : "z-10"}`}
      style={{
        left: `${PAD}%`,
        top: `${PAD}%`,
        width: `${CELL}%`,
        height: `${CELL}%`,
      }}
      initial={false}
      animate={{ x: `${tile.col * STEP}%`, y: `${tile.row * STEP}%` }}
      transition={{ duration: duration.tileSlide, ease: "easeOut" }}
    >
      {/* Keyed by value: a merge remounts this layer, so the pop replays. */}
      <motion.div
        key={tile.value}
        className="size-full"
        initial={
          tile.isNew
            ? { scale: 0, opacity: 0 }
            : tile.merged
              ? { scale: 1.2 }
              : false
        }
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...spring, delay: tile.isNew ? duration.tileSlide : 0 }}
      >
        <SketchBox
          seed={`tile-${tile.value}`}
          fill={look.color}
          fillStyle={look.style}
          hachureGap={look.gap}
          fillWeight={look.weight}
          strokeWidth={2.2}
          inset={2}
          className={`text-paper-halo grid size-full place-items-center font-hand leading-none text-graphite ${FONT_BY_DIGITS[digits] ?? "text-[5cqw]"}`}
        >
          {tile.value}
        </SketchBox>
      </motion.div>
    </motion.div>
  );
}

/**
 * 2048 drawn in crayon. Arrow keys / WASD or swipe to move. The game and
 * the best score are saved in this browser, so a reload resumes play.
 */
export function Game2048() {
  const [game, setGame] = useState<GameState | null>(null);
  const [best, setBest] = useState(0);
  const [absorbed, setAbsorbed] = useState<Tile[]>([]);
  const [gain, setGain] = useState<{ key: number; value: number } | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const bestRef = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const clearTimer = useRef<number | undefined>(undefined);
  const { scratch } = useSound();

  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
    writeJSON(SAVE_KEY, next);
    if (next.score > bestRef.current) {
      bestRef.current = next.score;
      setBest(next.score);
      writeJSON(BEST_KEY, next.score);
    }
  }, []);

  // Restore after mount: saved games live in localStorage, which the
  // server render can't see, so the board is empty until this runs.
  useEffect(() => {
    const saved = readJSON(SAVE_KEY);
    const storedBest = Number(readJSON(BEST_KEY)) || 0;
    bestRef.current = storedBest;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(storedBest);
    const restored = isGameState(saved)
      ? {
          ...saved,
          // Drop last turn's spawn/merge flags so nothing pops on reload.
          tiles: saved.tiles.map(({ id, value, row, col }) => ({
            id,
            value,
            row,
            col,
          })),
        }
      : newGame();
    commit(restored);
  }, [commit]);

  const play = useCallback(
    (direction: Direction) => {
      const current = gameRef.current;
      if (!current) return;
      const result = move(current, direction);
      if (!result.moved) return;
      commit(result.state);
      setAbsorbed(result.absorbed);
      window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(
        () => setAbsorbed([]),
        duration.tileSlide * 1000 + 40,
      );
      if (result.gained > 0) {
        setGain({ key: result.state.nextId, value: result.gained });
        scratch();
      }
    },
    [commit, scratch],
  );

  const restart = useCallback(() => {
    setAbsorbed([]);
    setGain(null);
    commit(newGame());
  }, [commit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const direction = KEYS[e.key];
      if (!direction || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      play(direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play]);

  useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    play(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
  };

  const status = game?.won ? "won" : game?.over ? "over" : "playing";

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-[30rem] flex-wrap items-end justify-between gap-4">
        <HandLettered
          as="h1"
          text="2048"
          seed="game-2048"
          className="font-hand text-6xl leading-none"
        />
        <div className="flex gap-3">
          {[
            { label: "score", value: game?.score ?? 0 },
            { label: "best", value: best },
          ].map((s) => (
            <SketchBox
              key={s.label}
              seed={`score-${s.label}`}
              fill={ink.key}
              fillStyle="solid"
              strokeWidth={1.8}
              className="relative flex min-w-20 flex-col items-center px-3 py-1"
            >
              <span className="font-note text-lg leading-tight text-sketch">
                {s.label}
              </span>
              <span
                className="font-hand text-2xl leading-tight"
                aria-live={s.label === "score" ? "off" : undefined}
              >
                {s.value}
              </span>
              {s.label === "score" && (
                <AnimatePresence>
                  {gain && (
                    <motion.span
                      key={gain.key}
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-2 right-2 font-hand text-xl text-graphite"
                      initial={{ opacity: 1, y: 0 }}
                      animate={{ opacity: 0, y: -26 }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      onAnimationComplete={() =>
                        setGain((g) => (g?.key === gain.key ? null : g))
                      }
                    >
                      +{gain.value}
                    </motion.span>
                  )}
                </AnimatePresence>
              )}
            </SketchBox>
          ))}
        </div>
      </div>

      <div className="flex w-full max-w-[30rem] flex-wrap items-center justify-between gap-3">
        <p className="font-note text-xl text-sketch">
          Swipe or use the arrow keys. Join matching numbers!
        </p>
        <SketchButton seed="2048-new" color="blue" onClick={restart}>
          New game
        </SketchButton>
      </div>

      <div
        role="group"
        aria-label="2048 board. Use the arrow keys or swipe to move the tiles."
        aria-describedby="game-2048-status"
        className="@container relative aspect-square w-full max-w-[30rem] touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {/* SketchBox is always position:relative, so the absolute layer
            is a plain wrapper and the box just fills it. */}
        <div className="absolute inset-0">
          <SketchBox
            seed="board-2048"
            fill={ink.key}
            fillStyle="solid"
            strokeWidth={2.6}
            className="grid size-full grid-cols-4 grid-rows-4 gap-[3%] p-[3%]"
          >
            {Array.from({ length: SIZE * SIZE }, (_, i) => (
              <SketchBox
                key={i}
                seed={`cell-${i}`}
                stroke={ink.sketch}
                strokeWidth={1.4}
                roughness={1.4}
                inset={2}
              />
            ))}
          </SketchBox>
        </div>
        {absorbed.map((t) => (
          <TileView key={`gone-${t.id}`} tile={t} under />
        ))}
        {game?.tiles.map((t) => (
          <TileView key={t.id} tile={t} />
        ))}

        <AnimatePresence>
          {status !== "playing" && (
            <motion.div
              key={status}
              className="absolute inset-0 z-20 grid place-items-center bg-paper/80 p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.paperFade * 2 }}
            >
              <div className="flex flex-col items-center gap-4">
                <HandLettered
                  as="p"
                  text={status === "won" ? "You made 2048!" : "No more moves!"}
                  seed={`end-${status}`}
                  className="font-hand text-4xl sm:text-5xl"
                />
                <p className="text-xl">Final score: {game?.score ?? 0}</p>
                <SketchButton
                  seed="2048-again"
                  color={status === "won" ? "green" : "orange"}
                  filled
                  onClick={restart}
                >
                  {status === "won" ? "Play again" : "Try again"}
                </SketchButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p id="game-2048-status" aria-live="polite" className="sr-only">
        {status === "won"
          ? `You made 2048! Final score ${game?.score ?? 0}.`
          : status === "over"
            ? `No more moves. Final score ${game?.score ?? 0}.`
            : ""}
      </p>
    </div>
  );
}
