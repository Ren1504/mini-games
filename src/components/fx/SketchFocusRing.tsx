"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { RoughPaths } from "@/components/sketch/Rough";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, strokeEase } from "@/lib/motion";
import { crayon } from "@/lib/palette";
import { sketch } from "@/lib/rough";

type Ring = { x: number; y: number; w: number; h: number; key: number };

const PAD = 10;

const NOT_TEXT = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
  "image",
]);

/**
 * Typing boxes get no circle: their own sketch border turns blue instead
 * (see [data-text-field] in globals.css).
 */
const isTextEntry = (el: Element) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLElement && el.isContentEditable) ||
  (el instanceof HTMLInputElement && !NOT_TEXT.has(el.type));

/**
 * Keyboard focus indicator drawn as a crayon circle. One fixed overlay
 * follows the focused element (it never sits inside tilted cards, so it
 * can't be clipped or rotated). Elements can point the ring at a bigger
 * box with data-focus-ring on an ancestor (the whole game card).
 * Text fields are skipped: their sketch border highlights instead.
 * Native outlines come back if this component never mounts, and in
 * Windows High Contrast mode.
 */
export function SketchFocusRing() {
  const [ring, setRing] = useState<Ring | null>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sketch-focus");
    let target: Element | null = null;
    let lastTarget: Element | null = null;
    let frame = 0;
    let counter = 0;

    const measure = () => {
      frame = 0;
      if (!target || !target.isConnected) {
        lastTarget = null;
        setRing(null);
        return;
      }
      const host = target.hasAttribute("data-own-ring")
        ? target
        : (target.closest("[data-focus-ring]") ?? target);
      const box = host.getBoundingClientRect();
      if (target !== lastTarget) {
        counter += 1;
        lastTarget = target;
      }
      const next = {
        x: Math.round(box.left - PAD),
        y: Math.round(box.top - PAD),
        w: Math.round(box.width + PAD * 2),
        h: Math.round(box.height + PAD * 2),
        key: counter,
      };
      setRing((prev) =>
        prev &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.w === next.w &&
        prev.h === next.h &&
        prev.key === next.key
          ? prev
          : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      target =
        el && el.matches(":focus-visible") && !isTextEntry(el) ? el : null;
      schedule();
    };
    const onFocusOut = () => {
      target = null;
      schedule();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    // Cards move while they animate; follow them for a moment after focus.
    const follow = window.setInterval(() => target && schedule(), 120);
    return () => {
      root.classList.remove("sketch-focus");
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      window.clearInterval(follow);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!ring) return null;
  const paths = sketch.ellipse(ring.w / 2, ring.h / 2, ring.w, ring.h, {
    seed: (ring.key % 50) + 1,
    stroke: crayon.blue,
    strokeWidth: 3,
    roughness: 1.4,
  });

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[999] overflow-visible"
      style={{ transform: `translate(${ring.x}px, ${ring.y}px)` }}
      width={ring.w}
      height={ring.h}
    >
      <motion.g
        key={ring.key}
        initial={reduced ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ duration: duration.reduced, ease: strokeEase }}
      >
        <RoughPaths paths={paths} draw={!reduced} drawDuration={0.28} />
      </motion.g>
    </svg>
  );
}
