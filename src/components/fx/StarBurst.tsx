"use client";

import { motion } from "motion/react";
import { useCallback, useState, type MouseEvent } from "react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration } from "@/lib/motion";
import { crayon } from "@/lib/palette";

const STAR =
  "M6 0.6 L7.4 4.4 L11.4 4.6 L8.3 7.1 L9.4 11 L6 8.8 L2.6 11 L3.7 7.1 L0.6 4.6 L4.6 4.4 Z";
const COLORS = [
  crayon.yellow,
  crayon.red,
  crayon.blue,
  crayon.green,
  crayon.purple,
  crayon.orange,
];
const COUNT = 6;

type Burst = { id: number; x: number; y: number };

/** Returns a click handler and the particles to render inside a `relative` parent. */
export function useStarBurst() {
  const reduced = useReducedMotionSafe();
  const [bursts, setBursts] = useState<Burst[]>([]);

  const trigger = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (reduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      // Keyboard "clicks" have no pointer position: burst from the centre.
      const fromPointer = e.clientX !== 0 || e.clientY !== 0;
      const x = fromPointer ? e.clientX - rect.left : rect.width / 2;
      const y = fromPointer ? e.clientY - rect.top : rect.height / 2;
      setBursts((b) => [...b, { id: e.timeStamp, x, y }]);
    },
    [reduced],
  );

  const remove = useCallback(
    (id: number) => setBursts((b) => b.filter((x) => x.id !== id)),
    [],
  );

  const node = (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible"
    >
      {bursts.map((b) => (
        <StarBurst key={b.id} x={b.x} y={b.y} onDone={() => remove(b.id)} />
      ))}
    </span>
  );

  return { trigger, node };
}

function StarBurst({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + 0.4;
        const dist = 28 + (i % 3) * 8;
        return (
          <motion.svg
            key={i}
            viewBox="0 0 12 12"
            width={12}
            height={12}
            className="absolute"
            style={{ left: x - 6, top: y - 6 }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: 1,
              opacity: 0,
              rotate: i % 2 ? 90 : -90,
            }}
            transition={{ duration: duration.burst, ease: "easeOut" }}
            onAnimationComplete={i === 0 ? onDone : undefined}
          >
            <path
              d={STAR}
              fill={COLORS[i % COLORS.length]}
              stroke="#2B2B2B"
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          </motion.svg>
        );
      })}
    </>
  );
}
