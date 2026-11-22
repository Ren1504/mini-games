"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { tabs, type Difficulty, type TabId } from "@/data/games";
import {
  DEFAULT_FILTERS,
  sortOptions,
  type HubFilters,
  type SortId,
} from "@/lib/filter-games";

/*
 * Search, tab, sort, difficulty and favorites-only live in the URL query.
 * We write with the native History API, which Next.js keeps in sync with
 * its router, so updates don't trigger a server round-trip. Category and
 * sort changes push history entries (Back undoes them); typing replaces.
 */

const EVENT = "doodle-arcade:params-change";
let lastHubSearch = "";

function getSnapshot(): string {
  // While a game modal is open the URL is /games/<slug>; keep the hub's
  // last known filters underneath instead of resetting them.
  if (window.location.pathname === "/") lastHubSearch = window.location.search;
  return lastHubSearch;
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

const tabIds = new Set<string>(tabs.map((t) => t.id));
const sortIds = new Set<string>(sortOptions.map((s) => s.id));

export function parseHubParams(search: string): HubFilters {
  const p = new URLSearchParams(search);
  const tab = p.get("tab") ?? "";
  const sort = p.get("sort") ?? "";
  const d = Number(p.get("difficulty"));
  return {
    q: p.get("q") ?? "",
    tab: tabIds.has(tab) ? (tab as TabId) : DEFAULT_FILTERS.tab,
    sort: sortIds.has(sort) ? (sort as SortId) : DEFAULT_FILTERS.sort,
    difficulty: d === 1 || d === 2 || d === 3 ? (d as Difficulty) : null,
    favoritesOnly: p.get("fav") === "1",
  };
}

export function serializeHubParams(f: HubFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.tab !== DEFAULT_FILTERS.tab) p.set("tab", f.tab);
  if (f.sort !== DEFAULT_FILTERS.sort) p.set("sort", f.sort);
  if (f.difficulty !== null) p.set("difficulty", String(f.difficulty));
  if (f.favoritesOnly) p.set("fav", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function useHubParams() {
  const search = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const filters = useMemo(() => parseHubParams(search), [search]);

  const update = useCallback(
    (patch: Partial<HubFilters>, mode: "push" | "replace" = "push") => {
      const next = { ...parseHubParams(getSnapshot()), ...patch };
      const url = `/${serializeHubParams(next)}${window.location.hash}`;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
      window.dispatchEvent(new Event(EVENT));
    },
    [],
  );

  return { filters, update };
}
