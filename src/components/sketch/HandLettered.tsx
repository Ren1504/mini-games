"use client";

import { motion } from "motion/react";
import type { ElementType } from "react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, introDelay, letterPop, spring, stagger } from "@/lib/motion";
import { rng } from "@/lib/seed";

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  seed?: string;
  /** Letters pop in one by one starting at this intro time (seconds). */
  popInAt?: number;
  id?: string;
};

/**
 * Text with a seeded per-letter jitter (±1px baseline, ±1.5° rotation) so
 * headings look hand-lettered. Screen readers get the plain string.
 */
export function HandLettered({
  text,
  as: Tag = "span",
  className,
  seed,
  popInAt,
  id,
}: Props) {
  const reduced = useReducedMotionSafe();
  const r = rng(seed ?? text);
  let letterIndex = 0;

  const words = text.split(" ").map((word, w) => {
    const letters = [...word].map((ch, i) => {
      const y = Math.round((r() * 2 - 1) * 100) / 100;
      const rotate = Math.round((r() * 3 - 1.5) * 100) / 100;
      const index = letterIndex++;
      const style = { display: "inline-block", y, rotate };
      if (popInAt === undefined) {
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px) rotate(${rotate}deg)`,
            }}
          >
            {ch}
          </span>
        );
      }
      const from = index % 2 === 0 ? -letterPop.rotate : letterPop.rotate;
      return (
        <motion.span
          key={i}
          style={style}
          initial={
            reduced
              ? { opacity: 0 }
              : { opacity: 0, scale: letterPop.scale, rotate: rotate + from }
          }
          animate={{ opacity: 1, scale: 1, rotate }}
          transition={
            reduced
              ? { duration: duration.reduced }
              : {
                  ...spring,
                  delay: introDelay(popInAt + index * stagger.logoLetter),
                }
          }
        >
          {ch}
        </motion.span>
      );
    });
    return (
      <span key={w} className="inline-block whitespace-nowrap">
        {letters}
      </span>
    );
  });

  return (
    <Tag id={id} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={cn("inline")}>
        {words.flatMap((node, i) => (i === 0 ? [node] : [" ", node]))}
      </span>
    </Tag>
  );
}
