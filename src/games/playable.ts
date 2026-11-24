/**
 * Slugs of games that are actually playable. /games/<slug>/play renders
 * the real game for these and "coming soon" for everything else.
 *
 * To ship a new game:
 *   1. Build it under src/games/<slug>/.
 *   2. Add its slug here.
 *   3. Add a lazy loader for it in src/games/GameLoader.tsx.
 * A test fails if 2 and 3 get out of sync.
 *
 * This file stays free of component imports on purpose: the play page
 * (a Server Component) reads it, and each game's code is loaded only on
 * that game's own play page (see GameLoader.tsx).
 */
export const playableSlugs: ReadonlySet<string> = new Set([
  "2048",
  "imposter",
  "memory-match",
]);

export function isPlayable(slug: string): boolean {
  return playableSlugs.has(slug);
}
