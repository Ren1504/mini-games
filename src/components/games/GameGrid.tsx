"use client";

import { AnimatePresence } from "motion/react";
import { useMemo, type KeyboardEvent } from "react";
import { games } from "@/data/games";
import { useFavorites } from "@/hooks/useFavorites";
import { useHubParams } from "@/hooks/useHubParams";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DEFAULT_FILTERS, filterGames } from "@/lib/filter-games";
import { EmptyState } from "./EmptyState";
import { GameCard } from "./GameCard";

function useColumns(): number {
  const xl = useMediaQuery("(min-width: 1280px)");
  const lg = useMediaQuery("(min-width: 1024px)");
  const sm = useMediaQuery("(min-width: 640px)");
  return xl ? 4 : lg ? 3 : sm ? 2 : 1;
}

/**
 * Arrow keys move between cards by geometry (works for any column count
 * and for tilted cards): Left/Right step through reading order, Up/Down
 * jump to the nearest card in the row above/below.
 */
function onGridKeyDown(e: KeyboardEvent<HTMLElement>) {
  const target = e.target as HTMLElement;
  if (!target.matches("[data-card-link]")) return;
  const links = [
    ...e.currentTarget.querySelectorAll<HTMLElement>("[data-card-link]"),
  ];
  const i = links.indexOf(target);
  if (i < 0) return;
  let next: HTMLElement | undefined;
  if (e.key === "ArrowRight") next = links[i + 1];
  else if (e.key === "ArrowLeft") next = links[i - 1];
  else if (e.key === "Home") next = links[0];
  else if (e.key === "End") next = links[links.length - 1];
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const here = target.getBoundingClientRect();
    const down = e.key === "ArrowDown";
    let best = Infinity;
    for (const link of links) {
      const r = link.getBoundingClientRect();
      const dy = down ? r.top - here.top : here.top - r.top;
      if (dy < 40) continue;
      const score = dy * 4 + Math.abs(r.left - here.left);
      if (score < best) {
        best = score;
        next = link;
      }
    }
  } else return;
  e.preventDefault();
  next?.focus();
}

export function GameGrid() {
  const { filters, update } = useHubParams();
  const { favorites } = useFavorites();
  const columns = useColumns();
  const list = useMemo(
    () => filterGames(games, filters, favorites),
    [filters, favorites],
  );

  const emptyFavorites = filters.favoritesOnly && favorites.size === 0;

  return (
    <div
      id="game-grid"
      role="tabpanel"
      aria-labelledby={`tab-${filters.tab}`}
      className="mt-10"
    >
      <p aria-live="polite" className="sr-only">
        {list.length === 1 ? "1 game" : `${list.length} games`}
      </p>
      {list.length === 0 ? (
        emptyFavorites ? (
          <EmptyState
            message="No favorites yet. Tap a heart on any game!"
            actionLabel="show all games"
            onAction={() => update({ favoritesOnly: false })}
          />
        ) : (
          <EmptyState
            message="Hmm… no games found. Try another word!"
            actionLabel="clear search"
            onAction={() => update({ ...DEFAULT_FILTERS, sort: filters.sort })}
          />
        )
      ) : (
        <ul
          onKeyDown={onGridKeyDown}
          aria-label="Games"
          className="relative grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {list.map((game, i) => (
              <GameCard
                key={game.slug}
                game={game}
                index={i}
                columns={columns}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
