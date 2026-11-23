import { describe, expect, it } from "vitest";
import { initialState, reduce, hintRevealsWord } from "@/shared/game-machine";
import type { RoomState, WordCategory } from "@/shared/model";
import { IMPOSTER_WORDS } from "./imposter-words";

const CATEGORIES: WordCategory[] = [
  "Celebrity",
  "Movie",
  "TV Series",
  "Brand",
  "Place",
  "Food",
  "Animal",
  "Object",
  "Sport",
  "Character",
];

const count = (c: WordCategory) =>
  IMPOSTER_WORDS.filter((w) => w.category === c).length;
const key = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

describe("imposter word bank", () => {
  it("has at least 200 words", () => {
    expect(IMPOSTER_WORDS.length).toBeGreaterThanOrEqual(200);
  });

  it("has no duplicate ids or words (ignoring case and accents)", () => {
    expect(new Set(IMPOSTER_WORDS.map((w) => w.id)).size).toBe(
      IMPOSTER_WORDS.length,
    );
    const words = IMPOSTER_WORDS.map((w) => key(w.word));
    const dupes = words.filter((w, i) => words.indexOf(w) !== i);
    expect(dupes).toEqual([]);
  });

  it("roughly follows the brief's split (~40 / ~40 / ~30 / rest)", () => {
    expect(count("Celebrity")).toBeGreaterThanOrEqual(35);
    expect(count("Movie")).toBeGreaterThanOrEqual(35);
    expect(count("TV Series")).toBeGreaterThanOrEqual(25);
    const others =
      IMPOSTER_WORDS.length -
      count("Celebrity") -
      count("Movie") -
      count("TV Series");
    expect(others).toBeGreaterThanOrEqual(90);
    for (const c of CATEGORIES) expect(count(c), c).toBeGreaterThan(0);
  });

  it("gives every word a 1–2 word clue that doesn't give the word away", () => {
    for (const w of IMPOSTER_WORDS) {
      const words = w.imposterClue.trim().split(/\s+/);
      expect(
        words.length,
        `${w.word} → "${w.imposterClue}"`,
      ).toBeLessThanOrEqual(2);
      expect(w.imposterClue.trim().length, w.word).toBeGreaterThan(0);
      expect(
        hintRevealsWord(w.imposterClue, w.word),
        `${w.word} → "${w.imposterClue}"`,
      ).toBe(false);
      expect(key(w.imposterClue), w.word).not.toBe(key(w.category));
    }
  });

  it("uses valid ids and difficulties", () => {
    for (const w of IMPOSTER_WORDS) {
      expect(w.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect([1, 2, 3]).toContain(w.difficulty);
      expect(CATEGORIES).toContain(w.category);
    }
    // Every tier is represented, mostly easy.
    for (const d of [1, 2, 3] as const) {
      expect(IMPOSTER_WORDS.some((w) => w.difficulty === d)).toBe(true);
    }
  });

  it("picks easy words most often (~60% / 30% / 10%)", () => {
    // Deterministic PRNG so the test is stable.
    let seed = 42;
    const random = () =>
      (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
    const tally = { 1: 0, 2: 0, 3: 0 };
    const rounds = 3000;
    for (let i = 0; i < rounds; i++) {
      let s: RoomState = initialState("AB2CD");
      const ctx = { now: 0, random, words: IMPOSTER_WORDS };
      const join = (
        id: string,
        name: string,
        mode: "host" | "join",
        avatar: "cat" | "dog" | "owl",
      ) => {
        s = reduce(
          s,
          {
            type: "JOIN",
            connId: id,
            message: { type: "JOIN", mode, name, avatar },
            newSeatId: id,
            newToken: `${id}-token-xxxxxxxxxxxx`,
          },
          ctx,
        ).state;
      };
      join("a", "Ann", "host", "cat");
      join("b", "Bob", "join", "dog");
      join("c", "Cid", "join", "owl");
      s = reduce(
        s,
        {
          type: "INTENT",
          connId: "a",
          seatId: "a",
          message: { type: "START" },
        },
        ctx,
      ).state;
      tally[s.round!.secret.difficulty!] += 1;
    }
    expect(tally[1] / rounds).toBeGreaterThan(0.55);
    expect(tally[1] / rounds).toBeLessThan(0.65);
    expect(tally[2] / rounds).toBeGreaterThan(0.25);
    expect(tally[2] / rounds).toBeLessThan(0.35);
    expect(tally[3] / rounds).toBeGreaterThan(0.06);
    expect(tally[3] / rounds).toBeLessThan(0.14);
  });
});
