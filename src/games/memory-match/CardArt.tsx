"use client";

import { RoughPaths } from "@/components/sketch/Rough";
import { sketch } from "@/lib/rough";
import { roughSeed } from "@/lib/seed";
import { ink } from "@/lib/palette";
import type { CardSymbol } from "./symbols";

/**
 * A card symbol drawn in crayon. Same symbol = same wobble every time
 * (seeded by its id), so the two cards of a pair look identical.
 */
export function CardArt({
  symbol,
  className,
}: {
  symbol: CardSymbol;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
      overflow="visible"
    >
      {symbol.parts.map((p, i) => (
        <RoughPaths
          key={i}
          paths={sketch.path(p.d, {
            seed: roughSeed(`${symbol.id}-${i}`),
            stroke: p.stroke ?? ink.graphite,
            strokeWidth: p.width ?? 2.2,
            roughness: 0.8,
            bowing: 0.6,
            fill: p.fill,
            fillStyle: p.solid ? "solid" : "hachure",
            hachureGap: 3.4,
            hachureAngle: -50,
            fillWeight: 1.5,
          })}
        />
      ))}
    </svg>
  );
}
