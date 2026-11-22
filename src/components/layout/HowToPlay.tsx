"use client";

import { HandLettered } from "@/components/sketch/HandLettered";
import { RCircle } from "@/components/sketch/Rough";
import { crayon, ink } from "@/lib/palette";

const STEPS = [
  {
    color: crayon.blue,
    text: "Flip through the notebook or search for a game you like.",
  },
  {
    color: crayon.yellow,
    text: "Tap a card to read the rules and see the controls.",
  },
  {
    color: crayon.green,
    text: "Hit Play Now. Tap the heart to keep a game in your favorites.",
  },
];

export function HowToPlay() {
  return (
    <section
      id="how-to-play"
      aria-labelledby="how-title"
      className="page-x mt-24 scroll-mt-8"
    >
      <div className="mx-auto max-w-7xl">
        <HandLettered
          as="h2"
          id="how-title"
          text="How to Play"
          seed="how"
          className="font-hand text-4xl sm:text-5xl"
        />
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="relative grid size-14 shrink-0 place-items-center font-hand text-3xl"
              >
                <svg
                  viewBox="0 0 56 56"
                  className="absolute inset-0 overflow-visible"
                >
                  <RCircle
                    cx={28}
                    cy={28}
                    d={48}
                    seed={100 + i}
                    stroke={ink.graphite}
                    strokeWidth={2}
                    fill={s.color}
                    fillStyle="hachure"
                    hachureGap={4}
                    draw
                    inView
                    delay={i * 0.15}
                  />
                </svg>
                <span className="text-paper-halo relative">{i + 1}</span>
              </span>
              <p className="pt-2 text-xl">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
