import { describe, expect, it } from "vitest";
import { games } from "@/data/games";
import { parseHubParams, serializeHubParams } from "@/hooks/useHubParams";
import { DEFAULT_FILTERS, filterGames, formatPlays } from "./filter-games";

const none = new Set<string>();

describe("filterGames", () => {
  it("returns every game by default, most played first", () => {
    const list = filterGames(games, DEFAULT_FILTERS, none);
    expect(list).toHaveLength(games.length);
    for (let i = 1; i < list.length; i++)
      expect(list[i - 1].plays).toBeGreaterThanOrEqual(list[i].plays);
  });

  it("filters by category tab and by the 2-player tab", () => {
    expect(
      filterGames(games, { ...DEFAULT_FILTERS, tab: "puzzle" }, none).every(
        (g) => g.category === "puzzle",
      ),
    ).toBe(true);
    expect(
      filterGames(games, { ...DEFAULT_FILTERS, tab: "two-player" }, none).every(
        (g) => g.players.includes(2),
      ),
    ).toBe(true);
  });

  it("searches title, category and description case-insensitively", () => {
    expect(
      filterGames(games, { ...DEFAULT_FILTERS, q: "SNAKE" }, none).map(
        (g) => g.slug,
      ),
    ).toContain("snake");
    expect(
      filterGames(games, { ...DEFAULT_FILTERS, q: "zzzz" }, none),
    ).toHaveLength(0);
  });

  it("filters by difficulty and favorites", () => {
    expect(
      filterGames(games, { ...DEFAULT_FILTERS, difficulty: 3 }, none).every(
        (g) => g.difficulty === 3,
      ),
    ).toBe(true);
    const favs = new Set(["chess", "pong"]);
    expect(
      filterGames(games, { ...DEFAULT_FILTERS, favoritesOnly: true }, favs)
        .map((g) => g.slug)
        .sort(),
    ).toEqual(["chess", "pong"]);
  });

  it("sorts A–Z and newest first", () => {
    const az = filterGames(games, { ...DEFAULT_FILTERS, sort: "az" }, none).map(
      (g) => g.title,
    );
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b)));
    const newest = filterGames(
      games,
      { ...DEFAULT_FILTERS, sort: "newest" },
      none,
    );
    expect(newest[0].addedAt >= newest[1].addedAt).toBe(true);
  });
});

describe("hub URL params", () => {
  it("round-trips through the query string and drops defaults", () => {
    const f = {
      ...DEFAULT_FILTERS,
      q: "snake",
      tab: "arcade" as const,
      difficulty: 2 as const,
      favoritesOnly: true,
    };
    expect(parseHubParams(serializeHubParams(f))).toEqual(f);
    expect(serializeHubParams(DEFAULT_FILTERS)).toBe("");
  });

  it("ignores unknown values", () => {
    expect(parseHubParams("?tab=nope&sort=bogus&difficulty=7")).toEqual(
      DEFAULT_FILTERS,
    );
  });
});

describe("formatPlays", () => {
  it("abbreviates thousands", () => {
    expect(formatPlays(48210)).toBe("48.2k");
    expect(formatPlays(12000)).toBe("12k");
    expect(formatPlays(950)).toBe("950");
  });
});
