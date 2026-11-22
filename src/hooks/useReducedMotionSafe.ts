"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * Hydration-safe reduced-motion flag. The server (and the hydration pass)
 * always see `false`; the real preference applies on the next render, so
 * markup never mismatches. Motion's own transforms are additionally
 * neutralised by <MotionConfig reducedMotion="user"> in the layout.
 */
export function useReducedMotionSafe(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
