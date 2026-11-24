"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useSound } from "@/components/fx/Sound";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import { CardArt } from "./CardArt";
import {
  SIZES,
  elapsedMs,
  flip,
  formatTime,
  hideMismatch,
  isBoardSize,
  isFaceUp,
  newGame,
  parseBests,
  recordBest,
  type BestBySize,
  type BoardSize,
  type Card,
  type GameState,
} from "./logic";
import { CARD_SYMBOLS, type CardSymbol } from "./symbols";

const SIZE_KEY = "doodle-arcade:memory-match:size";
const BEST_KEY = "doodle-arcade:memory-match:best";
/** How long a missed pair stays face up (tapping another card skips it). */
const MISS_MS = 900;
const FLIP_S = 0.3;

const POOL = CARD_SYMBOLS.map((s) => s.id);
const BY_ID = new Map(CARD_SYMBOLS.map((s) => [s.id, s]));

/** Tighter gaps on bigger boards, so phone cards stay as big as possible. */
const GAP: Record<BoardSize, string> = {
  4: "gap-2 sm:gap-3",
  5: "gap-2 sm:gap-3",
  6: "gap-1.5 sm:gap-2.5",
  7: "gap-1 sm:gap-2",
  8: "gap-1 sm:gap-1.5",
};

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
    // Storage blocked: the game still works, it just won't remember.
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type Result = { newMoves: boolean; newTime: boolean };

function CardButton({
  card,
  symbol,
  index,
  size,
  faceUp,
  missed,
  focusable,
  locked,
  onFlip,
  onFocus,
  buttonRef,
}: {
  card: Card;
  symbol: CardSymbol;
  index: number;
  size: BoardSize;
  faceUp: boolean;
  missed: boolean;
  focusable: boolean;
  /** Setup preview: can't be flipped yet. */
  locked: boolean;
  onFlip: (index: number) => void;
  onFocus: (index: number) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  // Keep drawing the symbol while a card turns back over, then drop it,
  // so a face-down card's picture isn't sitting in the page.
  const [linger, setLinger] = useState(false);
  const [wasUp, setWasUp] = useState(faceUp);
  if (wasUp !== faceUp) {
    setWasUp(faceUp);
    if (!faceUp) setLinger(true);
  }

  const row = Math.floor(index / size) + 1;
  const col = (index % size) + 1;
  const where = `row ${row}, column ${col}`;
  const label = card.matched
    ? `${symbol.name}, matched, ${where}`
    : faceUp
      ? `${symbol.name}, ${where}`
      : `Face-down card, ${where}`;
  const small = size >= 7;

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-disabled={card.matched || locked || undefined}
      tabIndex={focusable ? 0 : -1}
      onClick={() => onFlip(index)}
      onFocus={() => onFocus(index)}
      className={cn(
        "relative aspect-square touch-manipulation rounded-md select-none",
        card.matched || locked ? "cursor-default" : "cursor-pointer",
      )}
      style={{ perspective: 600 }}
      whileHover={faceUp || locked ? undefined : { y: -2, rotate: -1.5 }}
      whileTap={faceUp || locked ? undefined : { scale: 0.94 }}
      animate={
        missed
          ? { x: [0, -4, 4, -3, 3, 0] }
          : card.matched
            ? { scale: [1, 1.12, 1] }
            : { x: 0, scale: 1 }
      }
      transition={{ duration: 0.35, delay: FLIP_S }}
    >
      <motion.span
        className="absolute inset-0 block"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={{ duration: FLIP_S, ease: "easeOut" }}
        onAnimationComplete={() => {
          if (!faceUp) setLinger(false);
        }}
      >
        {/* Back: cross-hatched crayon, like a deck of homemade cards. */}
        <span
          className="absolute inset-0 block"
          style={{ backfaceVisibility: "hidden" }}
        >
          <SketchBox
            as="span"
            seed={`mm-back-${card.id}`}
            fill={crayon.purple}
            fillStyle="cross-hatch"
            hachureGap={small ? 6 : 8}
            fillWeight={1.2}
            strokeWidth={small ? 1.8 : 2.2}
            inset={2}
            className="block size-full"
          />
        </span>
        {/* Front: paper with the symbol. */}
        <span
          className="absolute inset-0 block"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <SketchBox
            as="span"
            seed={`mm-front-${card.id}`}
            fill={ink.card}
            fillStyle="solid"
            stroke={
              card.matched
                ? crayon.green
                : missed
                  ? crayon.red
                  : ink.graphite
            }
            strokeWidth={card.matched || missed ? (small ? 2.4 : 3) : small ? 1.8 : 2.2}
            inset={2}
            className="grid size-full place-items-center"
          >
            {(faceUp || linger) && (
              <CardArt symbol={symbol} className="size-[72%]" />
            )}
          </SketchBox>
        </span>
      </motion.span>
    </motion.button>
  );
}

