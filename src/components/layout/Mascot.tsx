"use client";

import { motion, useAnimate } from "motion/react";
import { useEffect, useState } from "react";
import { BoilingPath } from "@/components/sketch/BoilingPath";
import { useBoil } from "@/hooks/useBoil";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { blink, introDelay, spring, timeline, wave } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";

const BODY = "M22 20 L48 20 L48 66 L22 66 Z";
const TIP = "M22 66 L35 86 L48 66";
const ERASER = "M22 20 L22 10 C22 6 25 4 29 4 L41 4 C45 4 48 6 48 10 L48 20";
const BAND = "M22 20 L48 20 M22 15 L48 15";
const SMILE = "M29 47 C32 51 38 51 41 47";
const ARM_STILL = "M22 44 L10 56";
const ARM_WAVE = "M48 44 L62 30";

/** Pencil kid in the header: line-boils, blinks every 3–6s, waves now and then. */
export function Mascot() {
  const reduced = useReducedMotionSafe();
  const frame = useBoil(true);
  const [blinking, setBlinking] = useState(false);
  const [arm, animateArm] = useAnimate<SVGGElement>();

  useEffect(() => {
    if (reduced) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setBlinking(true);
          timer = window.setTimeout(() => {
            setBlinking(false);
            schedule();
          }, blink.closedMs);
        },
        blink.minMs + Math.random() * (blink.maxMs - blink.minMs),
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [reduced]);

  useEffect(() => {
    if (reduced || !arm.current) return;
    const id = window.setInterval(() => {
      if (document.hidden || !arm.current) return;
      void animateArm(
        arm.current,
        { rotate: [0, -28, 8, -28, 0] },
        { duration: 1.1, ease: "easeInOut" },
      );
    }, wave.everyMs);
    return () => window.clearInterval(id);
  }, [reduced, arm, animateArm]);

  const stroke = {
    frame,
    stroke: ink.graphite,
    strokeWidth: 2.2,
    roughness: 0.9,
  } as const;

  return (
    <motion.svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 70 90"
      className="h-16 w-12 shrink-0 overflow-visible sm:h-20 sm:w-16"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12, rotate: -12 }}
      animate={{ opacity: 1, y: 0, rotate: -6 }}
      transition={{ ...spring, delay: introDelay(timeline.logo) }}
    >
      <BoilingPath
        d={ERASER}
        seed={11}
        fill={ink.margin}
        fillStyle="solid"
        {...stroke}
      />
      <BoilingPath
        d={BODY}
        seed={12}
        fill={crayon.yellow}
        fillStyle="hachure"
        hachureGap={4}
        {...stroke}
      />
      <BoilingPath d={BAND} seed={13} {...stroke} strokeWidth={1.6} />
      <BoilingPath
        d={TIP}
        seed={14}
        fill="#F4D8A8"
        fillStyle="solid"
        {...stroke}
      />
      <path d="M32 80 L35 86 L38 80 Z" fill={ink.graphite} />
      <BoilingPath d={ARM_STILL} seed={15} {...stroke} />
      <motion.g ref={arm} style={{ originX: "48px", originY: "44px" }}>
        <BoilingPath d={ARM_WAVE} seed={16} {...stroke} />
        <circle
          cx="63"
          cy="29"
          r="3.2"
          fill={ink.card}
          stroke={ink.graphite}
          strokeWidth="2"
        />
      </motion.g>
      {[30, 40].map((cx) => (
        <motion.ellipse
          key={cx}
          cx={cx}
          cy={38}
          rx={2.4}
          ry={3}
          fill={ink.graphite}
          animate={{ scaleY: blinking ? 0.1 : 1 }}
          transition={{ duration: 0.06 }}
          style={{ originY: "38px" }}
        />
      ))}
      <BoilingPath d={SMILE} seed={17} {...stroke} strokeWidth={2} />
      <circle cx="27" cy="44" r="2.4" fill={crayon.red} opacity="0.35" />
      <circle cx="43" cy="44" r="2.4" fill={crayon.red} opacity="0.35" />
    </motion.svg>
  );
}
