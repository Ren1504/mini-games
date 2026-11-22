import { coinFlip } from "./coin-flip";
import type { Game } from "./types";

/**
 * Every playable game. To add one, create src/games/<slug>/index.ts
 * exporting a Game, then add it to this list.
 */
export const games: readonly Game[] = [coinFlip];

export function getGame(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}
