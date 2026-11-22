import { describe, expect, it } from "vitest";
import { thumbnailKeys } from "@/components/games/Thumbnails";
import { games, getFeaturedGame, getGame, tabs } from "./games";

describe("games data", () => {
  it("has at least 12 games", () => {
    expect(games.length).toBeGreaterThanOrEqual(12);
  });

  it("uses unique ids and URL-safe unique slugs", () => {
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
    expect(new Set(games.map((g) => g.slug)).size).toBe(games.length);
    for (const g of games) expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every game its own doodle thumbnail", () => {
    const used = games.map((g) => g.thumbnail);
    expect(new Set(used).size).toBe(games.length);
    for (const key of used) expect(thumbnailKeys).toContain(key);
  });

  it("has exactly one featured game", () => {
    expect(games.filter((g) => g.isFeatured)).toHaveLength(1);
    expect(getFeaturedGame().isFeatured).toBe(true);
  });

  it("has rules and controls for every game", () => {
    for (const g of games) {
      expect(g.howToPlay.length).toBeGreaterThan(0);
      expect(g.controls.length).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(g.addedAt))).toBe(false);
    }
  });

  it("has a non-empty tab for every category", () => {
    for (const t of tabs) {
      if (t.id === "all") continue;
      const hits = games.filter((g) =>
        t.id === "two-player"
          ? g.players.min <= 2 && g.players.max >= 2
          : g.category === t.id,
      );
      expect(hits.length, t.id).toBeGreaterThan(0);
    }
  });

  it("looks games up by slug", () => {
    expect(getGame("snake")?.title).toBe("Snake");
    expect(getGame("nope")).toBeUndefined();
  });
});
