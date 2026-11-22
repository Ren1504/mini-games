"use client";

import { useCallback, useSyncExternalStore } from "react";
import { duration, strokeEase } from "@/lib/motion";

export type Theme = "light" | "dark";

export const THEME_KEY = "doodle-arcade:theme";
const EVENT = "doodle-arcade:theme-change";

/**
 * Runs inline in <head> before first paint: stored choice, else the
 * system setting. Keeps the page from flashing the wrong theme.
 */
export const themeInitScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t}catch(e){d.dataset.theme="light"}})();`;

function read(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

function storedTheme(): Theme | null {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : null;
  } catch {
    return null;
  }
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

/** Follow the OS setting live, until the visitor picks a theme themselves. */
export function followSystemTheme(): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (!storedTheme()) apply(mq.matches ? "dark" : "light");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useTheme() {
  // The server can't know the theme; hydrate as light, then correct.
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "light");

  /**
   * Switch theme. With an origin point (the toggle) and View Transitions
   * support, the new theme wipes in as a growing circle from there.
   */
  const setTheme = useCallback(
    (next: Theme, origin?: { x: number; y: number }, reduced = false) => {
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Storage blocked: the switch still applies for this visit.
      }
      if (
        reduced ||
        !origin ||
        typeof document.startViewTransition !== "function"
      ) {
        apply(next);
        return;
      }
      const transition = document.startViewTransition(() => apply(next));
      const radius = Math.hypot(
        Math.max(origin.x, window.innerWidth - origin.x),
        Math.max(origin.y, window.innerHeight - origin.y),
      );
      void transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: duration.themeWipe * 1000,
            easing: `cubic-bezier(${strokeEase.join(",")})`,
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    },
    [],
  );

  return { theme, setTheme };
}
