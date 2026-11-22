import type { CrayonName } from "@/lib/palette";

export type CategoryId = "puzzle" | "arcade" | "board" | "word" | "classic";
export type TabId = "all" | CategoryId | "two-player";
export type Difficulty = 1 | 2 | 3;
export type PlayerCount = 1 | 2;

/** Key into the doodle thumbnail map (components/games/Thumbnails.tsx). */
export type ThumbnailKey =
  | "snake"
  | "tic-tac-toe"
  | "memory"
  | "hangman"
  | "pong"
  | "flappy"
  | "2048"
  | "minesweeper"
  | "rps"
  | "whack"
  | "dots"
  | "sudoku"
  | "connect-four"
  | "word-search"
  | "checkers"
  | "chess";

export type Control = { keys: readonly string[]; action: string };

export type Game = {
  id: string;
  slug: string;
  title: string;
  category: CategoryId;
  difficulty: Difficulty;
  players: readonly PlayerCount[];
  avgMinutes: number;
  description: string;
  howToPlay: readonly string[];
  controls: readonly Control[];
  thumbnail: ThumbnailKey;
  isNew: boolean;
  isFeatured: boolean;
  plays: number;
  /** ISO date, used by the "Newest" sort. */
  addedAt: string;
};

export type Tab = { id: TabId; label: string; color: CrayonName | "graphite" };

export const tabs: readonly Tab[] = [
  { id: "all", label: "All", color: "graphite" },
  { id: "puzzle", label: "Puzzle", color: "purple" },
  { id: "arcade", label: "Arcade", color: "red" },
  { id: "board", label: "Board", color: "blue" },
  { id: "word", label: "Word", color: "orange" },
  { id: "classic", label: "Classic", color: "green" },
  { id: "two-player", label: "2-Player", color: "yellow" },
];

export const categoryColor: Record<CategoryId, CrayonName> = {
  puzzle: "purple",
  arcade: "red",
  board: "blue",
  word: "orange",
  classic: "green",
};

export const categoryLabel: Record<CategoryId, string> = {
  puzzle: "Puzzle",
  arcade: "Arcade",
  board: "Board",
  word: "Word",
  classic: "Classic",
};

const arrows: Control = { keys: ["←", "↑", "↓", "→"], action: "Move" };
const click: Control = { keys: ["Click"], action: "Pick a square" };

