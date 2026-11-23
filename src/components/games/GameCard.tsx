"use client";

import { motion, useInView } from "motion/react";
import Link from "next/link";
import { useRef, useState, type Ref } from "react";
import { useSound } from "@/components/fx/Sound";
import { layoutIdFor, useModalState } from "@/components/layout/ModalState";
import { Tape, tapeLook } from "@/components/paper/Tape";
import { SketchBox } from "@/components/sketch/SketchBox";
import type { Game } from "@/data/games";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { mergeRefs } from "@/lib/merge-refs";
import {
  cardVariants,
  duration,
  introDelay,
  introFinished,
  spring,
  stagger,
  tapeAfterCard,
  timeline,
  type CardCustom,
} from "@/lib/motion";
import { ink } from "@/lib/palette";
import { seededRange } from "@/lib/seed";
import { FavoriteButton } from "./FavoriteButton";
import {
  CategoryTag,
  DifficultyStars,
  Minutes,
  Players,
  TagBadges,
} from "./GameMeta";
import { GameThumbnail } from "./Thumbnails";

type Props = {
  game: Game;
  index: number;
  columns: number;
  /** AnimatePresence popLayout needs the DOM node. */
  ref?: Ref<HTMLLIElement>;
};

/** Resting tilt for a card, stable per game. */
export const cardTilt = (slug: string) =>
  seededRange(`${slug}:tilt`, -2.5, 2.5);

/**
 * A polaroid-ish game card taped to the page. Falls in during the load
 * sequence, gets sketched in after filtering, lifts and straightens on
 * hover, squashes on press, and grows into the detail modal on click.
 */
export function GameCard({ game, index, columns, ref }: Props) {
  const reduced = useReducedMotionSafe();
  const { open: modalOpen, setOrigin } = useModalState();
  const { rustle } = useSound();
  const own = useRef<HTMLLIElement>(null);
  const inView = useInView(own, { once: true, amount: 0.2 });
  const near = useInView(own, { once: true, margin: "300px 0px" });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [settled, setSettled] = useState(false);
  const [mode] = useState<CardCustom["mode"]>(() =>
    introFinished() ? "sketch" : "drop",
  );

  // The modal covers the card before it can see the pointer leave, so it
  // would stay "hovered" (and keep animating) after the modal closes.
  // Drop hover/focus whenever the modal opens (React's adjust-state-on-
  // change pattern, no effect needed).
  const [sawModalOpen, setSawModalOpen] = useState(modalOpen);
  if (modalOpen !== sawModalOpen) {
    setSawModalOpen(modalOpen);
    if (modalOpen) {
      setHovered(false);
      setFocused(false);
    }
  }

  const rotate = cardTilt(game.slug);
  const tape = tapeLook(game.slug);
  const active = !modalOpen && (hovered || focused);
  const custom: CardCustom = { rotate, index, columns, mode, reduced, settled };
  const entrance =
    mode === "drop"
      ? introDelay(timeline.cards + index * stagger.cards)
      : (index % Math.max(1, columns)) * stagger.rowCard;

  return (
    <motion.li
      ref={mergeRefs(own, ref)}
      layout="position"
      custom={custom}
      variants={cardVariants}
      initial="hidden"
      animate={!inView ? "hidden" : active ? "hover" : "shown"}
      exit="erased"
      whileTap="tap"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      // Only keyboard focus lifts the card; focus restored after closing the
      // modal (or from a mouse click) does not.
      onFocus={(e) =>
        setFocused((e.target as Element).matches(":focus-visible"))
      }
      onBlur={() => setFocused(false)}
      onAnimationComplete={(label) =>
        label === "shown" && !settled && setSettled(true)
      }
      className="relative list-none"
      style={{ willChange: active && !settled ? "transform" : undefined }}
    >
      <motion.div
        layoutId={layoutIdFor("card", game.slug)}
        transition={spring}
        className="relative"
      >
        <article aria-labelledby={`card-title-${game.slug}`} data-focus-ring>
          <SketchBox
            seed={`card-${game.slug}`}
            fill={ink.card}
            fillStyle="solid"
            boil={active}
            draw={inView && !settled}
            drawDelay={entrance}
            shadow={active ? "lifted" : "rest"}
            className="flex flex-col gap-3 px-4 pt-6 pb-4"
          >
            <div className="aspect-[16/11] w-full">
              {near && (
                <GameThumbnail name={game.thumbnail} className="size-full" />
              )}
            </div>
            <div className="flex items-start justify-between gap-2">
              <h3
                id={`card-title-${game.slug}`}
                className="pt-1 font-hand text-2xl leading-tight"
              >
                <Link
                  href={`/games/${game.slug}`}
                  data-card-link
                  onClick={() => {
                    setOrigin("card");
                    rustle();
                  }}
                  className="outline-none after:absolute after:inset-0 after:content-['']"
                >
                  {game.title}
                </Link>
              </h3>
              <FavoriteButton
                slug={game.slug}
                title={game.title}
                className="relative z-10 -mt-1 -mr-1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <CategoryTag category={game.category} seed={game.slug} />
              <TagBadges tags={game.tags} seed={game.slug} />
              <DifficultyStars level={game.difficulty} />
              <Players players={game.players} />
              <Minutes minutes={game.avgMinutes} />
            </div>
          </SketchBox>
        </article>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2"
          style={{ rotate: tape.rotate }}
          initial={{
            opacity: 0,
            scaleY: reduced ? 1 : 0.3,
            scaleX: reduced ? 1 : 1.2,
          }}
          animate={inView ? { opacity: 1, scaleY: 1, scaleX: 1 } : undefined}
          transition={
            reduced
              ? { duration: duration.reduced }
              : { ...spring, delay: settled ? 0 : entrance + tapeAfterCard }
          }
        >
          <Tape seed={game.slug} />
        </motion.div>
      </motion.div>
    </motion.li>
  );
}
