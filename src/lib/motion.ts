import type { Transition, Variants } from "motion/react";

/*
 * Motion tokens. Components import from here; nothing hard-codes timing.
 * Rule: only transform, opacity, pathLength (stroke-dashoffset) and
 * clip-path are animated.
 */

// ── Springs & easing ────────────────────────────────────────────────
/** Default: bouncy, kid-like. */
export const spring = {
  type: "spring",
  stiffness: 260,
  damping: 18,
  mass: 0.8,
} as const satisfies Transition;

/** Large surfaces (modal paper, page). */
export const softSpring = {
  type: "spring",
  stiffness: 140,
  damping: 20,
} as const satisfies Transition;

/** easeInOutCubic, for strokes being drawn. */
export const strokeEase = [0.65, 0, 0.35, 1] as const;

// ── Durations (seconds) ─────────────────────────────────────────────
export const duration = {
  paperFade: 0.2,
  rules: 0.4,
  strokeShort: 0.5,
  stroke: 0.7,
  strokeLong: 0.9,
  logoUnderline: 0.6,
  hover: 0.2,
  press: 0.09,
  erase: 0.22,
  scribbleFill: 0.25,
  burst: 0.4,
  heart: 0.3,
  wobble: 0.12,
  pageTurn: 0.45,
  /** Replacement fade when prefers-reduced-motion is on. */
  reduced: 0.15,
  sunTurn: 60,
} as const;

// ── Load sequence (seconds from first paint) ────────────────────────
export const timeline = {
  paper: 0,
  rules: 0,
  logo: 0.3,
  logoUnderline: 0.6,
  tabs: 0.8,
  cards: 1.0,
  /** Hero "play" circle and other notes, after the letters settle. */
  annotations: 1.1,
} as const;

export const stagger = {
  logoLetter: 0.04,
  tabs: 0.05,
  cards: 0.06,
  /** Cards scrolled into view after the intro only stagger across a row. */
  rowCard: 0.05,
} as const;

// ── Effects ─────────────────────────────────────────────────────────
export const boil = { intervalMs: 120, frames: 3 } as const;
export const typewriter = { charMs: 60, startDelayMs: 900 } as const;
export const blink = { minMs: 3000, maxMs: 6000, closedMs: 140 } as const;
export const wave = { everyMs: 5200 } as const;
export const parallax = { slow: 0.1, mid: 0.2, fast: 0.3 } as const;

export const lift = { y: -6, scale: 1.03, straighten: 0.15 } as const;
export const press = { scale: 0.96, y: 2 } as const;
export const cardDrop = { y: -30, tilt: 10, scale: 1.05 } as const;
/** Tape lands this long after its card starts falling (fall ≈ 0.3s + 120ms). */
export const tapeAfterCard = 0.42;
export const pageTurn = {
  rotateY: -8,
  perspective: 1200,
  scale: 0.98,
} as const;
export const letterPop = { scale: 0.6, rotate: 8 } as const;

// ── Intro clock ─────────────────────────────────────────────────────
/**
 * Captured when this module first evaluates in the browser (≈ hydration).
 * Delays are computed against it so content that mounts late (lazy cards,
 * filtered results) doesn't wait for a load sequence that already played.
 */
const isBrowser = typeof window !== "undefined";
const introStart = isBrowser ? performance.now() : 0;

/**
 * Remaining delay before `at` seconds into the intro (0 if already past).
 * On the server the intro hasn't started yet, so SSR markup always matches
 * the hydration pass.
 */
export function introDelay(at: number): number {
  if (!isBrowser) return at;
  const elapsed = (performance.now() - introStart) / 1000;
  return Math.max(0, at - elapsed);
}

export function introFinished(): boolean {
  return introDelay(timeline.cards + 0.6) === 0;
}

// ── Variants ────────────────────────────────────────────────────────
export type CardCustom = {
  /** Resting tilt in degrees (seeded per game). */
  rotate: number;
  /** Position in reading order. */
  index: number;
  /** Column count, for row-only stagger after the intro. */
  columns: number;
  /** "drop" during the load sequence, "sketch" for later mounts. */
  mode: "drop" | "sketch";
  reduced: boolean;
  /** True once the card has played its entrance; hover returns have no delay. */
  settled: boolean;
};

function entranceDelay(c: CardCustom): number {
  if (c.mode === "drop") {
    return introDelay(timeline.cards + c.index * stagger.cards);
  }
  return (c.index % Math.max(1, c.columns)) * stagger.rowCard;
}

/** Wipe region: oversized so tape and shadow outside the card are not clipped. */
const CLIP_FULL = "inset(-25% -25% -25% -25%)";
const CLIP_ERASED = "inset(-25% -25% -25% 125%)";

export const cardVariants: Variants = {
  hidden: (c: CardCustom) =>
    c.reduced
      ? { opacity: 0, clipPath: CLIP_FULL }
      : c.mode === "drop"
        ? {
            opacity: 0,
            y: cardDrop.y,
            rotate:
              c.rotate + (c.index % 2 === 0 ? -cardDrop.tilt : cardDrop.tilt),
            scale: cardDrop.scale,
            clipPath: CLIP_FULL,
          }
        : {
            opacity: 0,
            y: 0,
            rotate: c.rotate,
            scale: 0.98,
            clipPath: CLIP_FULL,
          },
  shown: (c: CardCustom) => ({
    opacity: 1,
    y: 0,
    rotate: c.rotate,
    scale: 1,
    clipPath: CLIP_FULL,
    transition: c.reduced
      ? { duration: duration.reduced, delay: c.settled ? 0 : entranceDelay(c) }
      : {
          ...spring,
          delay: c.settled ? 0 : entranceDelay(c),
          opacity: { duration: 0.18, delay: c.settled ? 0 : entranceDelay(c) },
        },
  }),
  hover: (c: CardCustom) =>
    c.reduced
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: lift.y,
          scale: lift.scale,
          rotate: c.rotate * lift.straighten,
          transition: spring,
        },
  tap: (c: CardCustom) =>
    c.reduced
      ? {}
      : {
          scale: press.scale,
          y: press.y,
          transition: { duration: duration.press },
        },
  erased: {
    opacity: 0,
    clipPath: CLIP_ERASED,
    transition: { duration: duration.erase, ease: "easeIn" },
  },
};

/** Hover-driven idle animations inside thumbnails inherit these labels. */
export const thumbLabels = { rest: "shown", active: "hover" } as const;

/** Scribble fill sweeping in from the left on button hover. */
export const scribbleIn: Variants = {
  rest: {
    clipPath: "inset(0% 100% 0% 0%)",
    transition: { duration: duration.scribbleFill },
  },
  hover: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: duration.scribbleFill },
  },
  tap: { clipPath: "inset(0% 0% 0% 0%)" },
};

export const buttonPress: Variants = {
  rest: { scale: 1, y: 0, transition: spring },
  hover: { scale: 1.02, y: -1, transition: spring },
  tap: {
    scale: press.scale,
    y: press.y,
    transition: { duration: duration.press },
  },
};
