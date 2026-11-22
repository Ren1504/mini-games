"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { spring } from "@/lib/motion";

const CLICKABLE =
  'a, button, [role="button"], [role="tab"], label, select, summary, input[type="checkbox"], input[type="radio"]';

/**
 * Pencil cursor for mouse/trackpad users. The tip is the hotspot. Over
 * clickable things it tilts as if about to write. Touch devices and
 * coarse pointers keep the native cursor (the component renders nothing).
 */
export function PencilCursor() {
  const enabled = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [visible, setVisible] = useState(false);
  const [hot, setHot] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rotate = useSpring(0, spring);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("pencil-cursor");
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const target =
        e.target instanceof Element ? e.target.closest(CLICKABLE) : null;
      setHot(Boolean(target));
    };
    const leave = () => setVisible(false);
    const press = () => setDown(true);
    const release = () => setDown(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    return () => {
      root.classList.remove("pencil-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
    };
  }, [enabled, x, y]);

  useEffect(() => {
    rotate.set(hot ? -22 : 0);
  }, [hot, rotate]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[1000]"
      style={{ x, y, opacity: visible ? 1 : 0 }}
    >
      <motion.svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        style={{ rotate, originX: 0, originY: 1 }}
        animate={{ scale: down ? 0.9 : 1 }}
        transition={spring}
        className="-translate-y-full overflow-visible"
      >
        {/* Pencil drawn tip-down at (1, 33) */}
        <path
          d="M1.5 32.5 L4.8 23.6 L10.4 29.2 Z"
          fill="#F4D8A8"
          stroke="#2B2B2B"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M1.5 32.5 L2.7 29.3 L4.7 31.3 Z" fill="#2B2B2B" />
        <path
          d="M4.8 23.6 L24.6 3.8 L30.2 9.4 L10.4 29.2 Z"
          fill="#FFBE0B"
          stroke="#2B2B2B"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M7.6 26.4 L27.4 6.6"
          stroke="#2B2B2B"
          strokeWidth="0.9"
          opacity="0.5"
        />
        <path
          d="M24.6 3.8 L27.2 1.2 C28.3 0.2 29.6 0.3 30.6 1.3 L32.7 3.4 C33.7 4.4 33.8 5.7 32.8 6.8 L30.2 9.4 Z"
          fill="#E88B8B"
          stroke="#2B2B2B"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
}
