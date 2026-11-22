"use client";

import { useEffect, useState } from "react";
import { boil } from "@/lib/motion";
import { useReducedMotionSafe } from "./useReducedMotionSafe";

/**
 * Global kill switch for the "line boil" effect. Set
 * NEXT_PUBLIC_LINE_BOIL=off to freeze every outline on frame 0.
 */
export const LINE_BOIL_ENABLED = process.env.NEXT_PUBLIC_LINE_BOIL !== "off";

/**
 * Cycles 0 → 1 → 2 at ~8fps while `active`. Paused when the tab is hidden
 * and when the user prefers reduced motion. Returns 0 when idle, so
 * callers always render their first pre-generated variant at rest.
 */
export function useBoil(active: boolean, frames: number = boil.frames): number {
  const reduced = useReducedMotionSafe();
  const running = active && !reduced && LINE_BOIL_ENABLED;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!running) return;
    let id: number | undefined;
    const start = () => {
      if (id === undefined) {
        id = window.setInterval(
          () => setFrame((f) => (f + 1) % frames),
          boil.intervalMs,
        );
      }
    };
    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running, frames]);

  return running ? frame : 0;
}
