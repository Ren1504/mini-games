"use client";

import Link from "next/link";
import { useState } from "react";
import { DoodleIcon } from "@/components/sketch/DoodleIcon";
import { HandLettered } from "@/components/sketch/HandLettered";
import { RCircle } from "@/components/sketch/Rough";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { categoryColor, getGame } from "@/data/games";
import { formatPlays } from "@/lib/filter-games";
import { crayon, ink } from "@/lib/palette";
import { FavoriteButton } from "./FavoriteButton";
import { CategoryTag, DifficultyStars, Minutes, Players } from "./GameMeta";
import { GameThumbnail } from "./Thumbnails";

/** A keyboard key drawn as a little wobbly box. */
function Key({ label, seed }: { label: string; seed: string }) {
  const wide = label.length > 2;
  return (
    <SketchBox
      as="kbd"
      seed={seed}
      fill="var(--color-key)"
      fillStyle="solid"
      strokeWidth={1.8}
      shadow="rest"
      inset={1}
      className={`inline-grid min-h-10 place-items-center font-body text-lg ${wide ? "px-3" : "w-10"}`}
    >
      {label}
    </SketchBox>
  );
}

/**
 * Detail sheet for one game. Used inside the modal (onBack closes it) and
 * on the full /games/[slug] page (Back is a link to the hub).
 */
export function GameDetail({
  slug,
  onBack,
  titleId = "detail-title",
}: {
  slug: string;
  onBack?: () => void;
  titleId?: string;
}) {
  const game = getGame(slug);
  const [hovered, setHovered] = useState(false);
  if (!game) return null;
  const color = crayon[categoryColor[game.category]];

  const back = (
    <>
      <DoodleIcon name="back" size={22} />
      <span>Back to notebook</span>
    </>
  );

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_1.15fr] md:gap-10">
      <div className="flex flex-col gap-5">
        <SketchBox
          seed={`detail-thumb-${game.slug}`}
          fill={color}
          hachureGap={10}
          fillWeight={1.2}
          strokeWidth={2}
          className="p-5"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <GameThumbnail
            name={game.thumbnail}
            state={hovered ? "hover" : "shown"}
            className="aspect-[16/11] w-full"
          />
        </SketchBox>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <CategoryTag category={game.category} seed={`detail-${game.slug}`} />
          <DifficultyStars level={game.difficulty} />
          <Players players={game.players} />
          <Minutes minutes={game.avgMinutes} />
          <span className="text-lg">{formatPlays(game.plays)} plays</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <HandLettered
            as="h2"
            id={titleId}
            text={game.title}
            seed={`detail-${game.slug}`}
            className="font-hand text-5xl leading-tight sm:text-6xl"
          />
          <FavoriteButton slug={game.slug} title={game.title} size={38} />
        </div>
        <p className="text-xl">{game.description}</p>

        <section aria-labelledby={`${titleId}-how`}>
          <h3 id={`${titleId}-how`} className="font-note text-3xl font-bold">
            How to play
          </h3>
          <ol className="mt-3 flex flex-col gap-3">
            {game.howToPlay.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-xl">
                <span
                  aria-hidden="true"
                  className="relative grid size-9 shrink-0 place-items-center font-hand text-xl"
                >
                  <svg
                    viewBox="0 0 36 36"
                    className="absolute inset-0 overflow-visible"
                  >
                    <RCircle
                      cx={18}
                      cy={18}
                      d={32}
                      seed={400 + i}
                      stroke={ink.graphite}
                      strokeWidth={1.8}
                      fill={color}
                      fillStyle="hachure"
                      hachureGap={3.5}
                    />
                  </svg>
                  <span className="text-paper-halo relative">{i + 1}</span>
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby={`${titleId}-controls`}>
          <h3
            id={`${titleId}-controls`}
            className="font-note text-3xl font-bold"
          >
            Controls
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {game.controls.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-xl">
                {c.keys.map((k, j) => (
                  <Key key={j} label={k} seed={`${game.slug}-key-${i}-${j}`} />
                ))}
                <span className="ml-1">{c.action}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
          <SketchButton
            seed={`play-${game.slug}`}
            href={`/games/${game.slug}/play`}
            filled
            color="green"
            size="lg"
          >
            Play Now ▶
          </SketchButton>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-11 items-center gap-2 font-hand text-xl underline decoration-wavy decoration-2 underline-offset-4"
            >
              {back}
            </button>
          ) : (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 font-hand text-xl underline decoration-wavy decoration-2 underline-offset-4"
            >
              {back}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
