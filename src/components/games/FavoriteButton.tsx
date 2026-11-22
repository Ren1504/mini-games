"use client";

import { motion, useAnimate } from "motion/react";
import { useId, useState, type MouseEvent } from "react";
import { useSound } from "@/components/fx/Sound";
import { RoughPaths } from "@/components/sketch/Rough";
import { useFavorites } from "@/hooks/useFavorites";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, strokeEase } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import { sketch } from "@/lib/rough";

const HEART =
  "M12 20.5 C4 14.5 2.5 11 3.2 8 C4 4.6 8.6 3.6 12 7.6 C15.4 3.6 20 4.6 20.8 8 C21.5 11 20 14.5 12 20.5 Z";
/** Crayon scribble that fills the heart when drawn (clipped to the heart). */
const SCRIBBLE =
  "M3 9 L7 4.5 L4.5 12 L10.5 5.5 L7 15.5 L13.5 6.5 L10 18.5 L17 6 L14 18 L20 7 L16.5 15 L21 10";

export function FavoriteButton({
  slug,
  title,
  className,
  size = 34,
}: {
  slug: string;
  title: string;
  className?: string;
  size?: number;
}) {
  const { favorites, toggle } = useFavorites();
  const { rustle } = useSound();
  const reduced = useReducedMotionSafe();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const [bursts, setBursts] = useState<number[]>([]);
  const clipId = useId();
  const on = favorites.has(slug);
  const outline = sketch.path(HEART, {
    seed: 5,
    stroke: on ? crayon.red : ink.graphite,
    strokeWidth: 1.8,
    roughness: 0.7,
    bowing: 0.6,
  });

  const onClick = (e: MouseEvent) => {
    const becomingOn = !on;
    toggle(slug);
    rustle();
    if (reduced || !scope.current) return;
    void animate(
      scope.current,
      { scale: [1, 1.3, 1] },
      { duration: duration.heart, ease: "easeOut" },
    );
    if (becomingOn) setBursts((b) => [...b, e.timeStamp]);
  };

  return (
    <button
      type="button"
      data-own-ring
      aria-pressed={on}
      aria-label={`Favorite ${title}`}
      onClick={onClick}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center",
        className,
      )}
    >
      <span ref={scope} className="block">
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          aria-hidden="true"
          focusable="false"
          overflow="visible"
        >
          <defs>
            <clipPath id={clipId}>
              <path d={HEART} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <motion.path
              d={SCRIBBLE}
              fill="none"
              stroke={crayon.red}
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
              transition={{
                pathLength: { duration: duration.heart, ease: strokeEase },
                opacity: { duration: 0.05 },
              }}
            />
          </g>
          <RoughPaths paths={outline} />
        </svg>
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {bursts.map((id) =>
          [0, 1, 2].map((i) => (
            <motion.svg
              key={`${id}-${i}`}
              viewBox="0 0 24 24"
              width={12}
              height={12}
              className="absolute top-1/2 left-1/2 -mt-1.5 -ml-1.5"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
              animate={{
                x: (i - 1) * 14,
                y: -34 - i * 4,
                opacity: 0,
                scale: 1,
              }}
              transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }}
              onAnimationComplete={
                i === 2
                  ? () => setBursts((b) => b.filter((x) => x !== id))
                  : undefined
              }
            >
              <path d={HEART} fill={crayon.red} />
            </motion.svg>
          )),
        )}
      </span>
    </button>
  );
}