export const games: readonly Game[] = [
  {
    id: "g01",
    slug: "snake",
    title: "Snake",
    category: "arcade",
    difficulty: 2,
    players: [1],
    avgMinutes: 5,
    description: "Gobble apples, grow longer, and don't bite your own tail.",
    howToPlay: [
      "Steer the snake toward the apple.",
      "Every apple makes you one piece longer.",
      "Hitting a wall or yourself ends the round.",
    ],
    controls: [arrows, { keys: ["Space"], action: "Pause" }],
    thumbnail: "snake",
    isNew: false,
    isFeatured: false,
    plays: 48210,
    addedAt: "2026-03-02",
  },
  {
    id: "g02",
    slug: "tic-tac-toe",
    title: "Tic-Tac-Toe",
    category: "classic",
    difficulty: 1,
    players: [1, 2],
    avgMinutes: 2,
    description: "Three in a row wins. Beat a friend or the doodle bot.",
    howToPlay: [
      "Take turns drawing an X or an O in an empty square.",
      "Get three of your marks in a line to win.",
      "If the grid fills up first, it's a tie.",
    ],
    controls: [click, { keys: ["R"], action: "Restart" }],
    thumbnail: "tic-tac-toe",
    isNew: false,
    isFeatured: false,
    plays: 61540,
    addedAt: "2026-01-15",
  },
  {
    id: "g03",
    slug: "memory-match",
    title: "Memory Match",
    category: "puzzle",
    difficulty: 1,
    players: [1, 2],
    avgMinutes: 4,
    description: "Flip two cards at a time and find every matching pair.",
    howToPlay: [
      "Flip any two cards face up.",
      "If they match, they stay. If not, they flip back.",
      "Clear the board in as few flips as you can.",
    ],
    controls: [{ keys: ["Click"], action: "Flip a card" }],
    thumbnail: "memory",
    isNew: false,
    isFeatured: false,
    plays: 39880,
    addedAt: "2026-02-10",
  },
  {
    id: "g04",
    slug: "hangman",
    title: "Hangman",
    category: "word",
    difficulty: 2,
    players: [1, 2],
    avgMinutes: 4,
    description:
      "Guess the secret word one letter at a time before the drawing is done.",
    howToPlay: [
      "Pick a letter you think is in the word.",
      "Right guesses fill in the blanks.",
      "Each wrong guess adds a line to the drawing. Solve it first!",
    ],
    controls: [{ keys: ["A", "…", "Z"], action: "Guess a letter" }],
    thumbnail: "hangman",
    isNew: false,
    isFeatured: false,
    plays: 27310,
    addedAt: "2026-02-22",
  },
  {
    id: "g05",
    slug: "pong",
    title: "Pong",
    category: "arcade",
    difficulty: 2,
    players: [1, 2],
    avgMinutes: 3,
    description:
      "Bounce the ball past your rival's paddle. First to seven wins.",
    howToPlay: [
      "Move your paddle up and down to hit the ball.",
      "Miss the ball and your rival scores.",
      "First to seven points wins the match.",
    ],
    controls: [
      { keys: ["W", "S"], action: "Left paddle" },
      { keys: ["↑", "↓"], action: "Right paddle" },
    ],
    thumbnail: "pong",
    isNew: false,
    isFeatured: false,
    plays: 35120,
    addedAt: "2026-04-05",
  },
  {
    id: "g06",
    slug: "flappy-doodle",
    title: "Flappy Doodle",
    category: "arcade",
    difficulty: 3,
    players: [1],
    avgMinutes: 3,
    description: "Flap a paper bird through the gaps between pencil pipes.",
    howToPlay: [
      "Tap to flap and fly up. Gravity does the rest.",
      "Squeeze through the gaps between the pipes.",
      "Each pipe you pass is one point.",
    ],
    controls: [{ keys: ["Space"], action: "Flap" }],
    thumbnail: "flappy",
    isNew: true,
    isFeatured: true,
    plays: 12890,
    addedAt: "2026-11-18",
  },
  {
    id: "g07",
    slug: "2048",
    title: "2048",
    category: "puzzle",
    difficulty: 3,
    players: [1],
    avgMinutes: 8,
    description: "Slide numbered tiles, merge the matches, and reach 2048.",
    howToPlay: [
      "Slide every tile in one direction at once.",
      "Two tiles with the same number merge into one.",
      "Make a 2048 tile before the board fills up.",
    ],
    controls: [arrows, { keys: ["Swipe"], action: "Move on phones" }],
    thumbnail: "2048",
    isNew: false,
    isFeatured: false,
    plays: 44760,
    addedAt: "2026-05-12",
  },
  {
    id: "g08",
    slug: "minesweeper",
    title: "Minesweeper",
    category: "classic",
    difficulty: 3,
    players: [1],
    avgMinutes: 6,
    description:
      "Use the number clues to clear the field without hitting a mine.",
    howToPlay: [
      "Click a square to uncover it.",
      "A number tells you how many mines touch that square.",
      "Flag the mines and uncover everything else to win.",
    ],
    controls: [
      { keys: ["Click"], action: "Uncover" },
      { keys: ["Right-click"], action: "Flag" },
    ],
    thumbnail: "minesweeper",
    isNew: false,
    isFeatured: false,
    plays: 22450,
    addedAt: "2026-03-28",
  },
  {
    id: "g09",
    slug: "rock-paper-scissors",
    title: "Rock Paper Scissors",
    category: "classic",
    difficulty: 1,
    players: [1, 2],
    avgMinutes: 1,
    description: "Rock beats scissors, scissors beat paper, paper beats rock.",
    howToPlay: [
      "Pick rock, paper or scissors.",
      "Your rival picks at the same time.",
      "Best of five rounds wins.",
    ],
    controls: [{ keys: ["R", "P", "S"], action: "Choose" }],
    thumbnail: "rps",
    isNew: true,
    isFeatured: false,
    plays: 18030,
    addedAt: "2026-11-10",
  },
  {
    id: "g10",
    slug: "whack-a-mole",
    title: "Whack-a-Mole",
    category: "arcade",
    difficulty: 1,
    players: [1],
    avgMinutes: 2,
    description: "Moles pop up fast. Bonk as many as you can in 30 seconds.",
    howToPlay: [
      "Watch the holes for a popping mole.",
      "Click it before it ducks back down.",
      "Score as many bonks as you can before time runs out.",
    ],
    controls: [{ keys: ["Click"], action: "Bonk" }],
    thumbnail: "whack",
    isNew: false,
    isFeatured: false,
    plays: 29900,
    addedAt: "2026-06-01",
  },
  {
    id: "g11",
    slug: "dots-and-boxes",
    title: "Dots & Boxes",
    category: "classic",
    difficulty: 2,
    players: [2],
    avgMinutes: 5,
    description: "Connect the dots. Close a box to claim it and go again.",
    howToPlay: [
      "Take turns drawing one line between two dots.",
      "Close the fourth side of a box to claim it and play again.",
      "Whoever owns the most boxes at the end wins.",
    ],
    controls: [{ keys: ["Click"], action: "Draw a line" }],
    thumbnail: "dots",
    isNew: false,
    isFeatured: false,
    plays: 9840,
    addedAt: "2026-07-19",
  },
  {
    id: "g12",
    slug: "sudoku",
    title: "Sudoku",
    category: "puzzle",
    difficulty: 3,
    players: [1],
    avgMinutes: 15,
    description: "Fill the grid so every row, column and box has 1 to 9.",
    howToPlay: [
      "Pick an empty square.",
      "Each row, column and 3×3 box needs the numbers 1–9 once.",
      "Use pencil marks for numbers you're not sure about yet.",
    ],
    controls: [
      { keys: ["1", "…", "9"], action: "Write a number" },
      { keys: ["N"], action: "Pencil marks" },
    ],
    thumbnail: "sudoku",
    isNew: false,
    isFeatured: false,
    plays: 31270,
    addedAt: "2026-04-21",
  },
  {
    id: "g13",
    slug: "connect-four",
    title: "Connect Four",
    category: "board",
    difficulty: 2,
    players: [1, 2],
    avgMinutes: 5,
    description:
      "Drop discs into the grid and line up four before your rival does.",
    howToPlay: [
      "Take turns dropping a disc into a column.",
      "Discs fall to the lowest empty space.",
      "Four in a row, across, down or diagonal, wins.",
    ],
    controls: [
      { keys: ["←", "→"], action: "Pick a column" },
      { keys: ["Enter"], action: "Drop" },
    ],
    thumbnail: "connect-four",
    isNew: true,
    isFeatured: false,
    plays: 15420,
    addedAt: "2026-11-02",
  },
  {
    id: "g14",
    slug: "word-search",
    title: "Word Search",
    category: "word",
    difficulty: 1,
    players: [1],
    avgMinutes: 6,
    description:
      "Find the hidden words in a jumble of letters and circle them.",
    howToPlay: [
      "Look for the words from the list in the grid.",
      "Words can run across, down or diagonally.",
      "Drag across a word to circle it.",
    ],
    controls: [{ keys: ["Drag"], action: "Circle a word" }],
    thumbnail: "word-search",
    isNew: false,
    isFeatured: false,
    plays: 20660,
    addedAt: "2026-08-14",
  },
  {
    id: "g15",
    slug: "checkers",
    title: "Checkers",
    category: "board",
    difficulty: 2,
    players: [1, 2],
    avgMinutes: 12,
    description: "Hop over your rival's pieces and crown your own kings.",
    howToPlay: [
      "Move pieces diagonally forward onto dark squares.",
      "Jump over a rival's piece to capture it.",
      "Reach the far side to crown a king that moves both ways.",
    ],
    controls: [{ keys: ["Click"], action: "Pick & move" }],
    thumbnail: "checkers",
    isNew: false,
    isFeatured: false,
    plays: 17350,
    addedAt: "2026-05-30",
  },
  {
    id: "g16",
    slug: "chess",
    title: "Chess",
    category: "board",
    difficulty: 3,
    players: [1, 2],
    avgMinutes: 20,
    description: "The classic battle of kings, queens and sneaky knights.",
    howToPlay: [
      "Each piece moves in its own way. Tap one to see its moves.",
      "Capture by landing on a rival's piece.",
      "Trap the rival king with checkmate to win.",
    ],
    controls: [{ keys: ["Click"], action: "Pick & move" }],
    thumbnail: "chess",
    isNew: false,
    isFeatured: false,
    plays: 26080,
    addedAt: "2026-09-09",
  },
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}

export function getFeaturedGame(): Game {
  return games.find((g) => g.isFeatured) ?? games[0];
}
