"use client";

import { motion } from "motion/react";
import {
  useRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useBoil } from "@/hooks/useBoil";
import { useElementSize } from "@/hooks/useElementSize";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration, scribbleIn, spring } from "@/lib/motion";
import { ink } from "@/lib/palette";
import { BOIL_SEED_STEP, sketch, type SketchOptions } from "@/lib/rough";
import { roughSeed } from "@/lib/seed";
import { RoughPaths } from "./Rough";

export type SketchBoxProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  /** Stable string; same seed = same wobble on server and client. */
  seed: string;
  as?: ElementType;
  children?: ReactNode;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  /** Crayon fill color. Omit for an outline only. */
  fill?: string;
  fillStyle?: SketchOptions["fillStyle"];
  hachureGap?: number;
  hachureAngle?: number;
  fillWeight?: number;
  /** Extra crayon fill that scribbles in on hover (parent motion "hover" label). */
  hoverFill?: string;
  shape?: "rect" | "ellipse";
  /** Distance from the element edge to the drawn outline, in px. */
  inset?: number;
  /** Line-boil the outline (keep this for one or two things on screen). */
  boil?: boolean;
  /** Draw the outline on mount, then fade the fill in. */
  draw?: boolean;
  drawDelay?: number;
  /** Pencil-hatched drop shadow; "lifted" moves it further out. */
  shadow?: "none" | "rest" | "lifted";
  style?: CSSProperties;
};

/**
 * A box whose border, fill and shadow are rough.js drawings sized to the
 * element. The SVG sits behind the content (negative z inside an isolated
 * stacking context), so children lay out normally.
 */
export function SketchBox({
  seed,
  as: Tag = "div",
  className,
  children,
  stroke = ink.graphite,
  strokeWidth = 2,
  roughness = 1.1,
  fill,
  fillStyle = "hachure",
  hachureGap = 6,
  hachureAngle = -41,
  fillWeight = 1.6,
  hoverFill,
  shape = "rect",
  inset = 3,
  boil = false,
  draw = false,
  drawDelay = 0,
  shadow = "none",
  ...rest
}: SketchBoxProps) {
  const ref = useRef<HTMLElement>(null);
  const size = useElementSize(ref);
  const frame = useBoil(boil);
  const reduced = useReducedMotionSafe();
  const base = roughSeed(seed);
  const animateDraw = draw && !reduced;

  let outline: ReturnType<typeof sketch.rect> = [];
  let fillPaths: typeof outline = [];
  let hoverPaths: typeof outline = [];
  let shadowPaths: typeof outline = [];

  if (size && size.w > inset * 2 && size.h > inset * 2) {
    const w = size.w - inset * 2;
    const h = size.h - inset * 2;
    const shapeOf = (o: SketchOptions) =>
      shape === "ellipse"
        ? sketch.ellipse(size.w / 2, size.h / 2, w, h, o)
        : sketch.rect(inset, inset, w, h, o);
    outline = shapeOf({
      seed: base + frame * BOIL_SEED_STEP,
      stroke,
      strokeWidth,
      roughness,
    });
    if (fill) {
      fillPaths = shapeOf({
        seed: base + 1,
        stroke: "none",
        fill,
        fillStyle,
        hachureGap,
        hachureAngle,
        fillWeight,
        roughness,
      });
    }
    if (hoverFill) {
      hoverPaths = shapeOf({
        seed: base + 2,
        stroke: "none",
        fill: hoverFill,
        fillStyle: "zigzag",
        hachureGap: 4,
        hachureAngle: 50,
        fillWeight: 2,
        roughness,
      });
    }
    if (shadow !== "none") {
      shadowPaths = shapeOf({
        seed: base + 3,
        stroke: "none",
        fill: ink.graphite,
        fillStyle: "hachure",
        hachureGap: 4.5,
        hachureAngle: 60,
        fillWeight: 1,
        roughness: 1.6,
      });
    }
  }

  return (
    <Tag ref={ref} className={cn("relative isolate", className)} {...rest}>
      {size && (
        <svg
          aria-hidden="true"
          focusable="false"
          className="pointer-events-none absolute top-0 left-0 -z-10 overflow-visible"
          width={size.w}
          height={size.h}
        >
          {shadow !== "none" && (
            <motion.g
              initial={false}
              animate={
                shadow === "lifted"
                  ? { x: 9, y: 12, opacity: 0.42 }
                  : { x: 4, y: 6, opacity: 0.24 }
              }
              transition={spring}
            >
              <RoughPaths paths={shadowPaths} />
            </motion.g>
          )}
          {fill && (
            <motion.g
              initial={animateDraw ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.3,
                delay: drawDelay + duration.strokeShort * 0.8,
              }}
            >
              <RoughPaths paths={fillPaths} />
            </motion.g>
          )}
          {hoverFill && (
            <motion.g variants={scribbleIn}>
              <RoughPaths paths={hoverPaths} />
            </motion.g>
          )}
          <RoughPaths
            paths={outline}
            draw={animateDraw}
            delay={drawDelay}
            drawDuration={duration.strokeShort}
          />
        </svg>
      )}
      {children}
    </Tag>
  );
}
