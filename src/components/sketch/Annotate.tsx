"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type {
  RoughAnnotation,
  RoughAnnotationType,
} from "rough-notation/lib/model";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  type: RoughAnnotationType;
  show: boolean;
  color: string;
  strokeWidth?: number;
  padding?: number | [number, number];
  iterations?: number;
  durationMs?: number;
  /** Wait this long after `show` turns true (lets entrance animations settle). */
  delayMs?: number;
  multiline?: boolean;
  className?: string;
};

/**
 * Wrapper around rough-notation. The library is loaded lazily and only in
 * the browser; it measures the element, so we wait for web fonts first.
 */
export function Annotate({
  children,
  type,
  show,
  color,
  strokeWidth = 2,
  padding = 4,
  iterations = 2,
  durationMs = 600,
  delayMs = 0,
  multiline = false,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const annotation = useRef<RoughAnnotation | null>(null);
  const reduced = useReducedMotionSafe();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let timer: number | undefined;
    void Promise.all([import("rough-notation"), document.fonts.ready]).then(
      ([{ annotate }]) => {
        if (cancelled) return;
        annotation.current = annotate(el, {
          type,
          color,
          strokeWidth,
          padding,
          iterations,
          multiline,
          animate: !reduced,
          animationDuration: durationMs,
        });
        if (show)
          timer = window.setTimeout(() => annotation.current?.show(), delayMs);
      },
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      annotation.current?.remove();
      annotation.current = null;
    };
    // `show` is handled by the effect below; recreating on every toggle
    // would restart the draw animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, color, strokeWidth, reduced, durationMs, iterations, multiline]);

  useEffect(() => {
    const a = annotation.current;
    if (!a) return;
    if (show) {
      const t = window.setTimeout(() => a.show(), delayMs);
      return () => window.clearTimeout(t);
    }
    a.hide();
  }, [show, delayMs]);

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      {children}
    </span>
  );
}
