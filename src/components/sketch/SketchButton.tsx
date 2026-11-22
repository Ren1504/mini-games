"use client";

import { motion } from "motion/react";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useStarBurst } from "@/components/fx/StarBurst";
import { useSound } from "@/components/fx/Sound";
import { cn } from "@/lib/cn";
import { buttonPress } from "@/lib/motion";
import { crayon, type CrayonName } from "@/lib/palette";
import { SketchBox } from "./SketchBox";

const MotionLink = motion.create(Link);

type Props = {
  children: ReactNode;
  seed: string;
  color?: CrayonName;
  /** Always show a crayon fill (the big kid-coloured PLAY button). */
  filled?: boolean;
  size?: "md" | "lg";
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
};

/**
 * Wobbly crayon button. Hover scribbles a fill in from the left, press
 * squashes it, click throws a few doodle stars.
 */
export function SketchButton({
  children,
  seed,
  color = "yellow",
  filled = false,
  size = "md",
  href,
  onClick,
  type = "button",
  className,
  "aria-label": ariaLabel,
}: Props) {
  const { trigger, node } = useStarBurst();
  const { scratch } = useSound();

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    trigger(e);
    scratch();
    onClick?.(e);
  };

  const inner = (
    <SketchBox
      as="span"
      seed={seed}
      fill={filled ? crayon[color] : undefined}
      hachureGap={filled ? 5 : 6}
      fillWeight={filled ? 2.2 : 1.6}
      hoverFill={crayon[color]}
      strokeWidth={size === "lg" ? 2.6 : 2.2}
      className={cn(
        "text-paper-halo inline-flex items-center justify-center gap-2 font-hand text-graphite",
        size === "lg"
          ? "min-h-14 px-8 py-3 text-3xl"
          : "min-h-11 px-5 py-2 text-xl",
      )}
    >
      {children}
    </SketchBox>
  );

  const shared = {
    className: cn("relative inline-flex select-none", className),
    variants: buttonPress,
    initial: "rest" as const,
    animate: "rest" as const,
    whileHover: "hover" as const,
    whileTap: "tap" as const,
    onClick: handleClick,
    "aria-label": ariaLabel,
  };

  if (href) {
    return (
      <MotionLink href={href} {...shared}>
        {inner}
        {node}
      </MotionLink>
    );
  }
  return (
    <motion.button type={type} {...shared}>
      {inner}
      {node}
    </motion.button>
  );
}
