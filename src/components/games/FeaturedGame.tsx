"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useSound } from "@/components/fx/Sound";
import { layoutIdFor, useModalState } from "@/components/layout/ModalState";
import { Paperclip } from "@/components/paper/Paperclip";
import { Tape } from "@/components/paper/Tape";
import { HandLettered } from "@/components/sketch/HandLettered";
import { RPath } from "@/components/sketch/Rough";
import { SketchBox } from "@/components/sketch/SketchBox";
import { SketchButton } from "@/components/sketch/SketchButton";
import { getFeaturedGame } from "@/data/games";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { formatPlays } from "@/lib/filter-games";
import { duration, introDelay, softSpring, timeline } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import { FavoriteButton } from "./FavoriteButton";
import { CategoryTag, DifficultyStars, Minutes, Players } from "./GameMeta";
import { GameThumbnail } from "./Thumbnails";

function TryThisNote() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-6 -left-4 hidden -translate-x-full 2xl:block"
    >
      <p className="-rotate-12 font-note text-3xl">try this one!</p>
      <svg viewBox="0 0 120 70" className="ml-10 h-16 w-28 overflow-visible">
        <RPath
          d="M6 8 C30 50 70 60 108 48"
          seed={301}
          strokeWidth={2.2}
          draw
          inView
          delay={0.4}
        />
        <RPath
          d="M94 36 L110 48 L92 58"
          seed={302}
          strokeWidth={2.2}
          draw
          inView
          delay={1.1}
          drawDuration={0.3}
        />
      </svg>
    </div>
  );
}

export function FeaturedGame() {
  const game = getFeaturedGame();
  const reduced = useReducedMotionSafe();
  const { open: modalOpen, setOrigin } = useModalState();
  const { rustle } = useSound();
  const [pointerOver, setHovered] = useState(false);
  // Same as GameCard: the modal hides the pointer leaving, so drop hover
  // when it opens instead of animating forever.
  const [sawModalOpen, setSawModalOpen] = useState(modalOpen);
  if (modalOpen !== sawModalOpen) {
    setSawModalOpen(modalOpen);
    if (modalOpen) setHovered(false);
  }
  const hovered = pointerOver && !modalOpen;

  return (
    <section
      aria-labelledby="featured-title"
      className="relative mx-auto max-w-7xl"
    >
      <TryThisNote />
      <motion.div
        layoutId={layoutIdFor("featured", game.slug)}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -24, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -0.8 }}
        transition={
          reduced
            ? { duration: duration.reduced }
            : { ...softSpring, delay: introDelay(timeline.cards - 0.15) }
        }
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className="relative"
      >
        <article data-focus-ring>
          <SketchBox
            seed="featured"
            fill={ink.card}
            fillStyle="solid"
            strokeWidth={2.6}
            shadow={hovered ? "lifted" : "rest"}
            boil={hovered}
            className="grid gap-6 p-5 pt-8 sm:p-8 md:grid-cols-[1.15fr_1fr] md:items-center"
          >
            <SketchBox
              seed="featured-thumb"
              fill={crayon.yellow}
              hachureGap={9}
              fillWeight={1.2}
              strokeWidth={1.6}
              className="p-4"
            >
              <GameThumbnail
                name={game.thumbnail}
                state={hovered ? "hover" : "shown"}
                className="aspect-[16/11] w-full"
              />
            </SketchBox>
            <div className="flex flex-col items-start gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="-rotate-6 font-note text-2xl font-bold text-graphite">
                  ★ featured
                </span>
                <CategoryTag category={game.category} seed="featured" />
              </div>
              <div className="flex w-full items-start justify-between gap-3">
                <h2
                  id="featured-title"
                  className="font-hand text-4xl leading-tight sm:text-5xl"
                >
                  <Link
                    href={`/games/${game.slug}`}
                    onClick={() => {
                      setOrigin("featured");
                      rustle();
                    }}
                    className="outline-none"
                  >
                    <HandLettered text={game.title} seed="featured-title" />
                  </Link>
                </h2>
                <FavoriteButton slug={game.slug} title={game.title} size={38} />
              </div>
              <p className="text-xl">{game.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <DifficultyStars level={game.difficulty} />
                <Players players={game.players} />
                <Minutes minutes={game.avgMinutes} />
                <span className="text-lg">{formatPlays(game.plays)} plays</span>
              </div>
              <SketchButton
                seed="featured-play"
                href={`/games/${game.slug}/play`}
                filled
                color="orange"
                size="lg"
                className="mt-2"
              >
                PLAY ▶
              </SketchButton>
            </div>
          </SketchBox>
        </article>
        <Paperclip className="pointer-events-none absolute -top-7 left-10 rotate-[8deg]" />
        <Tape
          seed="featured-tape"
          className="pointer-events-none absolute -top-3 right-10 rotate-[10deg]"
        />
      </motion.div>
    </section>
  );
}
