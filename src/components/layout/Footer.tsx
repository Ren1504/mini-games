"use client";

import { useRef } from "react";
import { RCircle, RPath } from "@/components/sketch/Rough";
import { useElementSize } from "@/hooks/useElementSize";
import { crayon, ink } from "@/lib/palette";
import { rng } from "@/lib/seed";

/** Drawing height in px. Nothing is scaled, so nothing is ever cropped. */
const H = 90;
/** Roughly one flower per this many px of footer width. */
const FLOWER_EVERY = 180;
/** Width drawn during SSR, before the footer has been measured. */
const FALLBACK_WIDTH = 1440;
const PETALS = [
  crayon.red,
  crayon.yellow,
  crayon.purple,
  crayon.blue,
  crayon.orange,
];

function grassPath(width: number): string {
  const r = rng("grass");
  let d = `M 0 ${H - 8}`;
  for (let x = 0; x < width + 14; x += 14) {
    const tip = H - 26 - r() * 22;
    d += ` L ${x + 5} ${tip.toFixed(1)} L ${x + 10} ${(H - 10 - r() * 4).toFixed(1)}`;
  }
  return d;
}

/** Evenly spaced flowers with a seeded wobble in position, height and color. */
function flowers(width: number) {
  const count = Math.max(2, Math.round(width / FLOWER_EVERY));
  const step = width / count;
  return Array.from({ length: count }, (_, i) => {
    const r = rng(`flower-${i}`);
    return {
      x: Math.round(step * (i + 0.5) + (r() - 0.5) * step * 0.3),
      // Stem height; the head (radius 10) still clears the top by ≥ 16px.
      h: Math.round(44 + r() * 14),
      color: PETALS[i % PETALS.length],
    };
  });
}

/**
 * Bottom of the notebook page: doodled grass and flowers. The drawing is
 * generated for the footer's measured width instead of stretching one
 * fixed picture, so flowers are never scaled up and cropped.
 */
export function Footer() {
  const ref = useRef<HTMLDivElement>(null);
  const size = useElementSize(ref);
  const width = size ? size.w : FALLBACK_WIDTH;

  return (
    <footer className="relative mt-24 overflow-hidden">
      <div ref={ref} className="h-[90px] w-full overflow-hidden">
        <svg
          aria-hidden="true"
          focusable="false"
          width={width}
          height={H}
          className="block"
        >
          <RPath
            d={grassPath(width)}
            seed={31}
            stroke={crayon.green}
            strokeWidth={2}
            roughness={0.8}
          />
          {flowers(width).map((f, i) => (
            <g key={i}>
              <RPath
                d={`M ${f.x} ${H - 8} Q ${f.x + 6} ${H - f.h / 2} ${f.x} ${H - f.h}`}
                seed={40 + i}
                stroke={crayon.green}
                strokeWidth={2.2}
              />
              <RCircle
                cx={f.x}
                cy={H - f.h - 6}
                d={20}
                seed={50 + i}
                stroke={ink.graphite}
                strokeWidth={1.6}
                fill={f.color}
                fillStyle="hachure"
                hachureGap={3}
              />
              <RCircle
                cx={f.x}
                cy={H - f.h - 6}
                d={6}
                seed={70 + i}
                stroke={ink.graphite}
                strokeWidth={1.4}
                fill={crayon.yellow}
                fillStyle="solid"
              />
            </g>
          ))}
        </svg>
      </div>
      <div className="page-x flex flex-wrap items-end justify-between gap-2 bg-footer pt-3 pb-6">
        <p className="text-lg">
          made with{" "}
          <span role="img" aria-label="crayons">
            🖍️
          </span>{" "}
          by Ren
        </p>
        <p className="-rotate-3 font-note text-2xl text-sketch">page 1</p>
      </div>
    </footer>
  );
}
