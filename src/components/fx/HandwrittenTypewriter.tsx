"use client";

import { useEffect, useState } from "react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { cn } from "@/lib/cn";
import { typewriter } from "@/lib/motion";

/**
 * Types `text` one character at a time (60ms/char) with a blinking
 * pencil caret. Purely visual: pair it with a real label/placeholder.
 */
export function HandwrittenTypewriter({
  text,
  startDelayMs = typewriter.startDelayMs,
  className,
}: {
  text: string;
  startDelayMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotionSafe();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let timer = window.setTimeout(function tick() {
      i += 1;
      setCount(i);
      if (i < text.length) timer = window.setTimeout(tick, typewriter.charMs);
    }, startDelayMs);
    return () => window.clearTimeout(timer);
  }, [text, startDelayMs, reduced]);

  const shown = reduced ? text : text.slice(0, count);

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex items-center", className)}
    >
      <span className="whitespace-pre">{shown}</span>
      <svg
        viewBox="0 0 10 24"
        width="8"
        height="22"
        className="ml-0.5 animate-caret"
        focusable="false"
      >
        <path
          d="M5 2 L5 18 M3.2 18 L5 22.5 L6.8 18 Z"
          stroke="#5A5A5A"
          strokeWidth="2"
          strokeLinecap="round"
          fill="#5A5A5A"
        />
      </svg>
    </span>
  );
}
