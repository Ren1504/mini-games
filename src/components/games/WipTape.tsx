import { cn } from "@/lib/cn";

const YELLOW = "#ffd23f";
const BLACK = "#1f1f1f";

/**
 * Yellow-and-black caution tape across a card's top-right corner, reading
 * "WIP": the game isn't playable yet. Decorative (the card title carries
 * "work in progress" for screen readers). Place inside a `relative` box;
 * it clips itself to that box so only the corner shows. The tape keeps its
 * real colors in dark mode, like a sticker would.
 */
export function WipTape({
  className,
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute flex items-center justify-center border-y-2 shadow-[0_2px_3px_rgb(0_0_0/0.25)]",
          lg
            ? "top-[38px] -right-[66px] h-11 w-[260px] rotate-[38deg]"
            : "top-[26px] -right-[52px] h-8 w-[200px] rotate-[38deg]",
        )}
        style={{
          borderColor: BLACK,
          // Wobbly edge so it looks hand-cut, not printed.
          filter: "url(#boil-0)",
          backgroundImage: `repeating-linear-gradient(-45deg, ${YELLOW} 0 9px, ${BLACK} 9px 18px)`,
        }}
      >
        <span
          className={cn(
            "rounded-sm px-2 font-hand leading-none tracking-wider",
            lg ? "py-1 text-3xl" : "py-0.5 text-xl",
          )}
          style={{ backgroundColor: YELLOW, color: BLACK }}
        >
          WIP
        </span>
      </div>
    </div>
  );
}
