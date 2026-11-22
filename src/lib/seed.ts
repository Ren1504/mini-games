/**
 * Deterministic randomness. Every "random" visual value (card tilt, tape
 * color, letter jitter) comes from a string seed, so the server and the
 * client render identical markup and nothing shifts between renders.
 */

/** 32-bit string hash (cyrb53, truncated). */
export function hash(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** Small fast PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng(seed: string): () => number {
  return mulberry32(hash(seed));
}

/** Rounded to 2 decimals so server and client stringify identically. */
export function seededRange(seed: string, min: number, max: number): number {
  return Math.round((min + rng(seed)() * (max - min)) * 100) / 100;
}

export function seededPick<T>(seed: string, items: readonly T[]): T {
  return items[Math.floor(rng(seed)() * items.length)];
}

/** rough.js wants a positive integer seed; 0 would mean Math.random. */
export function roughSeed(seed: string): number {
  return (hash(seed) % 2_000_000_000) + 1;
}
