import { describe, expect, it } from "vitest";
import { sketch } from "./rough";
import { roughSeed, seededRange } from "./seed";

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
