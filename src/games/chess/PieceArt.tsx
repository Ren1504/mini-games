"use client";

import { RoughPaths } from "@/components/sketch/Rough";
import { sketch } from "@/lib/rough";
import type { Color, PieceSymbol } from "@/shared/chess/rules";

/**
 * "Pencil classic" chess pieces: traditional shapes drawn in wobbly
 * pencil on a 48×48 grid. White pieces are paper, black are solid
 * graphite. Colors are fixed (not theme tokens) so the pieces stay black
 * and white on the green board in both light and dark mode.
 */
export const PIECE_INK = "#2b2b2b";
export const PIECE_PAPER = "#fffdf7";

type Shape = {
  body: string;
  /** Round parts drawn after the body (pawn head, bishop/queen balls). */
  balls?: readonly (readonly [number, number, number])[];
  /** Thin detail lines in the opposite color (collars, bishop slit). */
  lines?: string;
  /** Solid dots in the opposite color (knight's eye). */
  dots?: readonly (readonly [number, number, number])[];
  /** Thick king cross, always pencil. */
  cross?: string;
};

const SHAPES: Record<PieceSymbol, Shape> = {
  p: {
    body: "M13 44 L35 44 L34 39 L30 37 C30 32 28 27 27.5 22 L20.5 22 C20 27 18 32 18 37 L14 39 Z",
    balls: [[24, 15, 6.5]],
    lines: "M18.5 22 L29.5 22",
  },
  r: {
    body: "M12 44 L36 44 L35 39 L31 37 L30 20 L33 18 L33 8 L28.5 8 L28.5 12 L26 12 L26 8 L22 8 L22 12 L19.5 12 L19.5 8 L15 8 L15 18 L18 20 L17 37 L13 39 Z",
    lines: "M18 20 L30 20 M17.5 34 L30.5 34",
  },
  n: {
    body: "M12 44 L36 44 L35 39 L31 37 C33 28 34 19 30 12 C27 7 21 6 17 9 L15 6 L13.5 11 C10.5 14 7.5 20 7.5 24 C7.5 27.5 10 28.5 12.5 27 L18 24.5 C19 27 18 31 15.5 34 L13 39 Z",
    dots: [[18.5, 15, 1.7]],
    lines: "M21 9 C25 12 28 18 29 27",
  },
  b: {
    body: "M13 44 L35 44 L34 39 L29.5 37 C33.5 31 33.5 21 24 12 C14.5 21 14.5 31 18.5 37 L14 39 Z",
    balls: [[24, 8.5, 3.2]],
    lines: "M27.5 19 L22 25.5 M18.5 37 L29.5 37",
  },
  q: {
    body: "M11 44 L37 44 L36 39 L31.5 36 L36 15 L29 25 L27 11 L24 23.5 L21 11 L19 25 L12 15 L16.5 36 L12 39 Z",
    balls: [
      [12, 13, 2.6],
      [21, 9, 2.6],
      [27, 9, 2.6],
      [36, 13, 2.6],
    ],
    lines: "M16.5 36 L31.5 36",
  },
  k: {
    body: "M12 44 L36 44 L35 39 L30.5 36 C35 30 37 22 31 18.5 C28.5 17.5 26 18.5 24 21 C22 18.5 19.5 17.5 17 18.5 C11 22 13 30 17.5 36 L13 39 Z",
    cross: "M24 4 L24 17 M19 9 L29 9",
    lines: "M17.5 36 L30.5 36 M24 21 L24 33",
  },
};

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

const circ = (x: number, y: number, r: number) =>
  `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

/** Same piece = same wobble everywhere (seeded by type and color). */
const SEED: Record<PieceSymbol, number> = {
  p: 100,
  n: 300,
  b: 250,
  r: 200,
  q: 150,
  k: 100,
};

export function PieceArt({
  type,
  color,
  className,
}: {
  type: PieceSymbol;
  color: Color;
  className?: string;
}) {
  const s = SHAPES[type];
  const white = color === "w";
  const detail = white ? PIECE_INK : PIECE_PAPER;
  let seed = SEED[type] + (white ? 0 : 400);
  const draw = (d: string, o: Parameters<typeof sketch.path>[1]) =>
    sketch.path(d, { seed: seed++, ...o });
  const solid = {
    stroke: PIECE_INK,
    strokeWidth: 2.2,
    roughness: 0.9,
    bowing: 0.7,
    fill: white ? PIECE_PAPER : PIECE_INK,
    fillStyle: "solid" as const,
  };
  const paths = [
    ...draw(s.body, solid),
    ...(s.balls ?? []).flatMap(([x, y, r]) => draw(circ(x, y, r), solid)),
    ...(s.cross
      ? draw(s.cross, { stroke: PIECE_INK, strokeWidth: 3.6, roughness: 0.6 })
      : []),
    ...(s.lines
      ? draw(s.lines, { stroke: detail, strokeWidth: 1.6, roughness: 0.7 })
      : []),
  ];
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      overflow="visible"
    >
      <RoughPaths paths={paths} />
      {(s.dots ?? []).map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={detail} />
      ))}
    </svg>
  );
}
