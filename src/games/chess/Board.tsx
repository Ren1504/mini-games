"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { SketchBox } from "@/components/sketch/SketchBox";
import { RoughPaths } from "@/components/sketch/Rough";
import { cn } from "@/lib/cn";
import { sketch } from "@/lib/rough";
import {
  replay,
  type Color,
  type PieceSymbol,
  type Square,
} from "@/shared/chess/rules";
import { PIECE_NAME, PieceArt } from "./PieceArt";

/** Soft crayon green: pale cream-green and muted crayon green. */
const LIGHT = "#e3eccb";
const DARK = "#7aa56a";
const DARK_HATCH = "#5f8a52";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const COLOR_NAME: Record<Color, string> = { w: "white", b: "black" };
const PROMOTIONS: PieceSymbol[] = ["q", "r", "b", "n"];

/** Squares in screen order (top-left first) for the given side at the bottom. */
function squaresFor(bottom: Color): Square[] {
  const out: Square[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = bottom === "w" ? col : 7 - col;
      const rank = bottom === "w" ? 8 - row : row + 1;
      out.push(`${FILES[file]}${rank}` as Square);
    }
  }
  return out;
}

/** a1 is dark: file index + rank is odd on dark squares. */
const isDark = (sq: Square) =>
  (FILES.indexOf(sq[0] as (typeof FILES)[number]) + Number(sq[1])) % 2 === 1;

/**
 * The squares themselves: light paper-green, dark squares filled green with
 * crayon hatching on top. One SVG behind the whole board (the square
 * buttons above it are transparent).
 */
function BoardTexture() {
  const paths = useMemo(() => {
    const out = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if ((r + c) % 2 === 1)
          out.push(
            ...sketch.rect(c * 100 + 4, r * 100 + 4, 92, 92, {
              seed: 900 + r * 8 + c,
              stroke: "none",
              fill: DARK_HATCH,
              fillStyle: "hachure",
              hachureGap: 14,
              hachureAngle: -41,
              fillWeight: 2.2,
              roughness: 1.4,
            }),
          );
    return out;
  }, []);
  return (
    <svg
      viewBox="0 0 800 800"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden="true"
    >
      <rect width="800" height="800" fill={LIGHT} />
      {Array.from({ length: 64 }, (_, i) =>
        (Math.floor(i / 8) + (i % 8)) % 2 === 1 ? (
          <rect
            key={i}
            x={(i % 8) * 100}
            y={Math.floor(i / 8) * 100}
            width="100"
            height="100"
            fill={DARK}
          />
        ) : null,
      )}
      <g opacity={0.55}>
        <RoughPaths paths={paths} />
      </g>
    </svg>
  );
}

type Props = {
  /** Every move so far (UCI), including one waiting for the server. */
  moves: readonly string[];
  /** Which side is drawn at the bottom. */
  bottom: Color;
  /** Your color, or null if you're not playing. */
  myColor: Color | null;
  /** True when you may move now. */
  canMove: boolean;
  onMove: (uci: string) => void;
  /** Touched your own piece while it's not your turn. */
  onNotYourTurn?: () => void;
};

/**
 * The chessboard. Tap a piece to see where it can go (dots, red squares
 * for captures), then tap a square, or drag the piece there. Arrow keys
 * move between squares; Enter picks up and puts down.
 */
