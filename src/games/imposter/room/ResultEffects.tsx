"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { tornClipPath } from "@/components/paper/TornEdge";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { strokeEase } from "@/lib/motion";
import { crayon } from "@/lib/palette";
import { rng } from "@/lib/seed";

/**
 * A scrap of paper covering the imposter's doodle that tears away and
 * flutters off. Reduced motion: nothing to tear, the doodle just shows.
 */
export function TearAway({ seed }: { seed: string }) {
  const reduced = useReducedMotionSafe();
  if (reduced) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="torn-paper pointer-events-none absolute inset-x-2 -top-1 bottom-12 z-10 drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]"
      style={{
        clipPath: tornClipPath(`${seed}-cover`, 18, 8),
        transformOrigin: "10% 100%",
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{ y: -60, x: 40, rotate: -24, opacity: 0 }}
      transition={{ delay: 0.25, duration: 0.7, ease: strokeEase }}
    >
      <span className="grid size-full place-items-center font-hand text-6xl text-sketch">
        ?
      </span>
    </motion.div>
  );
}

/**
 * ESCAPED: the imposter tiptoes off the edge of the paper (the paper's
 * torn edge clips them), waits a beat, then pops back to take a bow.
 */
export function SneakOff({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotionSafe();
  if (!active || reduced) return <>{children}</>;
  return (
    <motion.div
      initial={false}
      animate={{
        x: [0, 0, 14, 34, 60, 260, 260, 0],
        y: [0, 0, -6, 0, -6, 0, 0, 0],
        rotate: [0, 0, 6, -4, 6, 10, 0, 0],
        opacity: [1, 1, 1, 1, 1, 1, 0, 1],
      }}
      transition={{
        duration: 3.4,
        delay: 1.1,
        times: [0, 0.05, 0.18, 0.3, 0.42, 0.62, 0.8, 1],
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

const SHAPES = {
  star: "M6 0.6 L7.4 4.4 L11.4 4.6 L8.3 7.1 L9.4 11 L6 8.8 L2.6 11 L3.7 7.1 L0.6 4.6 L4.6 4.4 Z",
  heart:
    "M6 10.5 C2 7.5 1.2 5.5 1.6 4 C2 2.3 4.3 1.8 6 3.8 C7.7 1.8 10 2.3 10.4 4 C10.8 5.5 10 7.5 6 10.5 Z",
  squiggle: "M1 6 C2.5 2 4 10 6 6 C8 2 9.5 10 11 6",
  dot: "M6 2.5 C8 2.5 9.5 4 9.5 6 C9.5 8 8 9.5 6 9.5 C4 9.5 2.5 8 2.5 6 C2.5 4 4 2.5 6 2.5 Z",
} as const;
const KINDS = Object.keys(SHAPES) as Array<keyof typeof SHAPES>;
const COLORS = [
  crayon.red,
  crayon.yellow,
  crayon.blue,
  crayon.green,
  crayon.purple,
  crayon.orange,
  crayon.pink,
];

/** CAUGHT: a burst of crayon doodles that arc out and drift down. */
export function DoodleConfetti({
  seed,
  count = 26,
}: {
  seed: string;
  count?: number;
}) {
  const reduced = useReducedMotionSafe();
  if (reduced) return null;
  const r = rng(`${seed}:confetti`);
  const pieces = Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.4;
    const power = 120 + r() * 160;
    return {
      i,
      kind: KINDS[i % KINDS.length],
      color: COLORS[i % COLORS.length],
      dx: Math.cos(angle) * power,
      peak: Math.sin(angle) * power,
      fall: 220 + r() * 160,
      spin: (r() - 0.5) * 720,
      size: 14 + r() * 12,
      delay: r() * 0.25,
    };
  });
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/3 left-1/2 z-20 size-0"
    >
      {pieces.map((p) => (
        <motion.svg
          key={p.i}
          viewBox="0 0 12 12"
          width={p.size}
          height={p.size}
          className="absolute -translate-1/2 overflow-visible"
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
          animate={{
            x: [0, p.dx * 0.8, p.dx],
            y: [0, p.peak, p.peak + p.fall],
            rotate: p.spin,
            opacity: [1, 1, 0],
            scale: [0.4, 1, 1],
          }}
          transition={{
            duration: 1.9,
            delay: 0.35 + p.delay,
            ease: "easeOut",
            times: [0, 0.35, 1],
          }}
        >
          <path
            d={SHAPES[p.kind]}
            fill={p.kind === "squiggle" ? "none" : p.color}
            stroke={p.kind === "squiggle" ? p.color : "var(--color-graphite)"}
            strokeWidth={p.kind === "squiggle" ? 2 : 0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      ))}
    </div>
  );
}
