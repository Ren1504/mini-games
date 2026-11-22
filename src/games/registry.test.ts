import { describe, expect, it } from "vitest";
import { games, getGame } from "./registry";

describe("game registry", () => {
  it("has unique slugs", () => {
    const slugs = games.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs", () => {
    for (const { slug } of games) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("looks games up by slug", () => {
    expect(getGame("coin-flip")?.title).toBe("Coin Flip");
    expect(getGame("does-not-exist")).toBeUndefined();
  });
});
