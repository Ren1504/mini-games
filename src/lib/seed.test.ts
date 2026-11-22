import { describe, expect, it } from "vitest";
import { sketch } from "./rough";
import { roughSeed, seededRange } from "./seed";

describe("hydration-safe sketch output", () => {
  it("rounds every coordinate to at most 2 decimals", () => {
    const shapes = [
      sketch.circle(1110, 36, 20, { seed: 55, fill: "#E4572E" }),
      sketch.ellipse(50, 50, 80, 40, { seed: 7 }),
      sketch.path("M0 0 C10 20 30 40 50 10", { seed: 3 }),
    ];
    for (const paths of shapes) {
      for (const p of paths) expect(p.d).not.toMatch(/\d\.\d{3,}/);
    }
  });
});

describe("seeded randomness", () => {
  it("is deterministic per seed and stays in range", () => {
    expect(seededRange("snake:tilt", -2.5, 2.5)).toBe(
      seededRange("snake:tilt", -2.5, 2.5),
    );
    for (const s of ["a", "b", "chess", "2048"]) {
      const v = seededRange(s, -2.5, 2.5);
      expect(v).toBeGreaterThanOrEqual(-2.5);
      expect(v).toBeLessThanOrEqual(2.5);
    }
    expect(roughSeed("x")).toBeGreaterThan(0);
  });

  it("produces identical rough.js paths for the same seed (no hydration drift)", () => {
    const a = sketch.rect(0, 0, 120, 80, { seed: 42, fill: "#f00" });
    sketch.rect(0, 0, 120, 80, { seed: 43 });
    const b = sketch.rect(0, 0, 120, 80, { seed: 42, fill: "#f00" });
    expect(b).toBe(a);
    expect(a.length).toBeGreaterThan(0);
  });
});
