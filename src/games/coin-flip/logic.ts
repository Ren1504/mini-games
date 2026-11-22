export type Side = "heads" | "tails";

/** `random` returns a number in [0, 1); injectable for tests. */
export function flip(random: () => number = Math.random): Side {
  return random() < 0.5 ? "heads" : "tails";
}

export function nextStreak(streak: number, guess: Side, result: Side): number {
  return guess === result ? streak + 1 : 0;
}
