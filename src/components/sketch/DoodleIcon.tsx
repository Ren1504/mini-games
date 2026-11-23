"use client";

import { sketch } from "@/lib/rough";
import { hash } from "@/lib/seed";
import { RoughPaths } from "./Rough";

/** Hand-drawn icon outlines on a 24×24 grid. */
const ICONS = {
  star: "M12 2.5 L14.6 8.8 L21.4 9.3 L16.2 13.6 L17.9 20.3 L12 16.6 L6.1 20.3 L7.8 13.6 L2.6 9.3 L9.4 8.8 Z",
  heart:
    "M12 20.5 C4 14.5 2.5 11 3.2 8 C4 4.6 8.6 3.6 12 7.6 C15.4 3.6 20 4.6 20.8 8 C21.5 11 20 14.5 12 20.5 Z",
  magnifier:
    "M10.2 3.6 C14 3.6 16.8 6.4 16.8 10.1 C16.8 13.8 14 16.7 10.2 16.7 C6.5 16.7 3.6 13.8 3.6 10.1 C3.6 6.4 6.5 3.6 10.2 3.6 Z M15 15 L21 21",
  speaker:
    "M3.5 9.2 L7.5 9.2 L12.5 4.8 L12.5 19.2 L7.5 14.8 L3.5 14.8 Z M15.8 8.8 C17.4 10.4 17.4 13.6 15.8 15.2 M18.4 6.2 C21.4 9.2 21.4 14.8 18.4 17.8",
  "speaker-off":
    "M3.5 9.2 L7.5 9.2 L12.5 4.8 L12.5 19.2 L7.5 14.8 L3.5 14.8 Z M15.5 9.2 L21 14.8 M21 9.2 L15.5 14.8",
  clock:
    "M12 3 C17 3 21 7 21 12 C21 17 17 21 12 21 C7 21 3 17 3 12 C3 7 7 3 12 3 Z M12 7 L12 12.2 L15.5 14.4",
  person:
    "M12 2.8 C13.9 2.8 15.2 4.1 15.2 5.9 C15.2 7.7 13.9 9 12 9 C10.1 9 8.8 7.7 8.8 5.9 C8.8 4.1 10.1 2.8 12 2.8 Z M12 9 L12 16 M12 11.5 L7.5 14 M12 11.5 L16.5 14 M12 16 L8.5 21.5 M12 16 L15.5 21.5",
  play: "M7 4.5 L19.5 12 L7 19.5 Z",
  close: "M5.5 5.5 L18.5 18.5 M18.5 5.5 L5.5 18.5",
  back: "M20 12 L5 12 M10.5 6 L4.5 12 L10.5 18",
  check: "M4.5 12.5 L9.5 17.5 L19.5 6",
  link: "M10 14 L14 10 M8.5 11 L6 13.5 C4.3 15.2 4.3 17.9 6 19.6 C7.7 21.3 10.4 21.3 12.1 19.6 L14.5 17.2 M15.5 13 L18 10.5 C19.7 8.8 19.7 6.1 18 4.4 C16.3 2.7 13.6 2.7 11.9 4.4 L9.5 6.8",
  sun: "M7.4 12 C7.4 9.4 9.4 7.4 12 7.4 C14.6 7.4 16.6 9.4 16.6 12 C16.6 14.6 14.6 16.6 12 16.6 C9.4 16.6 7.4 14.6 7.4 12 Z M12 1.8 L12 4.6 M12 19.4 L12 22.2 M1.8 12 L4.6 12 M19.4 12 L22.2 12 M4.8 4.8 L6.7 6.7 M17.3 17.3 L19.2 19.2 M4.8 19.2 L6.7 17.3 M17.3 6.7 L19.2 4.8",
  moon: "M14.8 3 C9.6 3.5 5.8 7.6 5.8 12.6 C5.8 17.7 10.1 21.5 15.2 21 C17.7 20.8 19.8 19.6 21 17.9 C15.8 18.7 11.1 14.8 11.1 9.6 C11.1 7 12.5 4.5 14.8 3 Z",
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Crayon fill (hachure) inside the outline. */
  fill?: string;
  strokeWidth?: number;
  /** Optional label; without it the icon is decorative. */
  label?: string;
  className?: string;
  seed?: number;
};

export function DoodleIcon({
  name,
  size = 24,
  color = "currentColor",
  fill,
  strokeWidth = 1.8,
  label,
  className,
  seed,
}: Props) {
  const s = seed ?? (hash(name) % 997) + 1;
  const paths = sketch.path(ICONS[name], {
    seed: s,
    stroke: color,
    strokeWidth,
    roughness: 0.7,
    bowing: 0.6,
    fill,
    fillStyle: "hachure",
    hachureGap: 2.6,
    fillWeight: 1.2,
    hachureAngle: -50,
  });
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      overflow="visible"
    >
      <RoughPaths paths={paths} />
    </svg>
  );
}
