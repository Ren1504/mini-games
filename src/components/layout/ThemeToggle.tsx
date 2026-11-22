"use client";

import { useEffect, type MouseEvent } from "react";
import { useSound } from "@/components/fx/Sound";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { followSystemTheme, useTheme } from "@/hooks/useTheme";
import { crayon } from "@/lib/palette";

/**
 * Both icons share one grid cell. Classes keyed off <html data-theme>
 * show one at a time; the bouncy ease makes the swap feel hand-made.
 * (Written out in full so Tailwind can find them when scanning.)
 */
const ICON =
  "col-start-1 row-start-1 grid transition-[opacity,rotate,scale] duration-450 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-opacity motion-reduce:duration-150";

/**
 * Sun in light mode, moon in dark mode. Both icons are always rendered and
 * CSS (keyed off <html data-theme>) shows the right one, so the icon is
 * correct from the very first paint, before React hydrates.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const reduced = useReducedMotionSafe();
  const { rustle } = useSound();
  const dark = theme === "dark";

  useEffect(() => followSystemTheme(), []);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setTheme(
      dark ? "light" : "dark",
      { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      reduced,
    );
    rustle();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={dark}
      aria-label="Dark mode"
      title={
        dark ? "Switch to light (notebook)" : "Switch to dark (chalkboard)"
      }
      className="shrink-0"
    >
      <SketchBox
        seed="theme"
        shape="ellipse"
        className="relative grid size-10 place-items-center sm:size-12"
        inset={2}
      >
        {/* Sun in light mode. In dark mode it spins away and fades out. */}
        <span
          className={`${ICON} [:root[data-theme=dark]_&]:scale-40 [:root[data-theme=dark]_&]:-rotate-90 [:root[data-theme=dark]_&]:opacity-0`}
        >
          <DoodleIcon name="sun" size={26} fill={crayon.yellow} seed={41} />
        </span>
        {/* Moon in dark mode; hidden (rotated, shrunk, transparent) in light. */}
        <span
          className={`${ICON} scale-40 -rotate-90 opacity-0 [:root[data-theme=dark]_&]:scale-100 [:root[data-theme=dark]_&]:rotate-0 [:root[data-theme=dark]_&]:opacity-100`}
        >
          <DoodleIcon name="moon" size={24} fill={crayon.yellow} seed={42} />
        </span>
      </SketchBox>
    </button>
  );
}
