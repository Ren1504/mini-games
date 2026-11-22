"use client";

import { motion } from "motion/react";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { PaperBackground } from "@/components/paper/PaperBackground";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, pageTurn, strokeEase } from "@/lib/motion";
import { useModalState } from "./ModalState";

/**
 * The notebook page everything sits on. When a game opens in the modal,
 * the page turns slightly away (rotateY around the left edge, at the
 * height the reader is looking at). Reduced motion: no turn, the modal's
 * dim backdrop does the work.
 */
export function NotebookPage({ children }: { children: ReactNode }) {
  const { open } = useModalState();
  const reduced = useReducedMotionSafe();
  const [originY, setOriginY] = useState(0);
  const turned = open && !reduced;

  useLayoutEffect(() => {
    if (!open) return;
    const y = window.scrollY + window.innerHeight / 2;
    // Reading layout here is the point: the hinge must sit mid-viewport.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOriginY(y);
  }, [open]);

  return (
    <motion.div
      className="relative isolate flex min-h-dvh flex-col"
      initial={false}
      animate={
        turned
          ? { rotateY: pageTurn.rotateY, scale: pageTurn.scale }
          : { rotateY: 0, scale: 1 }
      }
      transition={{ duration: duration.pageTurn, ease: strokeEase }}
      style={{
        transformPerspective: pageTurn.perspective,
        transformOrigin: `0px ${originY}px`,
      }}
      aria-hidden={open || undefined}
      inert={open || undefined}
    >
      <PaperBackground />
      {children}
    </motion.div>
  );
}
