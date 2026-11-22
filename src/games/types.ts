import type { ComponentType } from "react";

export type GameMeta = {
  /** URL segment: /games/<slug>. Lowercase letters, digits and dashes. */
  slug: string;
  title: string;
  description: string;
};

export type Game = GameMeta & {
  /** Client component that renders the playable game. */
  Component: ComponentType;
};
