import type { ComponentType } from "react";
import { Game2048 } from "./2048/Game2048";

/**
 * Games that are actually playable, by slug. /games/<slug>/play renders
 * the component here, and every other game shows "coming soon".
 * To ship a new game: build it under src/games/<slug>/ and add it below.
 */
export const playableGames: Partial<Record<string, ComponentType>> = {
  "2048": Game2048,
};
