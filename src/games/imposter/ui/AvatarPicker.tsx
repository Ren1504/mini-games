"use client";

import { useId } from "react";
import { AVATAR_NAMES, DoodleAvatar } from "@/components/sketch/DoodleAvatar";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import { crayon, ink } from "@/lib/palette";
import { AVATARS, type AvatarId } from "@/shared/config";

/**
 * Grid of the 12 doodles as native radio buttons (keyboard + screen
 * reader friendly). Doodles other players already have are greyed out.
 */
export function AvatarPicker({
  value,
  taken,
  onChange,
  legend = "Pick your doodle",
}: {
  value: AvatarId;
  /** Doodles held by other players. */
  taken: readonly AvatarId[];
  onChange: (avatar: AvatarId) => void;
  legend?: string;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-hand text-2xl">{legend}</legend>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {AVATARS.map((a) => {
          const isTaken = a !== value && taken.includes(a);
          const checked = a === value;
          return (
            <label
              key={a}
              data-focus-ring
              className={`relative grid place-items-center ${isTaken ? "cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={a}
                checked={checked}
                disabled={isTaken}
                onChange={() => onChange(a)}
                className="peer sr-only"
              />
              <SketchBox
                as="span"
                seed={`pick-${a}`}
                stroke={checked ? ink.graphite : ink.sketch}
                strokeWidth={checked ? 2.6 : 1.3}
                fill={checked ? crayon.yellow : undefined}
                hachureGap={7}
                fillWeight={1.2}
                className="grid size-16 place-items-center sm:size-[4.5rem]"
              >
                <DoodleAvatar avatar={a} size={46} faded={isTaken} />
              </SketchBox>
              <span className="sr-only">
                {AVATAR_NAMES[a]}
                {isTaken ? " (taken)" : ""}
              </span>
              {checked && (
                <span className="absolute -top-1 -right-1" aria-hidden="true">
                  <DoodleIcon
                    name="check"
                    size={22}
                    color={crayon.red}
                    strokeWidth={2.8}
                  />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
