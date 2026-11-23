"use client";

import type { MouseEvent } from "react";

/**
 * "Skip to content" for keyboard users.
 *
 * Next.js keeps recently visited pages mounted but hidden, so the page can
 * hold several <main id="main"> elements at once and "#main" may point at
 * an invisible one. This finds the main element that is actually visible
 * and moves focus there. Without JavaScript it still works as a plain link.
 */
export function SkipLink() {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = [...document.querySelectorAll<HTMLElement>("main")].find(
      (m) =>
        typeof m.checkVisibility === "function"
          ? m.checkVisibility()
          : m.offsetParent !== null,
    );
    if (!target) return;
    e.preventDefault();
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
    target.scrollIntoView({ block: "start" });
  };

  return (
    <a
      href="#main"
      onClick={onClick}
      className="sr-only z-50 font-hand text-xl focus:not-sr-only focus:absolute focus:top-3 focus:left-[calc(var(--margin-x)+1rem)] focus:bg-sticky focus:px-4 focus:py-2 focus:text-[#2b2b2b]"
    >
      Skip to content
    </a>
  );
}
