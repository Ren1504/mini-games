/**
 * Imposter word bank. SERVER-ONLY: imported by the /party game server and
 * tests, never by Next.js pages or components, so the words never ship to
 * the browser.
 *
 * Rules for entries: globally famous (recognisable in India, the USA,
 * Brazil, Japan and Europe), nothing political, controversial or NSFW.
 * `imposterClue` is related but must not give the word away
 * (Titanic → "Ocean", not "Ship that sank").
 */
import type { SecretWord } from "../shared/model";

export type ImposterWord = SecretWord & { difficulty: 1 | 2 | 3 };

/** Step (c) grows this to 200+ entries. */
export const IMPOSTER_WORDS: readonly ImposterWord[] = [
  {
    id: "movie-titanic",
    word: "Titanic",
    category: "Movie",
    imposterClue: "Ocean",
    difficulty: 1,
  },
  {
    id: "tv-friends",
    word: "Friends",
    category: "TV Series",
    imposterClue: "Coffee",
    difficulty: 1,
  },
  {
    id: "food-pizza",
    word: "Pizza",
    category: "Food",
    imposterClue: "Oven",
    difficulty: 1,
  },
  {
    id: "place-eiffel-tower",
    word: "Eiffel Tower",
    category: "Place",
    imposterClue: "Iron",
    difficulty: 1,
  },
  {
    id: "animal-penguin",
    word: "Penguin",
    category: "Animal",
    imposterClue: "Ice",
    difficulty: 1,
  },
  {
    id: "celebrity-taylor-swift",
    word: "Taylor Swift",
    category: "Celebrity",
    imposterClue: "Eras",
    difficulty: 1,
  },
];
