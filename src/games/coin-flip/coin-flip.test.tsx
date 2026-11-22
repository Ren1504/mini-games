import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoinFlip } from "./coin-flip";
import { flip, nextStreak } from "./logic";

describe("coin flip logic", () => {
  it("maps random values to sides", () => {
    expect(flip(() => 0.1)).toBe("heads");
    expect(flip(() => 0.9)).toBe("tails");
  });

  it("grows the streak on a correct guess and resets otherwise", () => {
    expect(nextStreak(2, "heads", "heads")).toBe(3);
    expect(nextStreak(2, "heads", "tails")).toBe(0);
  });
});

describe("<CoinFlip />", () => {
  it("shows a result after a guess", () => {
    render(<CoinFlip />);
    fireEvent.click(screen.getByRole("button", { name: "heads" }));
    expect(screen.getByText(/It's (heads|tails)\./)).toBeDefined();
  });
});
