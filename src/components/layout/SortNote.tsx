"use client";

import type { ReactNode } from "react";
import { StickyNote } from "@/components/paper/StickyNote";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import type { Difficulty } from "@/data/games";
import { useHubParams } from "@/hooks/useHubParams";
import { sortOptions } from "@/lib/filter-games";
import { crayon, ink } from "@/lib/palette";

const DIFFICULTY: ReadonlyArray<{ value: Difficulty | null; label: string }> = [
  { value: null, label: "Any" },
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

/** Hand-drawn check box; the real input stays native for keyboard and screen readers. */
function Choice({
  type,
  name,
  checked,
  onChange,
  seed,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  seed: string;
  children: ReactNode;
}) {
  return (
    <label
      data-focus-ring
      className="flex min-h-10 items-center gap-2.5 py-0.5 text-lg"
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <SketchBox
        as="span"
        seed={seed}
        shape={type === "radio" ? "ellipse" : "rect"}
        strokeWidth={1.8}
        inset={2}
        className="grid size-7 shrink-0 place-items-center"
      >
        {checked && (
          <DoodleIcon
            name="check"
            size={20}
            color={crayon.red}
            strokeWidth={2.6}
          />
        )}
      </SketchBox>
      <span className="flex items-center gap-1">{children}</span>
    </label>
  );
}

/** Sort + difficulty + favorites filters, on a sticky note stuck to the page. */
export function SortNote() {
  const { filters, update } = useHubParams();

  return (
    <StickyNote
      as="aside"
      rotate={1.8}
      aria-labelledby="sort-note-title"
      className="w-full max-w-xs sm:max-w-md"
    >
      <h2 id="sort-note-title" className="sr-only">
        Sort and filter
      </h2>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
        <fieldset>
          <legend className="font-note text-2xl font-bold">Sort by</legend>
          <div className="mt-1 flex flex-col">
            {sortOptions.map((o) => (
              <Choice
                key={o.id}
                type="radio"
                name="sort"
                seed={`sort-${o.id}`}
                checked={filters.sort === o.id}
                onChange={() => update({ sort: o.id })}
              >
                {o.label}
              </Choice>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-note text-2xl font-bold">Difficulty</legend>
          <div className="mt-1 grid grid-cols-2 gap-x-2">
            {DIFFICULTY.map((d) => (
              <Choice
                key={d.label}
                type="radio"
                name="difficulty"
                seed={`diff-${d.label}`}
                checked={filters.difficulty === d.value}
                onChange={() => update({ difficulty: d.value })}
              >
                {d.value === null ? (
                  "Any"
                ) : (
                  <>
                    <span className="sr-only">{d.label}</span>
                    {Array.from({ length: d.value }, (_, i) => (
                      <DoodleIcon
                        key={i}
                        name="star"
                        size={18}
                        fill={crayon.yellow}
                        color={ink.graphite}
                        seed={i + 1}
                      />
                    ))}
                  </>
                )}
              </Choice>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-3">
        <Choice
          type="checkbox"
          name="favorites"
          seed="fav-only"
          checked={filters.favoritesOnly}
          onChange={() => update({ favoritesOnly: !filters.favoritesOnly })}
        >
          Only my{" "}
          <DoodleIcon
            name="heart"
            size={18}
            fill={crayon.red}
            color={ink.graphite}
          />{" "}
          favorites
        </Choice>
      </div>
    </StickyNote>
  );
}
