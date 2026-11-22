import type { Game } from "../types";
import { CoinFlip } from "./coin-flip";

export const coinFlip: Game = {
  slug: "coin-flip",
  title: "Coin Flip",
  description: "Call heads or tails and keep your streak alive.",
  Component: CoinFlip,
};
