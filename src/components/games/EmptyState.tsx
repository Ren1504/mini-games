"use client";

import { motion } from "motion/react";
import { RCircle, RPath } from "@/components/sketch/Rough";
import { SketchButton } from "@/components/sketch/SketchButton";
import { spring } from "@/lib/motion";
import { ink } from "@/lib/palette";

/** Sad doodle + crumpled paper ball for "nothing matched". */
export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col items-center gap-5 py-14 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 220 120"
        className="h-32 w-56 overflow-visible"
      >
        <RCircle
          cx={70}
          cy={58}
          d={84}
          seed={201}
          strokeWidth={2.4}
          draw
          delay={0.1}
        />
        <circle cx="56" cy="48" r="3.5" fill={ink.graphite} />
        <circle cx="84" cy="48" r="3.5" fill={ink.graphite} />
        <RPath
          d="M52 80 C62 68 78 68 88 80"
          seed={202}
          strokeWidth={2.4}
          draw
          delay={0.5}
        />
        <RPath
          d="M88 54 C90 60 92 62 90 66"
          seed={203}
          stroke="var(--color-crayon-blue)"
          strokeWidth={2}
          draw
          delay={0.7}
        />
        {/* Crumpled ball of paper */}
        <RPath
          d="M150 96 C136 92 134 74 146 66 C150 56 166 54 174 62 C188 62 194 78 186 88 C182 100 162 102 150 96 Z"
          seed={204}
          fill="var(--color-key)"
          fillStyle="solid"
          strokeWidth={2}
        />
        <RPath
          d="M146 72 L160 80 L156 92 M168 62 L164 78 L180 84 M160 80 L170 72"
          seed={205}
          stroke={ink.sketch}
          strokeWidth={1.4}
        />
      </svg>
      <p className="font-hand text-3xl">{message}</p>
      <SketchButton seed="empty-action" color="blue" onClick={onAction}>
        {actionLabel}
      </SketchButton>
    </motion.div>
  );
}
