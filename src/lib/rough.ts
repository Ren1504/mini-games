import rough from "roughjs";
import type { Options, PathInfo } from "roughjs/bin/core";
import { ink } from "./palette";

export type { PathInfo };

export type SketchOptions = Pick<
  Options,
  | "seed"
  | "stroke"
  | "strokeWidth"
  | "fill"
  | "fillStyle"
  | "roughness"
  | "bowing"
  | "hachureGap"
  | "hachureAngle"
  | "fillWeight"
  | "disableMultiStroke"
>;

/** The generator is pure JS (no DOM), so it runs during SSR too. */
const generator = rough.generator();

const DEFAULTS: Options = {
  seed: 1,
  stroke: ink.graphite,
  strokeWidth: 2,
  roughness: 1.2,
  bowing: 1,
  fillWeight: 1.5,
  hachureGap: 5,
  preserveVertices: false,
};

const cache = new Map<string, PathInfo[]>();
const CACHE_LIMIT = 2000;

/**
 * Shapes are generated once per (shape, size, options, seed) and reused.
 * A component re-rendering never re-runs rough.js for the same input.
 */
function memo(key: string, make: () => PathInfo[]): PathInfo[] {
  const hit = cache.get(key);
  if (hit) return hit;
  const value = make();
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

function resolve(options: SketchOptions = {}): Options {
  const out: Options = { ...DEFAULTS };
  for (const [k, v] of Object.entries(options)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * rough.js draws curves with Math.sin/cos, whose last bits differ between
 * Node and the browser's JS engine (e.g. 27.87952533992156 vs
 * 27.879525339921564). Rounding every coordinate to 1/100px makes the
 * server and client print identical SVG, so hydration matches.
 */
const roundCoords = (d: string) =>
  d.replace(/-?\d+\.\d+(?:e-?\d+)?/g, (n) =>
    String(Math.round(Number(n) * 100) / 100),
  );

const visible = (paths: PathInfo[]) =>
  paths
    .filter((p) => !(p.stroke === "none" && (!p.fill || p.fill === "none")))
    .map((p) => ({ ...p, d: roundCoords(p.d) }));

const keyOf = (kind: string, args: unknown[], o?: SketchOptions) =>
  `${kind}|${args.join(",")}|${o ? JSON.stringify(o) : ""}`;

type Point = [number, number];

export const sketch = {
  rect: (x: number, y: number, w: number, h: number, o?: SketchOptions) =>
    memo(keyOf("rect", [x, y, w, h], o), () =>
      visible(generator.toPaths(generator.rectangle(x, y, w, h, resolve(o)))),
    ),
  ellipse: (cx: number, cy: number, w: number, h: number, o?: SketchOptions) =>
    memo(keyOf("ellipse", [cx, cy, w, h], o), () =>
      visible(generator.toPaths(generator.ellipse(cx, cy, w, h, resolve(o)))),
    ),
  circle: (cx: number, cy: number, d: number, o?: SketchOptions) =>
    memo(keyOf("circle", [cx, cy, d], o), () =>
      visible(generator.toPaths(generator.circle(cx, cy, d, resolve(o)))),
    ),
  line: (x1: number, y1: number, x2: number, y2: number, o?: SketchOptions) =>
    memo(keyOf("line", [x1, y1, x2, y2], o), () =>
      visible(generator.toPaths(generator.line(x1, y1, x2, y2, resolve(o)))),
    ),
  path: (d: string, o?: SketchOptions) =>
    memo(keyOf("path", [d], o), () =>
      visible(generator.toPaths(generator.path(d, resolve(o)))),
    ),
  polygon: (points: Point[], o?: SketchOptions) =>
    memo(keyOf("polygon", points.flat(), o), () =>
      visible(generator.toPaths(generator.polygon(points, resolve(o)))),
    ),
  linear: (points: Point[], o?: SketchOptions) =>
    memo(keyOf("linear", points.flat(), o), () =>
      visible(generator.toPaths(generator.linearPath(points, resolve(o)))),
    ),
};

/** Seed offset between line-boil frames of the same shape. */
export const BOIL_SEED_STEP = 7919;
