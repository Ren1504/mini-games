"use client";

import { motion } from "motion/react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, strokeEase, timeline } from "@/lib/motion";

/** How far the bottom of the reveal lags behind the top (the stagger). */
const SLANT = 30;

/**
 * Notebook paper: ruled lines that draw left → right with a slanted
 * wipe (lower lines start later, like a stagger), a red margin line,
 * binder holes on desktop, grain and a soft vignette. Decorative only.
 */
export function PaperBackground() {
  const reduced = useReducedMotionSafe();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.paperFade, delay: timeline.paper }}
      >
        <motion.div
          className="paper-rules absolute inset-0"
          initial={
            reduced
              ? false
              : { clipPath: `polygon(0% 0%, 0% 0%, -${SLANT}% 100%, 0% 100%)` }
          }
          animate={{
            clipPath: `polygon(0% 0%, ${100 + SLANT}% 0%, 100% 100%, 0% 100%)`,
          }}
          transition={{
            duration: duration.rules,
            ease: strokeEase,
            delay: timeline.rules,
          }}
        />
        <div className="paper-margin absolute inset-y-0" />
        <div className="absolute inset-y-0 left-0 hidden w-10 flex-col items-center justify-around py-[12vh] lg:flex">
          {[0, 1, 2].map((i) => (
            <span key={i} className="paper-hole size-6 rounded-full" />
          ))}
        </div>
      </motion.div>
      <div className="paper-grain fixed inset-0" />
      <div className="paper-vignette fixed inset-0" />
    </div>
  );
}
