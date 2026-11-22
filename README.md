# Doodle Arcade

A mini-games hub that looks like a kid drew it in a school notebook: wobbly
pencil lines, crayon hatching, washi tape and sticky notes. Built with
Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Motion, rough.js and
rough-notation.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Script                    | What it does                                  |
| ------------------------- | --------------------------------------------- |
| `npm run build` / `start` | Production build / server                     |
| `npm run lint`            | ESLint                                        |
| `npm run typecheck`       | Generates route types, then `tsc`             |
| `npm test`                | Vitest (data, filtering, URL params, seeding) |
| `npm run format`          | Prettier (sorts Tailwind classes too)         |

## Add a new game

1. Add one object to `src/data/games.ts`: `slug`, `title`, `category`,
   `difficulty` (1–3), `players`, `avgMinutes`, `description`, `howToPlay`,
   `controls`, `thumbnail`, `plays`, `addedAt`.
2. Draw its doodle: add a component to `src/components/games/Thumbnails.tsx`
   (160×110 grid, use the `RRect` / `RCircle` / `RPath` … primitives), add its
   key to the `ThumbnailKey` union in `games.ts`, and register it in
   `THUMBNAILS`. Give the moving part a `motion.g` with `shown` / `hover`
   variants and it animates when the card is hovered.
3. That's it. The hub card, the `/games/<slug>` detail page and modal, and the
   `/games/<slug>/play` placeholder are all generated from the data. Tests check
   that slugs are unique and every game has its own thumbnail.

### Make a game playable

Every game's `/games/<slug>/play` page shows "Game coming soon!" until it
has a real implementation. To ship one:

1. Build it under `src/games/<slug>/`. Keep the rules in a plain
   `logic.ts` with tests (see `src/games/2048/`), and the UI in a client
   component.
2. Add its slug to `src/games/playable.ts` and a lazy loader to
   `src/games/GameLoader.tsx`. Each game becomes its own chunk, downloaded
   only on that game's play page, so adding games never slows the hub or
   other games. A test checks the two lists match.

Playable so far: **2048** (arrow keys / WASD or swipe; the best score
and the current game are saved in the browser, so a reload resumes play).

Set `isFeatured: true` on exactly one game to put it on the big taped card.

## Tweak the motion

Every spring, ease, duration and load-sequence time lives in
`src/lib/motion.ts`. Components don't hard-code timing.

- `spring` / `softSpring` / `strokeEase`: the feel of everything.
- `timeline`: when each part of the page-load sequence starts.
- `stagger`, `cardDrop`, `lift`, `press`, `pageTurn`: card and page moves.
- `cardVariants`: hidden → shown → hover → tap → erased for game cards.

With `prefers-reduced-motion`, `<MotionConfig reducedMotion="user">` turns off
transform and layout animation, and components fall back to 150ms fades.
Line boil, parallax, star bursts and the page turn are skipped.

## Light & dark (notebook ↔ chalkboard)

The sun/moon button in the top-right corner switches between the notebook
(light) and a chalkboard (dark). The first visit follows the device's
setting; once someone clicks, their choice is saved in `localStorage`.

All colors are CSS variables in `src/app/globals.css`: the light set in
`@theme static`, the chalk set under `:root[data-theme="dark"]`.
`src/lib/palette.ts` hands those variables to rough.js, so every drawing
recolors without being redrawn. A tiny inline script in `layout.tsx` sets
`data-theme` before first paint, so the page never flashes the wrong theme.

## Turn off line boil

The "boiling" outline jitter (logo, mascot, active tab, hovered card) runs at
8fps through `useBoil` in `src/hooks/useBoil.ts`. To freeze it everywhere:

```bash
NEXT_PUBLIC_LINE_BOIL=off npm run dev
```

It also stops by itself when the tab is hidden or reduced motion is on.

## How it fits together

- **Hand-drawn shapes:** `src/lib/rough.ts` wraps the rough.js generator (pure
  JS, so it runs during SSR) and memoizes every shape by size and seed.
  `SketchBox` measures its element and draws border, fill and shadow behind
  the content.
- **No hydration drift:** every "random" value (card tilt, tape color, letter
  jitter, rough.js seed) comes from `src/lib/seed.ts`, keyed by the game slug.
- **State in the URL:** search, tab, sort, difficulty and favorites-only live
  in the query string, so links are shareable and Back works. Favorites are
  stored in `localStorage`.
- **Detail modal:** `src/app/@modal/(.)games/[slug]` intercepts soft
  navigation, so a card opens a torn-out page over the hub. A direct link or
  refresh shows the full page at `src/app/games/[slug]`.
- **Palette:** CSS variables in `src/app/globals.css`, referenced from
  `src/lib/palette.ts` for rough.js. Text is always graphite (pencil or chalk),
  and crayon colors are only used for fills and strokes, so text stays
  readable in both themes.
