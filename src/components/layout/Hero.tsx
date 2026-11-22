"use client";

import { HandLettered } from "@/components/sketch/HandLettered";
import { RPath } from "@/components/sketch/Rough";
import { SketchCircle } from "@/components/sketch/SketchCircle";
import { timeline } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";
import { SearchBar } from "./SearchBar";

function NewThisWeekArrow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden w-56 shrink-0 md:block short:hidden"
    >
      <p className="ml-10 -rotate-6 font-note text-3xl text-graphite">
        new this week!
      </p>
      <svg
        viewBox="0 0 160 150"
        className="mt-1 ml-4 h-36 w-40 overflow-visible"
      >
        <RPath
          d="M70 8 C 125 20, 140 70, 95 95 C 70 110, 55 120, 52 142"
          seed={21}
          stroke={ink.graphite}
          strokeWidth={2.4}
          roughness={1.1}
          draw
          inView
          delay={0.2}
          drawDuration={0.9}
        />
        <RPath
          d="M38 126 L52 144 L66 128"
          seed={22}
          stroke={ink.graphite}
          strokeWidth={2.4}
          draw
          inView
          delay={1}
          drawDuration={0.3}
        />
      </svg>
    </div>
  );
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="page-x pt-10 sm:pt-14 short:pt-4"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between short:gap-4">
        <div className="flex max-w-3xl flex-col gap-6 short:gap-3">
          <h1
            id="hero-title"
            className="font-hand text-[2.6rem] leading-[1.15] sm:text-6xl lg:text-7xl short:text-[2.6rem]"
          >
            <HandLettered text="Pick a game &" seed="hero-1" />{" "}
            <HandLettered text="let's" seed="hero-2" />{" "}
            <SketchCircle
              delayMs={timeline.annotations * 1000}
              color={crayon.red}
            >
              <HandLettered text="play" seed="hero-3" />
            </SketchCircle>
            <HandLettered text="!" seed="hero-4" />
          </h1>
          <p className="max-w-xl font-note text-2xl leading-snug text-sketch sm:text-[1.7rem] short:text-xl">
            A notebook full of tiny games. Flip the pages, pick one, and play
            right here.
          </p>
          <SearchBar />
        </div>
        <NewThisWeekArrow />
      </div>
    </section>
  );
}
