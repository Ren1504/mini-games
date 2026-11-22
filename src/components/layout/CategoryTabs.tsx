"use client";

import { motion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { useSound } from "@/components/fx/Sound";
import { SketchBox } from "@/components/sketch/SketchBox";
import { tabs, type TabId } from "@/data/games";
import { useHubParams } from "@/hooks/useHubParams";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration, introDelay, spring, stagger, timeline } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";

const colorOf = (c: (typeof tabs)[number]["color"]) =>
  c === "graphite" ? ink.sketch : crayon[c];

/**
 * Notebook divider tabs. The active one is pulled forward, colored in
 * with crayon hatching and line-boils; the rest are pencil outlines.
 * Arrow keys / Home / End move between tabs (selection follows focus).
 */
export function CategoryTabs() {
  const { filters, update } = useHubParams();
  const { rustle } = useSound();
  const reduced = useReducedMotionSafe();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (id: TabId) => {
    if (id === filters.tab) return;
    update({ tab: id });
    rustle();
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : e.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    select(tabs[next].id);
  };

  return (
    <div
      role="tablist"
      aria-label="Game categories"
      className="flex flex-wrap items-end gap-x-2 gap-y-3 sm:gap-x-3"
    >
      {tabs.map((tab, i) => {
        const active = tab.id === filters.tab;
        return (
          <motion.button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active}
            aria-controls="game-grid"
            tabIndex={active ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -36 }}
            animate={{
              opacity: 1,
              y: active ? -6 : 0,
              scale: active ? 1.06 : 1,
            }}
            whileHover={reduced ? undefined : { y: active ? -8 : -3 }}
            whileTap={reduced ? undefined : { scale: 0.95 }}
            transition={
              reduced
                ? { duration: duration.reduced }
                : {
                    ...spring,
                    delay: introDelay(timeline.tabs + i * stagger.tabs),
                  }
            }
            className={active ? "relative z-10" : "relative"}
          >
            <SketchBox
              as="span"
              seed={`tab-${tab.id}`}
              fill={active ? colorOf(tab.color) : undefined}
              fillWeight={tab.color === "graphite" ? 1.2 : 2.2}
              hachureGap={tab.color === "graphite" ? 7 : 4.5}
              stroke={active ? ink.graphite : ink.sketch}
              strokeWidth={active ? 2.4 : 1.8}
              boil={active}
              className="text-paper-halo block px-4 pt-2 pb-2.5 font-hand text-xl text-graphite sm:px-5 sm:text-2xl"
            >
              {tab.label}
            </SketchBox>
          </motion.button>
        );
      })}
    </div>
  );
}
