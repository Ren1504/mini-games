import type { Difficulty, Game, TabId } from "@/data/games";

export type SortId = "popular" | "newest" | "az";

export type HubFilters = {
  q: string;
  tab: TabId;
  sort: SortId;
  difficulty: Difficulty | null;
  favoritesOnly: boolean;
};

export const DEFAULT_FILTERS: HubFilters = {
  q: "",
  tab: "all",
  sort: "popular",
  difficulty: null,
  favoritesOnly: false,
};

export const sortOptions: ReadonlyArray<{ id: SortId; label: string }> = [
  { id: "popular", label: "Most played" },
  { id: "newest", label: "Newest" },
  { id: "az", label: "A–Z" },
];

function matchesTab(game: Game, tab: TabId): boolean {
  if (tab === "all") return true;
  if (tab === "two-player") return game.players.includes(2);
  return game.category === tab;
}

function matchesQuery(game: Game, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [game.title, game.category, game.description]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function filterGames(
  all: readonly Game[],
  f: HubFilters,
  favorites: ReadonlySet<string>,
): Game[] {
  const list = all.filter(
    (g) =>
      matchesTab(g, f.tab) &&
      matchesQuery(g, f.q) &&
      (f.difficulty === null || g.difficulty === f.difficulty) &&
      (!f.favoritesOnly || favorites.has(g.slug)),
  );
  const sorters: Record<SortId, (a: Game, b: Game) => number> = {
    popular: (a, b) => b.plays - a.plays,
    newest: (a, b) => b.addedAt.localeCompare(a.addedAt),
    az: (a, b) => a.title.localeCompare(b.title),
  };
  return list.sort(sorters[f.sort]);
}

export function formatPlays(n: number): string {
  return n >= 1000
    ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : String(n);
}
