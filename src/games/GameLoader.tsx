"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

function Loading() {
  return (
    <p
      role="status"
      className="py-24 text-center font-note text-3xl text-sketch"
    >
      sharpening the pencils…
    </p>
  );
}

/**
 * One lazy loader per playable game. Each becomes its own JS chunk that is
 * downloaded only when that game's play page renders, so adding games
 * never makes the hub or other games heavier.
 * (next/dynamic only code-splits from a Client Component, hence this file.)
 */
export const gameLoaders: Record<string, ComponentType> = {
  "2048": dynamic(() => import("./2048/Game2048").then((m) => m.Game2048), {
    loading: Loading,
  }),
  chess: dynamic(
    () => import("./chess/ChessHostJoin").then((m) => m.ChessHostJoin),
    { loading: Loading },
  ),
  imposter: dynamic(
    () => import("./imposter/ImposterHostJoin").then((m) => m.ImposterHostJoin),
    { loading: Loading },
  ),
  "memory-match": dynamic(
    () => import("./memory-match/MemoryMatch").then((m) => m.MemoryMatch),
    { loading: Loading },
  ),
};

export function GameLoader({ slug }: { slug: string }) {
  const Game = gameLoaders[slug];
  return Game ? <Game /> : null;
}
