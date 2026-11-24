import { crayon, ink } from "@/lib/palette";

/**
 * One piece of a card symbol, drawn with rough.js on a 48×48 grid.
 * `fill` is a crayon hachure; `solid` fills it flat instead (spots, eyes,
 * holes). Parts without `fill` are pencil lines only.
 */
export type SymbolPart = {
  d: string;
  fill?: string;
  solid?: boolean;
  /** Line color; defaults to pencil graphite. */
  stroke?: string;
  /** Line width on the 48-grid; defaults to 2.2. */
  width?: number;
};

export type CardSymbol = {
  id: string;
  /** Spoken name, used in the card's accessible label. */
  name: string;
  parts: readonly SymbolPart[];
};

/** A circle as path data (rough.js turns the arcs into wobbly curves). */
const circ = (x: number, y: number, r: number) =>
  `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

const { red, blue, yellow, green, purple, orange, pink } = crayon;
const CARD = ink.card;
const PENCIL = ink.graphite;

/**
 * 32 symbols: enough for the biggest board (8×8 = 32 pairs). Every one is
 * a bold, simple shape with its own color mix, so two different symbols
 * can still be told apart on a ~38px phone card, by shape alone if need be.
 */
export const CARD_SYMBOLS: readonly CardSymbol[] = [
  // Sky and nature
  {
    id: "sun",
    name: "Sun",
    parts: [
      {
        d: "M24 4 L24 10 M24 38 L24 44 M4 24 L10 24 M38 24 L44 24 M10 10 L14 14 M34 34 L38 38 M10 38 L14 34 M34 14 L38 10",
        stroke: orange,
        width: 2.8,
      },
      { d: circ(24, 24, 10), fill: yellow },
    ],
  },
  {
    id: "moon",
    name: "Moon",
    parts: [
      {
        d: "M30 6 C18 7 9 15 9 26 C9 36 17 43 27 43 C33 43 38 40 41 35 C30 37 21 30 21 20 C21 14 25 9 30 6 Z",
        fill: purple,
      },
    ],
  },
  {
    id: "star",
    name: "Star",
    parts: [
      {
        d: "M24 5 L28.9 17.8 L42.6 18.5 L31.9 27.1 L35.5 40.4 L24 32.8 L12.5 40.4 L16.1 27.1 L5.4 18.5 L19.1 17.8 Z",
        fill: orange,
      },
    ],
  },
  {
    id: "cloud",
    name: "Cloud",
    parts: [
      {
        d: "M13 36 C6 36 4 29 8 26 C7 19 14 15 19 18 C21 10 33 10 35 18 C41 17 45 24 42 29 C45 33 41 37 36 36 Z",
        fill: blue,
      },
    ],
  },
  {
    id: "lightning",
    name: "Lightning bolt",
    parts: [{ d: "M28 3 L11 27 L22 27 L18 45 L37 19 L26 19 L32 3 Z", fill: yellow }],
  },
  {
    id: "raindrop",
    name: "Raindrop",
    parts: [
      {
        d: "M24 4 C24 4 10 21 10 30 C10 38 16 44 24 44 C32 44 38 38 38 30 C38 21 24 4 24 4 Z",
        fill: blue,
      },
      { d: "M17 31 C17 35 19 37 22 38", width: 1.8 },
    ],
  },
  {
    id: "snowflake",
    name: "Snowflake",
    parts: [
      {
        d: "M24 5 L24 43 M7.5 14.5 L40.5 33.5 M7.5 33.5 L40.5 14.5 M19 8 L24 13 L29 8 M19 40 L24 35 L29 40 M37.1 10.7 L35.3 17.5 L42.1 19.3 M42.1 28.7 L35.3 30.5 L37.1 37.3 M5.9 28.7 L12.7 30.5 L10.9 37.3 M10.9 10.7 L12.7 17.5 L5.9 19.3",
        stroke: blue,
        width: 3,
      },
    ],
  },
  {
    id: "flower",
    name: "Flower",
    parts: [
      { d: circ(24, 12, 7.5), fill: pink },
      { d: circ(34.5, 19.6, 7.5), fill: pink },
      { d: circ(30.5, 32, 7.5), fill: pink },
      { d: circ(17.5, 32, 7.5), fill: pink },
      { d: circ(13.5, 19.6, 7.5), fill: pink },
      { d: circ(24, 23, 6), fill: yellow, solid: true },
    ],
  },
  {
    id: "leaf",
    name: "Leaf",
    parts: [
      { d: "M7 41 C7 22 20 7 41 7 C41 28 28 41 7 41 Z", fill: green },
      { d: "M7 41 L31 17 M18 30 L18 22 M24 24 L30 24", width: 1.8 },
    ],
  },
  {
    id: "tree",
    name: "Tree",
    parts: [
      { d: "M20 32 L28 32 L28 45 L20 45 Z", fill: orange },
      {
        d: "M24 3 C33 3 39 10 38 18 C43 22 41 31 33 32 L15 32 C7 31 5 22 10 18 C9 10 15 3 24 3 Z",
        fill: green,
      },
    ],
  },
  {
    id: "mushroom",
    name: "Mushroom",
    parts: [
      { d: "M17 26 L31 26 L30 41 C30 44 18 44 18 41 Z" },
      { d: "M5 26 C5 14 13 6 24 6 C35 6 43 14 43 26 Z", fill: red },
      { d: circ(15, 18, 3), fill: CARD, solid: true },
      { d: circ(30, 14, 3.5), fill: CARD, solid: true },
      { d: circ(34, 22, 2.5), fill: CARD, solid: true },
    ],
  },
  {
    id: "cactus",
    name: "Cactus",
    parts: [
      {
        d: "M20 31 L12 31 C9 31 8 29 8 26 L8 19 C8 16 13 16 13 19 L13 26 L20 26 Z",
        fill: green,
      },
      {
        d: "M28 24 L35 24 L35 15 C35 12 40 12 40 15 L40 22 C40 26 38 29 35 29 L28 29 Z",
        fill: green,
      },
      { d: "M20 44 L20 10 C20 4 28 4 28 10 L28 44 Z", fill: green },
      { d: "M10 44 L38 44", width: 2.6 },
    ],
  },

  // Food
  {
    id: "apple",
    name: "Apple",
    parts: [
      { d: "M24 15 L25 7", width: 2.6 },
      { d: "M25 10 C28 4 34 4 37 6 C35 11 29 12 25 10 Z", fill: green, solid: true },
      {
        d: "M24 15 C18 10 7 12 7 24 C7 35 14 43 20 43 C22 43 23 42 24 42 C25 42 26 43 28 43 C34 43 41 35 41 24 C41 12 30 10 24 15 Z",
        fill: red,
      },
    ],
  },
  {
    id: "cherry",
    name: "Cherries",
    parts: [
      { d: "M14 30 C16 20 22 12 28 7 M33 28 C32 19 30 12 28 7", width: 2.2 },
      { d: "M28 7 C32 2 39 3 42 6 C38 11 32 11 28 7 Z", fill: green, solid: true },
      { d: circ(14, 35, 8), fill: red },
      { d: circ(33, 33, 8), fill: red },
    ],
  },
  {
    id: "pizza",
    name: "Pizza slice",
    parts: [
      { d: "M7 10 L41 10 L24 45 Z", fill: yellow },
      { d: "M5 10 L43 10 L41 4 L7 4 Z", fill: orange, solid: true },
      { d: circ(17, 17, 3.5), fill: red, solid: true },
      { d: circ(30, 18, 3.5), fill: red, solid: true },
      { d: circ(24, 29, 3.2), fill: red, solid: true },
    ],
  },
  {
    id: "ice-cream",
    name: "Ice cream",
    parts: [
      { d: "M13 22 L35 22 L24 46 Z", fill: orange },
      {
        d: "M11 23 C9 14 15 5 24 5 C33 5 39 14 37 23 C34 26 31 22 28 25 C25 22 22 26 19 23 C16 26 13 26 11 23 Z",
        fill: pink,
      },
    ],
  },
  {
    id: "donut",
    name: "Donut",
    parts: [
      { d: circ(24, 24, 19), fill: orange },
      {
        d: "M24 9 C30 9 35 11 37 15 C40 18 39 21 40 24 C40 28 38 31 36 33 C33 37 29 38 24 38 C19 38 15 37 12 33 C10 31 8 28 8 24 C9 21 8 18 11 15 C13 11 18 9 24 9 Z",
        fill: pink,
        solid: true,
      },
      { d: circ(24, 24, 5.5), fill: CARD, solid: true },
      {
        d: "M16 16 L19 14 M30 13 L33 15 M34 27 L32 30 M15 29 L17 32 M24 13 L26 12 M22 33 L25 34",
        stroke: CARD,
        width: 2.4,
      },
    ],
  },
  {
    id: "lollipop",
    name: "Lollipop",
    parts: [
      { d: "M22.5 29 L25.5 29 L25.5 46 L22.5 46 Z" },
      { d: circ(24, 17, 14), fill: purple },
      {
        d: "M24 17 C24 14 28 14 28 17 C28 21 20 22 20 17 C20 11 32 10 32 17",
        stroke: CARD,
        width: 2.6,
      },
    ],
  },

  // Things
  {
    id: "heart",
    name: "Heart",
    parts: [
      {
        d: "M24 43 C10 33 4 25 5 16 C6 8 15 5 20 9 C22 10.5 23 12 24 14 C25 12 26 10.5 28 9 C33 5 42 8 43 16 C44 25 38 33 24 43 Z",
        fill: red,
      },
    ],
  },
  {
    id: "key",
    name: "Key",
    parts: [
      {
        d: "M22 20 L44 20 L44 30 L40 30 L40 26 L37 26 L37 31 L33 31 L33 26 L22 26 Z",
        fill: yellow,
      },
      { d: circ(13, 23, 10), fill: yellow },
      { d: circ(13, 23, 3.5), fill: CARD, solid: true },
    ],
  },
  {
    id: "bell",
    name: "Bell",
    parts: [
      { d: circ(24, 40, 4), fill: PENCIL, solid: true },
      {
        d: "M24 5 C15 5 12 13 12 21 L12 31 L6 37 L42 37 L36 31 L36 21 C36 13 33 5 24 5 Z",
        fill: orange,
      },
      { d: circ(24, 4, 2.2) },
    ],
  },
  {
    id: "crown",
    name: "Crown",
    parts: [
      { d: "M7 36 L4 12 L15 23 L24 6 L33 23 L44 12 L41 36 Z", fill: yellow },
      { d: "M7 36 L41 36 L41 43 L7 43 Z", fill: yellow, solid: true },
      { d: circ(24, 28, 3), fill: red, solid: true },
    ],
  },
  {
    id: "rocket",
    name: "Rocket",
    parts: [
      { d: "M19 34 L24 46 L29 34 Z", fill: orange, solid: true },
      { d: "M17 24 L8 33 L8 39 L17 34 Z", fill: red, solid: true },
      { d: "M31 24 L40 33 L40 39 L31 34 Z", fill: red, solid: true },
      { d: "M24 2 C33 9 34 22 31 34 L17 34 C14 22 15 9 24 2 Z", fill: blue },
      { d: circ(24, 17, 4.5), fill: CARD, solid: true },
    ],
  },
  {
    id: "umbrella",
    name: "Umbrella",
    parts: [
      { d: "M24 24 L24 39 C24 45 16 45 16 40", width: 2.8 },
      {
        d: "M3 25 C3 12 12 5 24 5 C36 5 45 12 45 25 C42 22 37 22 34 25 C31 22 27 22 24 25 C21 22 17 22 14 25 C11 22 6 22 3 25 Z",
        fill: purple,
      },
    ],
  },
  {
    id: "anchor",
    name: "Anchor",
    parts: [
      {
        d: "M24 12 L24 43 M14 18 L34 18 M7 29 C8 38 15 43 24 43 C33 43 40 38 41 29 M4 33 L7 28 L12 31 M44 33 L41 28 L36 31",
        stroke: blue,
        width: 3.2,
      },
      { d: circ(24, 8, 4), stroke: blue, width: 3 },
    ],
  },
  {
    id: "house",
    name: "House",
    parts: [
      { d: "M9 23 L39 23 L39 44 L9 44 Z", fill: yellow },
      { d: "M3 25 L24 5 L45 25 Z", fill: red },
      { d: "M19 44 L19 32 L28 32 L28 44", fill: CARD, solid: true },
    ],
  },
  {
    id: "balloon",
    name: "Balloon",
    parts: [
      { d: "M24 37 C19 40 29 42 24 47", width: 1.8 },
      { d: "M21.5 37.5 L24 34 L26.5 37.5 Z", fill: pink, solid: true },
      {
        d: "M24 34 C14 34 8 24 8 17 C8 9 15 3 24 3 C33 3 40 9 40 17 C40 24 34 34 24 34 Z",
        fill: pink,
      },
    ],
  },
  {
    id: "gift",
    name: "Gift",
    parts: [
      { d: "M8 20 L40 20 L40 44 L8 44 Z", fill: green },
      { d: "M5 13 L43 13 L43 20 L5 20 Z", fill: green, solid: true },
      { d: "M21 13 L27 13 L27 44 L21 44 Z", fill: red, solid: true },
      { d: "M24 13 C17 3 9 6 14 12 Z M24 13 C31 3 39 6 34 12 Z", fill: red },
    ],
  },

  // Critters
  {
    id: "fish",
    name: "Fish",
    parts: [
      { d: "M34 24 L45 13 L45 35 Z", fill: orange },
      { d: "M4 24 C11 12 28 10 37 24 C28 38 11 36 4 24 Z", fill: orange },
      { d: circ(13, 22, 2.4), fill: PENCIL, solid: true },
      { d: "M20 16 C23 20 23 28 20 32", width: 1.8 },
    ],
  },
  {
    id: "snail",
    name: "Snail",
    parts: [
      {
        d: "M5 40 C5 37 9 36 13 36 L35 36 L37 21 C37 16 44 16 44 21 L42 37 C42 40 40 41 37 41 L7 41 C6 41 5 41 5 40 Z",
        fill: green,
      },
      { d: "M38 18 L35 10 M43 18 L45 10", width: 2 },
      { d: circ(21, 25, 12), fill: yellow },
      {
        d: "M21 25 C21 22 25 22 25 25 C25 29 18 30 17 25 C16 19 27 17 29 25",
        width: 1.8,
      },
    ],
  },
  {
    id: "butterfly",
    name: "Butterfly",
    parts: [
      { d: "M23 22 C18 9 7 5 4 11 C1 17 9 23 23 24 Z", fill: purple },
      { d: "M25 22 C30 9 41 5 44 11 C47 17 39 23 25 24 Z", fill: purple },
      { d: "M23 26 C11 27 5 33 8 39 C11 44 20 39 23 28 Z", fill: pink },
      { d: "M25 26 C37 27 43 33 40 39 C37 44 28 39 25 28 Z", fill: pink },
      {
        d: "M22.5 16 C22.5 13 25.5 13 25.5 16 L25.5 37 C25.5 40 22.5 40 22.5 37 Z",
        fill: PENCIL,
        solid: true,
      },
      { d: "M23 14 C21 8 18 6 15 5 M25 14 C27 8 30 6 33 5", width: 1.8 },
    ],
  },
  {
    id: "ghost",
    name: "Ghost",
    parts: [
      {
        d: "M9 44 L9 20 C9 10 16 4 24 4 C32 4 39 10 39 20 L39 44 L34 39 L29 44 L24 39 L19 44 L14 39 Z",
        width: 2.6,
      },
      { d: circ(18.5, 19, 2.8), fill: PENCIL, solid: true },
      { d: circ(29.5, 19, 2.8), fill: PENCIL, solid: true },
      { d: "M21.5 29 a2.5 3.2 0 1 0 5 0 a2.5 3.2 0 1 0 -5 0", fill: PENCIL, solid: true },
    ],
  },
];
