"use client";

import { BOIL_SEED_STEP, sketch, type SketchOptions } from "@/lib/rough";
import { RoughPaths } from "./Rough";

type Props = SketchOptions & {
  d: string;
  /** Boil frame from useBoil(); shared by every path of one drawing. */
  frame: number;
  seed: number;
};

/**
 * One SVG path drawn by rough.js, re-drawn with a different seed per boil
 * frame. Each frame is generated once and cached, so cycling is just a
 * cheap swap of the `d` attribute.
 */
export function BoilingPath({ d, frame, seed, ...options }: Props) {
  return (
    <RoughPaths
      paths={sketch.path(d, {
        ...options,
        seed: seed + frame * BOIL_SEED_STEP,
      })}
    />
  );
}
