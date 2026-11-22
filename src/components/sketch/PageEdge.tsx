"use client";

import { useRef } from "react";
import { useElementSize } from "@/hooks/useElementSize";
import { ink } from "@/lib/palette";
import { sketch } from "@/lib/rough";
import { roughSeed } from "@/lib/seed";
import { RoughPaths } from "./Rough";

/** A hand-drawn divider line spanning its container (the tabs' page edge). */
export function PageEdge({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`h-3 w-full ${className ?? ""}`}
    >
      {size && (
        <svg width={size.w} height={12} className="overflow-visible">
          <RoughPaths
            paths={sketch.line(2, 4, size.w - 2, 7, {
              seed: roughSeed(seed),
              stroke: ink.sketch,
              strokeWidth: 2,
              roughness: 1.4,
              bowing: 2,
            })}
          />
        </svg>
      )}
    </div>
  );
}
