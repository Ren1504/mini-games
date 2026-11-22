"use client";

import { useEffect, type MouseEvent } from "react";
import { useSound } from "@/components/fx/Sound";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { followSystemTheme, useTheme } from "@/hooks/useTheme";
import { crayon } from "@/lib/palette";

/**
 * Sun in light mode, moon in dark mode. Both icons are always rendered and
 * CSS (keyed off <html data-theme>) shows the right one, so the icon is
 * correct from the very first paint, before React hydrates.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const reduced = useReducedMotionSafe();
  const { scratch } = useSound();
  const dark = theme === "dark";

  useEffect(() => followSystemTheme(), []);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setTheme(
      dark ? "light" : "dark",
      { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      reduced,
    );
    scratch();
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
        <span className="theme-icon theme-icon-sun">
          <DoodleIcon name="sun" size={26} fill={crayon.yellow} seed={41} />
        </span>
        <span className="theme-icon theme-icon-moon">
          <DoodleIcon name="moon" size={24} fill={crayon.yellow} seed={42} />
        </span>
      </SketchBox>
    </button>
  );
}
