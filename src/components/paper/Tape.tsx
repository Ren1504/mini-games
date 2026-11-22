import { cn } from "@/lib/cn";
import { tapeColors } from "@/lib/palette";
import { rng, seededPick, seededRange } from "@/lib/seed";

/** Seeded washi-tape look for a given key: color, angle and length. */
export function tapeLook(seed: string) {
  return {
    color: seededPick(`${seed}:tape-color`, tapeColors),
    rotate: seededRange(`${seed}:tape-angle`, -9, 9),
    width: Math.round(seededRange(`${seed}:tape-len`, 78, 108)),
  };
}

function tapeOutline(seed: string, w: number, h: number): string {
  const r = rng(`${seed}:tape-edge`);
  const teeth = 5;
  const pts: string[] = [];
  // Left torn end, top edge, right torn end, bottom edge.
  for (let i = 0; i <= teeth; i++)
    pts.push(`${(r() * 4).toFixed(1)},${((h / teeth) * i).toFixed(1)}`);
  pts.push(`${w / 2},${(r() * 0.8).toFixed(1)}`);
  for (let i = 0; i <= teeth; i++)
    pts.push(`${(w - r() * 4).toFixed(1)},${(h - (h / teeth) * i).toFixed(1)}`);
  pts.push(`${w / 2},${(h - r() * 0.8).toFixed(1)}`);
  return pts.join(" ");
}

/** A strip of semi-transparent washi tape with torn ends. */
export function Tape({
  seed,
  className,
  height = 24,
}: {
  seed: string;
  className?: string;
  height?: number;
}) {
  const { color, width } = tapeLook(seed);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("drop-shadow-[0_1px_0_rgba(43,43,43,0.12)]", className)}
    >
      <polygon points={tapeOutline(seed, width, height)} fill={color} />
      {/* Faint woven stripes so it reads as tape, not a sticker */}
      {Array.from({ length: Math.floor(width / 9) }, (_, i) => (
        <line
          key={i}
          x1={6 + i * 9}
          y1={2}
          x2={i * 9}
          y2={height - 2}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
