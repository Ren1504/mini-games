"use client";

import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { SketchBox } from "@/components/sketch/SketchBox";
import {
  categoryColor,
  categoryLabel,
  type CategoryId,
  type Difficulty,
  type PlayerRange,
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

/** Extra labels (e.g. "Multiplayer") as small pencil-outlined tags. */
export function TagBadges({
  tags,
  seed,
}: {
  tags?: readonly string[];
  seed: string;
}) {
  if (!tags?.length) return null;
  return (
    <>
      {tags.map((tag) => (
        <SketchBox
          key={tag}
          as="span"
          seed={`badge-${seed}-${tag}`}
          stroke={ink.sketch}
          strokeWidth={1.3}
          inset={1}
          className="inline-block px-2 py-0.5 text-lg leading-tight text-graphite"
        >
          {tag}
        </SketchBox>
      ))}
    </>
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

/** "1P", "1–2P", "3–12P" with one, two or three stick figures. */
export function Players({ players }: { players: PlayerRange }) {
  const { min, max } = players;
  const label =
    min === max
      ? `${min} ${min === 1 ? "player" : "players"}`
      : max - min === 1
        ? `${min} or ${max} players`
        : `${min} to ${max} players`;
  const text = min === max ? `${min}P` : `${min}–${max}P`;
  const figures = Math.min(max, 3);
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex items-center text-lg"
    >
      {[3, 9, 15].slice(0, figures).map((seed, i) => (
        <DoodleIcon
          key={seed}
          name="person"
          size={20}
          seed={seed}
          className={i > 0 ? "-ml-2" : undefined}
        />
      ))}
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
