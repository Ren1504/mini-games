"use client";

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { ReactNode } from "react";
import { RCircle, RLine, RPath } from "@/components/sketch/Rough";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, parallax } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";

const STAR =
  "M12 2.5 L14.6 8.8 L21.4 9.3 L16.2 13.6 L17.9 20.3 L12 16.6 L6.1 20.3 L7.8 13.6 L2.6 9.3 L9.4 8.8 Z";
const HEART =
  "M12 20.5 C4 14.5 2.5 11 3.2 8 C4 4.6 8.6 3.6 12 7.6 C15.4 3.6 20 4.6 20.8 8 C21.5 11 20 14.5 12 20.5 Z";

function Floating({
  scrollY,
  speed,
  className,
  children,
}: {
  scrollY: MotionValue<number>;
  speed: number;
  className: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotionSafe();
  const y = useTransform(scrollY, (v) => (reduced ? 0 : -v * speed));
  return (
    <motion.div className={`absolute ${className}`} style={{ y }}>
      {children}
    </motion.div>
  );
}

function Sun() {
  const reduced = useReducedMotionSafe();
  return (
    <svg viewBox="0 0 100 100" className="size-24 overflow-visible">
      <motion.g
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{
          duration: duration.sunTurn,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ originX: "50px", originY: "50px" }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <RLine
              key={i}
              x1={50 + Math.cos(a) * 30}
              y1={50 + Math.sin(a) * 30}
              x2={50 + Math.cos(a) * 44}
              y2={50 + Math.sin(a) * 44}
              seed={70 + i}
              stroke={crayon.orange}
              strokeWidth={2.4}
            />
          );
        })}
      </motion.g>
      <RCircle
        cx={50}
        cy={50}
        d={44}
        seed={81}
        stroke={ink.graphite}
        strokeWidth={2}
        fill={crayon.yellow}
        fillStyle="hachure"
        hachureGap={4}
      />
      <circle cx="43" cy="46" r="2.4" fill={ink.graphite} />
      <circle cx="57" cy="46" r="2.4" fill={ink.graphite} />
      <RPath
        d="M41 56 C46 62 54 62 59 56"
        seed={82}
        stroke={ink.graphite}
        strokeWidth={2}
      />
    </svg>
  );
}

function Doodle({
  d,
  color,
  seed,
  size = 32,
}: {
  d: string;
  color: string;
  seed: number;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="overflow-visible"
    >
      <RPath
        d={d}
        seed={seed}
        stroke={ink.sketch}
        strokeWidth={1.4}
        fill={color}
        fillStyle="hachure"
        hachureGap={2.5}
        roughness={0.8}
      />
    </svg>
  );
}

/**
 * Decorations in the page margins, drifting at 0.1–0.3× scroll speed.
 * Only on wide screens, where the margins are empty paper anyway.
 */
export function MarginDoodles() {
  const { scrollY } = useScroll();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-[5] hidden overflow-hidden 2xl:block"
    >
      <Floating
        scrollY={scrollY}
        speed={parallax.slow}
        className="top-28 right-[3%]"
      >
        <Sun />
      </Floating>
      <Floating
        scrollY={scrollY}
        speed={parallax.fast}
        className="top-[30rem] left-[calc(var(--margin-x)+0.5rem)]"
      >
        <Doodle d={STAR} color={crayon.yellow} seed={90} />
      </Floating>
      <Floating
        scrollY={scrollY}
        speed={parallax.mid}
        className="top-[44rem] right-[2%]"
      >
        <svg viewBox="0 0 80 50" className="h-14 w-24 overflow-visible">
          <RPath
            d="M4 26 L76 6 L46 44 L38 30 Z M38 30 L76 6"
            seed={91}
            stroke={ink.graphite}
            strokeWidth={1.8}
            fill={crayon.blue}
            fillStyle="hachure"
            hachureGap={4}
          />
          <RPath
            d="M2 34 C-20 40 -30 60 -10 66"
            seed={92}
            stroke={ink.sketch}
            strokeWidth={1.4}
          />
        </svg>
      </Floating>
      <Floating
        scrollY={scrollY}
        speed={parallax.slow}
        className="top-[70rem] left-[calc(var(--margin-x)+0.25rem)]"
      >
        <svg viewBox="0 0 60 60" className="size-14 overflow-visible">
          <RPath
            d="M30 30 C30 26 36 26 36 31 C36 38 24 38 24 30 C24 20 42 20 42 31 C42 44 18 44 18 30 C18 14 48 14 48 31"
            seed={93}
            stroke={crayon.purple}
            strokeWidth={2}
          />
        </svg>
      </Floating>
      <Floating
        scrollY={scrollY}
        speed={parallax.fast}
        className="top-[96rem] right-[3%]"
      >
        <svg viewBox="0 0 40 70" className="h-20 w-12 overflow-visible">
          <RCircle
            cx={20}
            cy={10}
            d={14}
            seed={94}
            stroke={ink.graphite}
            strokeWidth={1.8}
          />
          <RPath
            d="M20 17 L20 42 M20 24 L6 34 M20 24 L34 16 M20 42 L10 64 M20 42 L30 64"
            seed={95}
            stroke={ink.graphite}
            strokeWidth={1.8}
          />
        </svg>
      </Floating>
      <Floating
        scrollY={scrollY}
        speed={parallax.mid}
        className="top-[120rem] left-[calc(var(--margin-x)+0.75rem)]"
      >
        <Doodle d={HEART} color={crayon.red} seed={96} size={26} />
      </Floating>
      <Floating
        scrollY={scrollY}
        speed={parallax.slow}
        className="top-[140rem] right-[4%]"
      >
        <Doodle d={STAR} color={crayon.green} seed={97} size={24} />
      </Floating>
    </div>
  );
}
