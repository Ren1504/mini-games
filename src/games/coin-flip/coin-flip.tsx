"use client";

import { useState } from "react";
import { flip, nextStreak, type Side } from "./logic";

export function CoinFlip() {
  const [result, setResult] = useState<Side | null>(null);
  const [lastGuess, setLastGuess] = useState<Side | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);

  function play(guess: Side) {
    const outcome = flip();
    const streakAfter = nextStreak(streak, guess, outcome);
    setLastGuess(guess);
    setResult(outcome);
    setStreak(streakAfter);
    setBest((b) => Math.max(b, streakAfter));
  }

  const won = result !== null && result === lastGuess;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-lg" aria-live="polite">
        {result === null
          ? "Make your call."
          : `It's ${result}. ${won ? "You win!" : "You lose."}`}
      </p>
      <div className="flex gap-3">
        {(["heads", "tails"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => play(side)}
            className="rounded-full bg-foreground px-6 py-2 font-medium text-background capitalize transition-opacity hover:opacity-80"
          >
            {side}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Streak: {streak} · Best: {best}
      </p>
    </div>
  );
}
