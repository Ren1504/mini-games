import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A yellow sticky note with slightly uneven edges and a curled bottom
 * corner (the curl is a gradient + shadow, no straight edge in sight).
 */
export function StickyNote({
  children,
  rotate = 1.5,
  className,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  rotate?: number;
  className?: string;
  as?: "div" | "aside" | "section";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag
      className={cn("sticky-note-wrap relative", className)}
      style={{ rotate: `${rotate}deg` }}
      {...rest}
    >
      <div className="sticky-note relative px-6 pt-7 pb-8">{children}</div>
    </Tag>
  );
}
