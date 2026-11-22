"use client";

import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, strokeEase } from "@/lib/motion";
import { crayon } from "@/lib/palette";
import { rng } from "@/lib/seed";

/** Zig-zag scribble across a width, built from a seed so it's stable. */
function scribblePath(
  seed: string,
  width: number,
  height: number,
  loops: number,
): string {
  const r = rng(seed);
  const step = width / loops;
  let d = `M 2 ${height * 0.6}`;
  for (let i = 0; i < loops; i++) {
    const x = step * (i + 1);
    const up = height * (0.1 + r() * 0.25);
    const down = height * (0.65 + r() * 0.3);
    d += ` Q ${(x - step * 0.6).toFixed(1)} ${up.toFixed(1)} ${(x - step * 0.2).toFixed(1)} ${(height * 0.45).toFixed(1)}`;
    d += ` T ${x.toFixed(1)} ${down.toFixed(1)}`;
  }
  return d;
}

/** Crayon scribble underline that draws itself (logo, headings). */
export function Scribble({
  seed,
  width = 240,
  height = 18,
  loops = 7,
  color = crayon.red,
  delay = 0,
  drawDuration = duration.logoUnderline,
  className,
}: {
  seed: string;
  width?: number;
  height?: number;
  loops?: number;
  color?: string;
  delay?: number;
  drawDuration?: number;
  className?: string;
}) {
  const reduced = useReducedMotionSafe();
  const d = scribblePath(seed, width, height, loops);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? { opacity: 0 } : { pathLength: 0 }}
        animate={reduced ? { opacity: 0.9 } : { pathLength: 1 }}
        transition={
          reduced
            ? { duration: duration.reduced, delay }
            : { duration: drawDuration, ease: strokeEase, delay }
        }
        style={{ opacity: 0.9 }}
      />
    </svg>
  );
}
