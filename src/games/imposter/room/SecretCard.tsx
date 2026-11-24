"use client";

import { motion } from "motion/react";
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { HandLettered } from "@/components/sketch/HandLettered";
import { SketchBox } from "@/components/sketch/SketchBox";
import { useBoil } from "@/hooks/useBoil";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { duration } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import type { PrivateView } from "@/shared/protocol";

const TAP_KEY = "doodle-arcade:imposter:tap-to-flip";
const TAP_EVENT = "doodle-arcade:imposter:tap-to-flip";

function readTap() {
  try {
    return window.localStorage.getItem(TAP_KEY) === "1";
  } catch {
    return false;
  }
}
function subscribeTap(onChange: () => void) {
  window.addEventListener(TAP_EVENT, onChange);
  return () => window.removeEventListener(TAP_EVENT, onChange);
}
function setTap(on: boolean) {
  try {
    window.localStorage.setItem(TAP_KEY, on ? "1" : "0");
  } catch {
    // Storage blocked: the setting lasts for this page view only.
  }
  window.dispatchEvent(new Event(TAP_EVENT));
}

/** Card flip: 600ms spring (reduced motion: a quick crossfade instead). */
const FLIP = {
  type: "spring",
  stiffness: 170,
  damping: 20,
  mass: 0.9,
} as const;

/**
 * Your secret card. Face-down by default so people next to you can't
 * see it: hold it (or Space/Enter) to peek, or switch to tap-to-flip.
 */
export function SecretCard({
  card,
  compact = false,
}: {
  card: NonNullable<PrivateView["card"]>;
  compact?: boolean;
}) {
  const reduced = useReducedMotionSafe();
  const tapMode = useSyncExternalStore(subscribeTap, readTap, () => false);
  const [held, setHeld] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const up = tapMode ? flipped : held;
  const imposter = card.kind === "imposter";
  const frame = useBoil(up && imposter);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      if (tapMode) {
        if (!e.repeat) setFlipped((f) => !f);
      } else setHeld(true);
    },
    [tapMode],
  );
  const onKeyUp = (e: KeyboardEvent) => {
    if (!tapMode && (e.key === " " || e.key === "Enter")) setHeld(false);
  };

  const size = compact
    ? "h-56 w-44 sm:h-64 sm:w-48"
    : "h-80 w-60 sm:h-96 sm:w-72";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        aria-pressed={up}
        aria-label={
          tapMode
            ? "Tap to flip your secret card"
            : "Hold to peek at your secret card"
        }
        onPointerDown={(e) => {
          if (tapMode) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setHeld(true);
        }}
        onPointerUp={() => !tapMode && setHeld(false)}
        onPointerCancel={() => setHeld(false)}
        onLostPointerCapture={() => !tapMode && setHeld(false)}
        onClick={() => tapMode && setFlipped((f) => !f)}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => setHeld(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "relative touch-none select-none [perspective:1200px]",
          size,
        )}
      >
        <motion.div
          className="relative size-full [transform-style:preserve-3d]"
          initial={false}
          animate={reduced ? { rotateY: 0 } : { rotateY: up ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : FLIP}
        >
          {/* Face down */}
          <motion.div
            className="absolute inset-0 [backface-visibility:hidden]"
            animate={reduced ? { opacity: up ? 0 : 1 } : { opacity: 1 }}
            transition={{ duration: duration.reduced }}
          >
            <SketchBox
              seed="card-back"
              fill={crayon.blue}
              hachureGap={8}
              fillWeight={1.2}
              strokeWidth={2.6}
              shadow="rest"
              className="grid size-full place-items-center p-4 text-center"
            >
              <span
                className="text-paper-halo font-hand text-7xl text-graphite"
                aria-hidden="true"
              >
                ?
              </span>
              <span className="text-paper-halo font-hand text-2xl text-graphite">
                {tapMode ? "Tap to flip" : "Hold to peek"}
              </span>
            </SketchBox>
          </motion.div>

          {/* Face up */}
          <motion.div
            className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]"
            style={reduced ? { transform: "none" } : undefined}
            animate={reduced ? { opacity: up ? 1 : 0 } : { opacity: 1 }}
            transition={{ duration: duration.reduced }}
            aria-live="polite"
          >
            <SketchBox
              seed="card-front"
              fill={ink.card}
              fillStyle="solid"
              strokeWidth={2.6}
              shadow="rest"
              className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center"
            >
              {up &&
                (imposter ? (
                  <>
                    <span
                      className="font-hand text-5xl text-crayon-red sm:text-6xl"
                      style={{ filter: `url(#boil-${frame})` }}
                    >
                      IMPOSTER
                    </span>
                    <span className="text-xl">
                      Category:{" "}
                      <strong className="font-hand">{card.category}</strong>
                    </span>
                    <span className="text-xl">
                      Clue:{" "}
                      <strong className="font-hand text-2xl">
                        {card.clue}
                      </strong>
                    </span>
                    <span className="font-note text-lg text-sketch">
                      Blend in. Everyone sees this clue too, so don&apos;t just
                      repeat it!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-note text-xl text-sketch">
                      {card.category}
                    </span>
                    <HandLettered
                      text={card.word}
                      seed={`word-${card.word}`}
                      className="font-hand text-4xl leading-tight break-words sm:text-5xl"
                    />
                    <span className="text-lg">
                      Imposter&apos;s clue:{" "}
                      <strong className="font-hand text-xl">
                        {card.imposterClue}
                      </strong>
                    </span>
                    <span className="font-note text-lg text-sketch">
                      Hint at the word, don&apos;t say it. A hint that just
                      repeats the clue is suspicious!
                    </span>
                  </>
                ))}
            </SketchBox>
          </motion.div>
        </motion.div>
      </button>

      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-lg">
        <input
          type="checkbox"
          checked={tapMode}
          onChange={(e) => setTap(e.target.checked)}
          className="size-5 accent-crayon-blue"
        />
        Tap to flip instead of holding
      </label>
    </div>
  );
}
