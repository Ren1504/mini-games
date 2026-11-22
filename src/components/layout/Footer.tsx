"use client";

import { RCircle, RPath } from "@/components/sketch/Rough";
import { crayon, ink } from "@/lib/palette";
import { rng } from "@/lib/seed";

const W = 1200;
const H = 90;

function grassPath(): string {
  const r = rng("grass");
  let d = `M 0 ${H - 8}`;
  for (let x = 0; x < W; x += 14) {
    const tip = H - 26 - r() * 22;
    d += ` L ${x + 5} ${tip.toFixed(1)} L ${x + 10} ${H - 10 - r() * 4}`;
  }
  return d;
}

const FLOWERS = [
  { x: 90, color: crayon.red, h: 52 },
  { x: 260, color: crayon.yellow, h: 44 },
  { x: 470, color: crayon.purple, h: 58 },
  { x: 700, color: crayon.blue, h: 46 },
  { x: 880, color: crayon.orange, h: 54 },
  { x: 1110, color: crayon.red, h: 48 },
];

/** Bottom of the notebook page: doodled grass and flowers. */
export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden">
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
        className="block h-24 w-full"
      >
        <RPath
          d={grassPath()}
          seed={31}
          stroke={crayon.green}
          strokeWidth={2}
          roughness={0.8}
        />
        {FLOWERS.map((f, i) => (
          <g key={f.x}>
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
              seed={60 + i}
              stroke={ink.graphite}
              strokeWidth={1.4}
              fill={crayon.yellow}
              fillStyle="solid"
            />
          </g>
        ))}
      </svg>
      <div className="page-x flex flex-wrap items-end justify-between gap-2 bg-[#f6f1df] pt-3 pb-6">
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