export function Board({
  moves,
  bottom,
  myColor,
  canMove,
  onMove,
  onNotYourTurn,
}: Props) {
  const chess = useMemo(() => replay(moves), [moves]);
  const squares = useMemo(() => squaresFor(bottom), [bottom]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [focus, setFocus] = useState<Square>(bottom === "w" ? "e2" : "e7");
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [drag, setDrag] = useState<{
    from: Square;
    x: number;
    y: number;
  } | null>(null);
  /** The last move I made by dragging: it shouldn't slide in again. */
  const [dropped, setDropped] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<Square, HTMLButtonElement>());
  const press = useRef<{
    from: Square;
    x: number;
    y: number;
    id: number;
    moved: boolean;
    /** It was already selected before this press (a tap then unselects). */
    wasSelected: boolean;
  } | null>(null);

  // A new position clears the selection (the piece may be gone).
  const [seenMoves, setSeenMoves] = useState(moves);
  if (seenMoves !== moves) {
    setSeenMoves(moves);
    setSelected(null);
    setPromo(null);
  }

  const targets = useMemo(() => {
    const map = new Map<Square, { capture: boolean }>();
    if (!selected || !canMove) return map;
    for (const m of chess.moves({ square: selected, verbose: true })) {
      const prev = map.get(m.to);
      map.set(m.to, { capture: Boolean(m.captured) || Boolean(prev?.capture) });
    }
    return map;
  }, [chess, selected, canMove]);

  const last = moves.at(-1);
  const lastFrom = last?.slice(0, 2) as Square | undefined;
  const lastTo = last?.slice(2, 4) as Square | undefined;
  const checkSquare = useMemo(() => {
    if (!chess.inCheck()) return null;
    const turn = chess.turn();
    for (const row of chess.board())
      for (const p of row)
        if (p && p.type === "k" && p.color === turn) return p.square;
    return null;
  }, [chess]);

  const mine = (sq: Square) => {
    const p = chess.get(sq);
    return Boolean(p && myColor && p.color === myColor);
  };

  const commit = (from: Square, to: Square) => {
    const piece = chess.get(from);
    const lastRank = to[1] === "8" || to[1] === "1";
    if (piece?.type === "p" && lastRank) {
      setPromo({ from, to });
      return;
    }
    setSelected(null);
    onMove(`${from}${to}`);
  };

  /** One "tap" on a square (pointer or keyboard). */
  const activate = (sq: Square) => {
    if (promo) return;
    if (selected && targets.has(sq)) {
      commit(selected, sq);
      return;
    }
    if (mine(sq)) {
      if (!canMove) {
        onNotYourTurn?.();
        return;
      }
      setSelected(selected === sq ? null : sq);
      return;
    }
    setSelected(null);
  };

  // ── Pointer: tap or drag ──────────────────────────────────────────
  const squareAt = (clientX: number, clientY: number): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return squares[row * 8 + col];
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || promo) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    setFocus(sq);
    if (canMove && mine(sq)) {
      // Pick up: selected right away so the hints show while dragging.
      press.current = {
        from: sq,
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
        moved: false,
        wasSelected: selected === sq,
      };
      if (selected !== sq) setSelected(sq);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    activate(sq);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
    p.moved = true;
    const rect = boardRef.current!.getBoundingClientRect();
    setDrag({
      from: p.from,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    setDrag(null);
    if (!p.moved) {
      // A plain tap on an already-selected piece puts it back down.
      if (p.wasSelected) setSelected(null);
      return;
    }
    const to = squareAt(e.clientX, e.clientY);
    if (to && to !== p.from) {
      const legal = chess
        .moves({ square: p.from, verbose: true })
        .some((m) => m.to === to);
      if (legal) {
        setDropped(`${p.from}${to}`);
        commit(p.from, to);
      }
    }
  };

  // ── Keyboard: arrows move focus, Enter/Space taps ─────────────────
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = squares.indexOf(focus);
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 8,
      ArrowUp: -8,
    };
    if (e.key === "Escape") {
      setSelected(null);
      setPromo(null);
      return;
    }
    if (!(e.key in step)) return;
    e.preventDefault();
    const next = i + step[e.key];
    const sameRow =
      Math.abs(step[e.key]) !== 1 || Math.floor(next / 8) === Math.floor(i / 8);
    if (next < 0 || next > 63 || !sameRow) return;
    setFocus(squares[next]);
    buttons.current.get(squares[next])?.focus();
  };

  const labelFor = (sq: Square) => {
    const p = chess.get(sq);
    const what = p ? `${COLOR_NAME[p.color]} ${PIECE_NAME[p.type]}` : "empty";
    const t = targets.get(sq);
    const hint = t ? (t.capture ? ", can capture" : ", can move here") : "";
    const sel = selected === sq ? ", selected" : "";
    const check = checkSquare === sq ? ", in check" : "";
    return `${sq}, ${what}${sel}${check}${hint}`;
  };

  const dragPiece = drag ? chess.get(drag.from) : undefined;

  return (
    <SketchBox
      seed="chess-board"
      strokeWidth={3}
      inset={-4}
      className="relative aspect-square w-full touch-none select-none"
    >
      <div
        ref={boardRef}
        role="group"
        aria-label={`Chessboard, ${COLOR_NAME[bottom]} at the bottom. Arrow keys move between squares, Enter picks up or places a piece.`}
        className="relative grid size-full grid-cols-8 grid-rows-8 overflow-hidden rounded-sm"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          press.current = null;
          setDrag(null);
        }}
        onKeyDown={onKeyDown}
      >
        <BoardTexture />
        {squares.map((sq, i) => {
          const dark = isDark(sq);
          const piece = chess.get(sq);
          const t = targets.get(sq);
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLast = sq === lastFrom || sq === lastTo;
          // The piece that just arrived slides in from where it came from.
          const slide =
            sq === lastTo && lastFrom && last !== dropped
              ? (() => {
                  const from = squares.indexOf(lastFrom);
                  return {
                    x: `${((from % 8) - col) * 100}%`,
                    y: `${(Math.floor(from / 8) - row) * 100}%`,
                  };
                })()
              : null;
          return (
            <button
              key={sq}
              ref={(el) => {
                if (el) buttons.current.set(sq, el);
                else buttons.current.delete(sq);
              }}
              type="button"
              tabIndex={sq === focus ? 0 : -1}
              aria-label={labelFor(sq)}
              aria-pressed={selected === sq}
              onFocus={() => setFocus(sq)}
              // Pointer taps are handled on the board; this is for keyboards
              // (Enter/Space fire a click with detail 0).
              onClick={(e) => e.detail === 0 && activate(sq)}
              className={cn(
                "relative outline-none focus-visible:z-20 focus-visible:ring-4 focus-visible:ring-crayon-blue focus-visible:ring-inset",
                canMove && (mine(sq) || t)
                  ? "cursor-pointer"
                  : "cursor-default",
              )}
            >
              {isLast && (
                <span
                  className="absolute inset-0"
                  style={{ background: "rgb(255 214 10 / 0.38)" }}
                />
              )}
              {selected === sq && (
                <span
                  className="absolute inset-0"
                  style={{ background: "rgb(255 214 10 / 0.6)" }}
                />
              )}
              {checkSquare === sq && (
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle, rgb(228 87 46 / 0.95) 0%, rgb(228 87 46 / 0.55) 45%, transparent 75%)",
                  }}
                />
              )}
              {t?.capture && (
                <span
                  className="absolute inset-0 ring-2 ring-[#b8361a] ring-inset"
                  style={{ background: "rgb(228 87 46 / 0.62)" }}
                />
              )}
              {/* Coordinates along the left and bottom edges. */}
              {col === 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-0.5 left-1 font-note text-xs leading-none sm:text-sm"
                  style={{ color: dark ? LIGHT : DARK }}
                >
                  {sq[1]}
                </span>
              )}
              {row === 7 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 bottom-0.5 font-note text-xs leading-none sm:text-sm"
                  style={{ color: dark ? LIGHT : DARK }}
                >
                  {sq[0]}
                </span>
              )}
              {piece && (
                <motion.span
                  key={`${sq}-${piece.color}${piece.type}-${sq === lastTo ? moves.length : 0}`}
                  className={cn(
                    "absolute inset-[6%] block",
                    drag?.from === sq && "opacity-25",
                  )}
                  initial={slide ?? false}
                  animate={{ x: "0%", y: "0%" }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ zIndex: sq === lastTo ? 2 : 1 }}
                >
                  <PieceArt
                    type={piece.type}
                    color={piece.color}
                    className="size-full"
                  />
                </motion.span>
              )}
              {t && !t.capture && (
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 size-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "rgb(43 43 43 / 0.32)" }}
                />
              )}
            </button>
          );
        })}

        {/* The piece being dragged follows the finger/mouse. */}
        {drag && dragPiece && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-30 size-[14%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: drag.x, top: drag.y }}
          >
            <PieceArt
              type={dragPiece.type}
              color={dragPiece.color}
              className="size-full drop-shadow-[0_4px_3px_rgb(0_0_0/0.35)]"
            />
          </div>
        )}

        {/* Pawn reached the last rank: pick what it becomes. */}
        <AnimatePresence>
          {promo && myColor && (
            <motion.div
              key="promo"
              className="absolute inset-0 z-40 grid place-items-center bg-black/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                role="dialog"
                aria-label="Promote your pawn to"
                className="flex gap-2 rounded-md bg-[#fffdf7] p-3 shadow-lg"
              >
                {PROMOTIONS.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    autoFocus={i === 0}
                    aria-label={PIECE_NAME[p]}
                    onClick={() => {
                      onMove(`${promo.from}${promo.to}${p}`);
                      setPromo(null);
                      setSelected(null);
                    }}
                    className="size-16 rounded-md hover:bg-[#e3eccb] focus-visible:ring-4 focus-visible:ring-crayon-blue sm:size-20"
                  >
                    <PieceArt type={p} color={myColor} className="size-full" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SketchBox>
  );
}