/** The middle cell of odd boards: not a card, just a doodled gap. */
function FreeTile({ size }: { size: BoardSize }) {
  return (
    <div aria-hidden="true" className="relative aspect-square">
      <SketchBox
        seed={`mm-free-${size}`}
        stroke={ink.sketch}
        strokeWidth={1.4}
        roughness={1.6}
        inset={4}
        className="grid size-full place-items-center font-note text-lg leading-none text-sketch sm:text-2xl"
      >
        free
      </SketchBox>
    </div>
  );
}

function Stat({
  label,
  value,
  seed = "top",
}: {
  label: string;
  value: string;
  seed?: string;
}) {
  return (
    <SketchBox
      seed={`mm-stat-${seed}-${label}`}
      fill={ink.key}
      fillStyle="solid"
      strokeWidth={1.8}
      className="flex min-w-[4.75rem] flex-col items-center px-3 py-1"
    >
      <span className="font-note text-lg leading-tight text-sketch">
        {label}
      </span>
      <span className="font-hand text-2xl leading-tight tabular-nums">
        {value}
      </span>
    </SketchBox>
  );
}

/**
 * Memory Match: flip two cards at a time and find every pair. Pick a
 * board from 4×4 to 8×8; 5×5 and 7×7 have a free tile in the middle.
 * The chosen size and the best result for each size are saved in this
 * browser.
 */
