"use client";

import { motion } from "motion/react";
import { duration, strokeEase } from "@/lib/motion";
import { sketch, type PathInfo, type SketchOptions } from "@/lib/rough";

type DrawProps = {
  /** Animate the stroke drawing itself (pathLength 0 → 1). */
  draw?: boolean;
  delay?: number;
  drawDuration?: number;
  /** Draw when scrolled into view instead of on mount. */
  inView?: boolean;
};

export function RoughPaths({
  paths,
  draw = false,
  delay = 0,
  drawDuration = duration.stroke,
  inView = false,
}: { paths: PathInfo[] } & DrawProps) {
  return (
    <>
      {paths.map((p, i) => {
        const common = {
          d: p.d,
          stroke: p.stroke,
          strokeWidth: p.strokeWidth,
          fill: p.fill ?? "none",
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        };
        const isSolid = p.fill && p.fill !== "none";
        if (!draw || isSolid) return <path key={i} {...common} />;
        const target = { pathLength: 1, opacity: 1 };
        return (
          <motion.path
            key={i}
            {...common}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? undefined : target}
            whileInView={inView ? target : undefined}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              pathLength: { duration: drawDuration, ease: strokeEase, delay },
              opacity: { duration: 0.01, delay },
            }}
          />
        );
      })}
    </>
  );
}

type Shape<T> = T & SketchOptions & DrawProps;

export function RRect({
  x,
  y,
  w,
  h,
  draw,
  delay,
  inView,
  drawDuration,
  ...o
}: Shape<{ x: number; y: number; w: number; h: number }>) {
  return (
    <RoughPaths
      paths={sketch.rect(x, y, w, h, o)}
      {...{ draw, delay, inView, drawDuration }}
    />
  );
}

export function RCircle({
  cx,
  cy,
  d,
  draw,
  delay,
  inView,
  drawDuration,
  ...o
}: Shape<{ cx: number; cy: number; d: number }>) {
  return (
    <RoughPaths
      paths={sketch.circle(cx, cy, d, o)}
      {...{ draw, delay, inView, drawDuration }}
    />
  );
}

export function REllipse({
  cx,
  cy,
  w,
  h,
  draw,
  delay,
  inView,
  drawDuration,
  ...o
}: Shape<{ cx: number; cy: number; w: number; h: number }>) {
  return (
    <RoughPaths
      paths={sketch.ellipse(cx, cy, w, h, o)}
      {...{ draw, delay, inView, drawDuration }}
    />
  );
}

export function RLine({
  x1,
  y1,
  x2,
  y2,
  draw,
  delay,
  inView,
  drawDuration,
  ...o
}: Shape<{ x1: number; y1: number; x2: number; y2: number }>) {
  return (
    <RoughPaths
      paths={sketch.line(x1, y1, x2, y2, o)}
      {...{ draw, delay, inView, drawDuration }}
    />
  );
}

export function RPath({
  d,
  draw,
  delay,
  inView,
  drawDuration,
  ...o
}: Shape<{ d: string }>) {
  return (
    <RoughPaths
      paths={sketch.path(d, o)}
      {...{ draw, delay, inView, drawDuration }}
    />
  );
}

export function RPolygon({
  points,
  draw,
  delay,
  inView,
  drawDuration,
  ...o
}: Shape<{ points: [number, number][] }>) {
  return (
    <RoughPaths
      paths={sketch.polygon(points, o)}
      {...{ draw, delay, inView, drawDuration }}
    />
  );
}
