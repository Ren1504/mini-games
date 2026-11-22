"use client";

import { useAnimate } from "motion/react";
import { useRef, type FormEvent } from "react";
import { HandwrittenTypewriter } from "@/components/fx/HandwrittenTypewriter";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import { useHubParams } from "@/hooks/useHubParams";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { duration } from "@/lib/motion";

const PLACEHOLDER = "search for snake, chess, memory...";
const PLACEHOLDER_SHORT = "try snake, chess...";

/** Wobbly hand-drawn search box. Every keystroke nudges it a little. */
export function SearchBar() {
  const { filters, update } = useHubParams();
  // Phones get a shorter typed hint so it fits inside the box.
  const wide = useMediaQuery("(min-width: 480px)");
  const reduced = useReducedMotionSafe();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const flip = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const wobble = () => {
    if (reduced || !scope.current) return;
    flip.current *= -1;
    void animate(
      scope.current,
      { rotate: [0, 0.5 * flip.current, 0] },
      { duration: duration.wobble },
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    document.getElementById("games")?.scrollIntoView();
  };

  return (
    <form role="search" onSubmit={onSubmit} className="w-full max-w-xl">
      <label htmlFor="game-search" className="sr-only">
        Search games
      </label>
      <div ref={scope}>
        <SketchBox
          seed="search"
          strokeWidth={2.4}
          roughness={1.4}
          className="flex min-h-14 items-center gap-3 px-4"
        >
          <DoodleIcon
            name="magnifier"
            size={28}
            className="shrink-0 text-graphite"
          />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              id="game-search"
              type="search"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="search-hint"
              value={filters.q}
              onChange={(e) => {
                update({ q: e.target.value }, "replace");
                wobble();
              }}
              className="w-full bg-transparent py-3 font-body text-xl text-graphite outline-none"
            />
            {!filters.q && (
              <span className="pointer-events-none absolute inset-0 flex items-center overflow-hidden [mask-image:linear-gradient(to_right,black_85%,transparent)] font-body text-xl whitespace-nowrap text-sketch">
                <HandwrittenTypewriter
                  text={wide ? PLACEHOLDER : PLACEHOLDER_SHORT}
                />
              </span>
            )}
          </div>
          {filters.q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                update({ q: "" }, "replace");
                inputRef.current?.focus();
              }}
              className="grid size-10 shrink-0 place-items-center"
            >
              <DoodleIcon name="close" size={22} />
            </button>
          )}
        </SketchBox>
      </div>
      <span id="search-hint" className="sr-only">
        Try snake, chess or memory. Results update as you type.
      </span>
    </form>
  );
}
