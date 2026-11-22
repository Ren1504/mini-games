"use client";

import { useEffect, useState, type RefObject } from "react";

export type Size = { w: number; h: number };

/**
 * Layout size (ignores CSS transforms, so tilted or scaling cards report
 * their real box). Rounded to whole pixels to keep the rough.js cache warm.
 */
export function useElementSize(
  ref: RefObject<HTMLElement | null>,
): Size | null {
  const [size, setSize] = useState<Size | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0];
      const w = Math.round(box ? box.inlineSize : el.offsetWidth);
      const h = Math.round(box ? box.blockSize : el.offsetHeight);
      setSize((prev) =>
        prev && prev.w === w && prev.h === h ? prev : { w, h },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
