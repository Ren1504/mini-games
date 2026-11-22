"use client";

import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import {
  categoryColor,
  categoryLabel,
  type CategoryId,
  type Difficulty,
  type PlayerCount,
} from "@/data/games";
import { crayon, ink } from "@/lib/palette";

const DIFFICULTY_NAME = { 1: "Easy", 2: "Medium", 3: "Hard" } as const;

/** Category label on a crayon-hatched tag. Text stays graphite for contrast. */
export function CategoryTag({
  category,
  seed,
}: {
  category: CategoryId;
  seed: string;
}) {
  return (
    <SketchBox
      as="span"
      seed={`tag-${seed}`}
      fill={crayon[categoryColor[category]]}
      hachureGap={3.5}
      fillWeight={1.8}
      strokeWidth={1.4}
      inset={1}
      className="text-paper-halo inline-block px-2.5 py-0.5 text-lg leading-tight text-graphite"
    >
      {categoryLabel[category]}
    </SketchBox>
  );
}

export function DifficultyStars({ level }: { level: Difficulty }) {
  return (
    <span
      role="img"
      aria-label={`Difficulty: ${DIFFICULTY_NAME[level]}`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3].map((i) => (
        <DoodleIcon
          key={i}
          name="star"
          size={19}
          seed={i}
          color={i <= level ? ink.graphite : ink.sketch}
          fill={i <= level ? crayon.yellow : undefined}
          strokeWidth={i <= level ? 1.8 : 1.3}
        />
      ))}
    </span>
  );
}

export function Players({ players }: { players: readonly PlayerCount[] }) {
  const two = players.includes(2);
  const one = players.includes(1);
  const label = one && two ? "1 or 2 players" : two ? "2 players" : "1 player";
  const text = one && two ? "1–2P" : two ? "2P" : "1P";
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex items-center text-lg"
    >
      <DoodleIcon name="person" size={20} seed={3} />
      {two && <DoodleIcon name="person" size={20} seed={9} className="-ml-2" />}
      <span aria-hidden="true" className="ml-0.5">
        {text}
      </span>
    </span>
  );
}

export function Minutes({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-lg">
      <DoodleIcon name="clock" size={19} />
      <span>
        ~{minutes} min<span className="sr-only">utes</span>
      </span>
    </span>
  );
}
