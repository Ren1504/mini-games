import { describe, expect, it } from "vitest";
import { games } from "@/data/games";
import { gameLoaders } from "./GameLoader";
import { playableSlugs } from "./playable";

describe("playable games", () => {
  it("has a lazy loader for every playable slug, and no extras", () => {
    expect(Object.keys(gameLoaders).sort()).toEqual([...playableSlugs].sort());
  });

  it("only lists games that exist in the catalog", () => {
    const slugs = new Set(games.map((g) => g.slug));
    for (const slug of playableSlugs) expect(slugs.has(slug), slug).toBe(true);
  });
});
