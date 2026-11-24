"use client";

import { motion } from "motion/react";
import { RCircle } from "@/components/sketch/Rough";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { crayon } from "@/lib/palette";

/** Live connection to a game room (shared by every online game). */
export type ConnectionStatus =
  "connecting" | "connected" | "reconnecting" | "offline";

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

/** Tiny doodle: green dot (connected), wobbling orange (reconnecting), red (offline). */
export function ConnectionDot({ status }: { status: ConnectionStatus }) {
  const reduced = useReducedMotionSafe();
  const color =
    status === "connected"
      ? crayon.green
      : status === "offline"
        ? crayon.red
        : crayon.orange;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-lg"
      role="status"
      aria-live="polite"
    >
      <motion.svg
        viewBox="0 0 20 20"
        width={18}
        height={18}
        aria-hidden="true"
        animate={
          status === "reconnecting" && !reduced
            ? { rotate: 360 }
            : { rotate: 0 }
        }
        transition={
          status === "reconnecting"
            ? { duration: 1.2, repeat: Infinity, ease: "linear" }
            : { duration: 0 }
        }
      >
        <RCircle
          cx={10}
          cy={10}
          d={14}
          seed={710}
          fill={color}
          fillStyle="solid"
          strokeWidth={1.4}
        />
      </motion.svg>
      <span className={status === "connected" ? "sr-only sm:not-sr-only" : ""}>
        {STATUS_TEXT[status]}
      </span>
    </span>
  );
}