export function MemoryMatch() {
  // Face-down cards render the same whatever was dealt, so dealing here
  // (on the server and again on the client) can't cause a hydration
  // mismatch; nothing shows a symbol until a card is flipped.
  const [game, setGame] = useState<GameState>(() => newGame(4, POOL));
  const [bests, setBests] = useState<BestBySize>({});
  const [result, setResult] = useState<Result | null>(null);
  const [now, setNow] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [announce, setAnnounce] = useState("");
  /** Bumped on every deal, so a new board gets brand-new card elements. */
  const [round, setRound] = useState(0);
  /**
   * Setup (false): pick a board, cards are a locked face-down preview.
   * Playing (true): board size is locked, cards can be flipped.
   */
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const gameRef = useRef(game);
  const bestsRef = useRef(bests);
  const missTimer = useRef<number | undefined>(undefined);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const { tick, rustle } = useSound();

  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  /** Back to setup with a fresh face-down board of `size`. */
  const deal = useCallback(
    (size: BoardSize, say?: string) => {
      window.clearTimeout(missTimer.current);
      playingRef.current = false;
      setPlaying(false);
      setResult(null);
      setAnnounce(say ?? "");
      setFocusIndex(0);
      setRound((r) => r + 1);
      commit(newGame(size, POOL));
      writeJSON(SIZE_KEY, size);
    },
    [commit],
  );

  // After mount: restore the last board size and the saved bests, which
  // live in localStorage where the server render can't see them.
  useEffect(() => {
    const stored = parseBests(readJSON(BEST_KEY));
    bestsRef.current = stored;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBests(stored);
    const size = readJSON(SIZE_KEY);
    if (isBoardSize(size) && size !== gameRef.current.size) {
      commit(newGame(size, POOL));
    }
  }, [commit]);

  // Tick the clock while a game is running.
  const running = game.startedAt !== null && game.finishedAt === null;
  useEffect(() => {
    if (!running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => () => window.clearTimeout(missTimer.current), []);

  // Move focus to the "you won" panel so keyboard users land on Play again.
  useEffect(() => {
    if (result) endRef.current?.focus();
  }, [result]);

  const start = () => {
    playingRef.current = true;
    setPlaying(true);
    const { size, pairsTotal } = gameRef.current;
    setAnnounce(
      `Game started on ${size} by ${size}. Find ${plural(pairsTotal, "pair")}.`,
    );
    // Keyboard players go straight to the first card.
    buttons.current[0]?.focus();
  };

  const onFlip = useCallback(
    (index: number) => {
      if (!playingRef.current) return;
      const current = gameRef.current;
      const t = Date.now();
      const { state, outcome } = flip(current, index, t);
      if (outcome === "ignored") return;
      window.clearTimeout(missTimer.current);
      commit(state);
      setNow(t);
      setFocusIndex(index);
      const name = (i: number) => BY_ID.get(state.cards[i].symbol!)!.name;

      if (outcome === "first") {
        tick();
        setAnnounce(name(index));
      } else if (outcome === "miss") {
        tick();
        const [a, b] = state.open;
        setAnnounce(`${name(b)}. No match with ${name(a)}.`);
        missTimer.current = window.setTimeout(() => {
          commit(hideMismatch(gameRef.current));
        }, MISS_MS);
      } else {
        rustle();
        if (state.finishedAt !== null) {
          const ms = elapsedMs(state, t);
          const r = recordBest(bestsRef.current, state.size, {
            moves: state.moves,
            ms,
          });
          bestsRef.current = r.bests;
          setBests(r.bests);
          writeJSON(BEST_KEY, r.bests);
          setResult({ newMoves: r.newMoves, newTime: r.newTime });
          setAnnounce(
            `${name(index)}. Match! All pairs found in ${plural(state.moves, "move")} and ${formatTime(ms)}.`,
          );
        } else {
          setAnnounce(
            `${name(index)}. Match! ${state.pairsFound} of ${state.pairsTotal} pairs found.`,
          );
        }
      }
    },
    [commit, rustle, tick],
  );

  // Arrow keys move between cards (one tab stop for the whole board).
  const onBoardKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const { size, cards } = gameRef.current;
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: size,
      ArrowUp: -size,
    };
    let next: number;
    if (e.key in step) {
      next = focusIndex + step[e.key];
      if (next >= 0 && next < cards.length && cards[next].symbol === null) {
        next += step[e.key]; // hop over the free tile
      }
      if (
        next < 0 ||
        next >= cards.length ||
        // Left/right stay on the same row.
        (Math.abs(step[e.key]) === 1 &&
          Math.floor(next / size) !== Math.floor(focusIndex / size))
      ) {
        e.preventDefault();
        return;
      }
    } else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = cards.length - 1;
    else return;
    e.preventDefault();
    setFocusIndex(next);
    buttons.current[next]?.focus();
  };

  const { size, cards } = game;
  const best = bests[size];
  const elapsed = elapsedMs(game, now);
  const missed = game.open.length === 2 ? game.open : [];
  const finished = game.finishedAt !== null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-[36rem] flex-wrap items-end justify-between gap-4">
        <HandLettered
          as="h1"
          text="Memory Match"
          seed="game-memory-match"
          className="font-hand text-5xl leading-none sm:text-6xl"
        />
        <div className="flex gap-2 sm:gap-3">
          <Stat label="moves" value={String(game.moves)} />
          <Stat label="time" value={formatTime(elapsed)} />
          <Stat label="pairs" value={`${game.pairsFound}/${game.pairsTotal}`} />
        </div>
      </div>

      <div className="flex w-full max-w-[36rem] flex-col gap-3">
        <div
          role="group"
          aria-label="Board size"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        >
          <span
            aria-hidden="true"
            className="mr-1 hidden font-note text-2xl text-sketch sm:inline"
          >
            board:
          </span>
          {SIZES.map((s) => (
            <SketchButton
              key={s}
              seed={`mm-size-${s}`}
              color="purple"
              filled={s === size}
              aria-pressed={s === size}
              aria-label={`${s} by ${s}`}
              // Locked mid-game; the current size stays bright so you can
              // still see which board you're on.
              disabled={playing && s !== size}
              onClick={() => {
                if (!playingRef.current && s !== size) deal(s);
              }}
              className="[&>span]:min-h-10 [&>span]:px-2.5 [&>span]:text-lg sm:[&>span]:px-3"
            >
              {s}×{s}
            </SketchButton>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-note text-xl text-sketch">
            {best
              ? `Best on ${size}×${size}: ${plural(best.moves, "move")} · ${formatTime(best.ms)}`
              : `No best yet on ${size}×${size}.`}
            {!playing && " Pick a board, then press Start."}
          </p>
          {playing ? (
            <SketchButton
              seed="mm-new"
              color="blue"
              onClick={() =>
                deal(size, "Game ended. Pick a board, then press Start.")
              }
            >
              New game
            </SketchButton>
          ) : (
            <SketchButton seed="mm-start" color="green" filled onClick={start}>
              Start
            </SketchButton>
          )}
        </div>
      </div>

      <div className="relative w-full max-w-[36rem]">
        <div
          role="group"
          aria-label={
            playing
              ? `Memory board, ${size} by ${size}. Use the arrow keys to move between cards and Enter to flip.`
              : `Memory board preview, ${size} by ${size}. Press Start to play.`
          }
          onKeyDown={onBoardKey}
          className={cn("grid", GAP[size])}
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {cards.map((card, i) =>
            card.symbol === null ? (
              <FreeTile key={`free-${card.id}`} size={size} />
            ) : (
              <CardButton
                // A new deal gets fresh cards (no flip-back animation).
                key={`${round}-${size}-${card.id}`}
                card={card}
                symbol={BY_ID.get(card.symbol)!}
                index={i}
                size={size}
                faceUp={isFaceUp(game, i)}
                missed={missed.includes(i)}
                focusable={playing && i === focusIndex}
                locked={!playing}
                onFlip={onFlip}
                onFocus={setFocusIndex}
                buttonRef={(el) => {
                  buttons.current[i] = el;
                }}
              />
            ),
          )}
        </div>

        <AnimatePresence>
          {finished && result && (
            <motion.div
              key="done"
              className="absolute inset-0 z-20 grid place-items-center bg-paper/85 p-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.paperFade * 2, delay: 0.4 }}
            >
              <div
                ref={endRef}
                tabIndex={-1}
                aria-labelledby="mm-done-title"
                role="group"
                className="flex flex-col items-center gap-4 outline-none"
              >
                <HandLettered
                  as="p"
                  id="mm-done-title"
                  text="All pairs found!"
                  seed="mm-done"
                  className="font-hand text-4xl sm:text-5xl"
                />
                <div className="flex gap-2 sm:gap-3">
                  <Stat label="moves" value={String(game.moves)} seed="end" />
                  <Stat label="time" value={formatTime(elapsed)} seed="end" />
                  <Stat label="board" value={`${size}×${size}`} seed="end" />
                </div>
                <p className="font-note text-2xl">
                  {result.newMoves && result.newTime
                    ? "New best: fewest moves and fastest time!"
                    : result.newMoves
                      ? "New best: fewest moves!"
                      : result.newTime
                        ? "New best: fastest time!"
                        : best
                          ? `Your best: ${plural(best.moves, "move")} · ${formatTime(best.ms)}`
                          : ""}
                </p>
                <SketchButton
                  seed="mm-again"
                  color="green"
                  filled
                  onClick={() =>
                    deal(size, "Pick a board, then press Start.")
                  }
                >
                  Play again
                </SketchButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
