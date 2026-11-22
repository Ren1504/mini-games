"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "doodle-arcade:favorites";
const EVENT = "doodle-arcade:favorites-change";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return memoryFallback;
  }
}

/** Used when storage is blocked (private mode, disabled cookies). */
let memoryFallback = "[]";

function write(slugs: string[]) {
  const raw = JSON.stringify(slugs);
  memoryFallback = raw;
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Storage unavailable: keep favorites for this page view only.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

function parse(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/** SSR-safe favorites. The server render always sees an empty list. */
export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const favorites = useMemo(() => new Set(parse(raw)), [raw]);

  const toggle = useCallback((slug: string) => {
    const current = new Set(parse(read()));
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    write([...current]);
  }, []);

  return { favorites, toggle };
}
