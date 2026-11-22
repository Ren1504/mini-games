import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { rng } from "@/lib/seed";

/**
 * clip-path polygon for a page torn out of a notebook: ragged top edge,
 * gently uneven sides and bottom. x in %, y in px so the tear depth stays
 * the same on any page height.
 */
export function tornClipPath(seed: string, teeth = 46, depth = 12): string {
  const r = rng(`${seed}:torn`);
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = ((i / teeth) * 100).toFixed(2);
    const y = (r() * depth + (i % 2) * depth * 0.35).toFixed(1);
    pts.push(`${x}% ${y}px`);
  }
  for (let i = 1; i <= 6; i++) {
    pts.push(
      `calc(100% - ${(r() * 3).toFixed(1)}px) calc(${((i / 6) * 100).toFixed(1)}% - ${i === 6 ? 2 : 0}px)`,
    );
  }
  for (let i = 12; i >= 0; i--) {
    pts.push(
      `${((i / 12) * 100).toFixed(2)}% calc(100% - ${(r() * 4).toFixed(1)}px)`,
    );
  }
  for (let i = 5; i >= 1; i--) {
    pts.push(`${(r() * 3).toFixed(1)}px ${((i / 6) * 100).toFixed(1)}%`);
  }
  return `polygon(${pts.join(", ")})`;
}

/** Wraps content in a torn-out sheet. The shadow lives on the wrapper. */
export function TornEdge({
  seed,
  children,
  className,
  paperClassName,
  style,
}: {
  seed: string;
  children: ReactNode;
  className?: string;
  paperClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("drop-shadow-[0_10px_18px_rgba(43,43,43,0.22)]", className)}
      style={style}
    >
      <div
        className={cn("torn-paper", paperClassName)}
        style={{ clipPath: tornClipPath(seed) }}
      >
        {children}
      </div>
    </div>
  );
}
