"use client";

import type { ReactNode } from "react";
import { crayon } from "@/lib/palette";
import { Annotate } from "./Annotate";

/** A crayon circle drawn around inline content (rough-notation). */
export function SketchCircle({
  children,
  show = true,
  color = crayon.red,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  show?: boolean;
  color?: string;
  delayMs?: number;
  className?: string;
}) {
  return (
    <Annotate
      type="circle"
      show={show}
      color={color}
      strokeWidth={3}
      padding={[6, 10]}
      iterations={2}
      durationMs={800}
      delayMs={delayMs}
      className={className}
    >
      {children}
    </Annotate>
  );
}
