"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { crayon, ink } from "@/lib/palette";
import type { AvatarId } from "@/shared/config";
import { RCircle, REllipse, RPath, RPolygon, RRect } from "./Rough";

/** Human names for the doodles (also used as accessible labels). */
export const AVATAR_NAMES: Record<AvatarId, string> = {
  cat: "Cat",
  dog: "Dog",
  frog: "Frog",
  owl: "Owl",
  fox: "Fox",
  bear: "Bear",
  bunny: "Bunny",
  penguin: "Penguin",
  octopus: "Octopus",
  robot: "Robot",
  ghost: "Ghost",
  alien: "Alien",
};

const G = ink.graphite;
const eyes = (y = 30, gap = 8, r = 2.6) => (
  <>
    <circle cx={32 - gap} cy={y} r={r} fill={G} />
    <circle cx={32 + gap} cy={y} r={r} fill={G} />
  </>
);
const smile = (seed: number, y = 40) => (
  <RPath
    d={`M26 ${y} C29 ${y + 4} 35 ${y + 4} 38 ${y}`}
    seed={seed}
    strokeWidth={1.8}
  />
);
const fillOpts = (color: string, gap = 3.2) =>
  ({
    fill: color,
    fillStyle: "hachure",
    hachureGap: gap,
    strokeWidth: 2,
  }) as const;

/** Each doodle on a 64×64 grid, face centred around (32, 34). */
const DRAWINGS: Record<AvatarId, () => ReactNode> = {
  cat: () => (
    <>
      <RPolygon
        points={[
          [14, 24],
          [18, 6],
          [28, 18],
        ]}
        seed={501}
        {...fillOpts(crayon.yellow)}
      />
      <RPolygon
        points={[
          [50, 24],
          [46, 6],
          [36, 18],
        ]}
        seed={502}
        {...fillOpts(crayon.yellow)}
      />
      <RCircle cx={32} cy={34} d={40} seed={503} {...fillOpts(crayon.yellow)} />
      {eyes()}
      <RPath
        d="M30 36 L34 36 L32 38 Z M8 34 L20 36 M8 40 L20 39 M56 34 L44 36 M56 40 L44 39"
        seed={504}
        strokeWidth={1.4}
      />
    </>
  ),
  dog: () => (
    <>
      <REllipse
        cx={13}
        cy={30}
        w={12}
        h={24}
        seed={511}
        {...fillOpts(crayon.orange, 2.6)}
      />
      <REllipse
        cx={51}
        cy={30}
        w={12}
        h={24}
        seed={512}
        {...fillOpts(crayon.orange, 2.6)}
      />
      <RCircle
        cx={32}
        cy={34}
        d={38}
        seed={513}
        {...fillOpts(crayon.orange, 4)}
      />
      {eyes(29)}
      <REllipse
        cx={32}
        cy={38}
        w={9}
        h={6}
        seed={514}
        fill={G}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      {smile(515, 43)}
    </>
  ),
  frog: () => (
    <>
      <RCircle cx={20} cy={18} d={16} seed={521} {...fillOpts(crayon.green)} />
      <RCircle cx={44} cy={18} d={16} seed={522} {...fillOpts(crayon.green)} />
      <REllipse
        cx={32}
        cy={38}
        w={48}
        h={34}
        seed={523}
        {...fillOpts(crayon.green)}
      />
      <circle cx={20} cy={18} r={3} fill={G} />
      <circle cx={44} cy={18} r={3} fill={G} />
      <RPath d="M20 42 C26 49 38 49 44 42" seed={524} strokeWidth={1.8} />
    </>
  ),
  owl: () => (
    <>
      <RPath d="M14 16 L20 22 M50 16 L44 22" seed={531} strokeWidth={2} />
      <REllipse
        cx={32}
        cy={36}
        w={40}
        h={46}
        seed={532}
        {...fillOpts(crayon.purple)}
      />
      <RCircle
        cx={24}
        cy={30}
        d={13}
        seed={533}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.6}
      />
      <RCircle
        cx={40}
        cy={30}
        d={13}
        seed={534}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.6}
      />
      <circle cx={24} cy={30} r={2.8} fill={G} />
      <circle cx={40} cy={30} r={2.8} fill={G} />
      <RPolygon
        points={[
          [29, 37],
          [35, 37],
          [32, 42],
        ]}
        seed={535}
        fill={crayon.orange}
        fillStyle="solid"
        strokeWidth={1.4}
      />
    </>
  ),
  fox: () => (
    <>
      <RPolygon
        points={[
          [12, 26],
          [14, 4],
          [28, 18],
        ]}
        seed={541}
        {...fillOpts(crayon.red)}
      />
      <RPolygon
        points={[
          [52, 26],
          [50, 4],
          [36, 18],
        ]}
        seed={542}
        {...fillOpts(crayon.red)}
      />
      <RPolygon
        points={[
          [10, 26],
          [54, 26],
          [32, 56],
        ]}
        seed={543}
        {...fillOpts(crayon.red)}
      />
      <RPolygon
        points={[
          [22, 38],
          [42, 38],
          [32, 56],
        ]}
        seed={544}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      {eyes(31, 9)}
      <circle cx={32} cy={52} r={2.6} fill={G} />
    </>
  ),
  bear: () => (
    <>
      <RCircle
        cx={15}
        cy={16}
        d={14}
        seed={551}
        {...fillOpts(crayon.orange, 2.2)}
      />
      <RCircle
        cx={49}
        cy={16}
        d={14}
        seed={552}
        {...fillOpts(crayon.orange, 2.2)}
      />
      <RCircle
        cx={32}
        cy={34}
        d={42}
        seed={553}
        {...fillOpts(crayon.orange, 2.4)}
      />
      <REllipse
        cx={32}
        cy={41}
        w={16}
        h={12}
        seed={554}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      {eyes(30, 9)}
      <circle cx={32} cy={39} r={2.6} fill={G} />
    </>
  ),
  bunny: () => (
    <>
      <REllipse
        cx={23}
        cy={14}
        w={10}
        h={26}
        seed={561}
        {...fillOpts(crayon.pink)}
      />
      <REllipse
        cx={41}
        cy={14}
        w={10}
        h={26}
        seed={562}
        {...fillOpts(crayon.pink)}
      />
      <RCircle
        cx={32}
        cy={38}
        d={36}
        seed={563}
        {...fillOpts(crayon.pink, 4)}
      />
      {eyes(35, 7)}
      <RPath
        d="M30 41 L34 41 L32 43 Z M32 43 L29 46 M32 43 L35 46"
        seed={564}
        strokeWidth={1.4}
      />
    </>
  ),
  penguin: () => (
    <>
      <REllipse
        cx={32}
        cy={34}
        w={42}
        h={50}
        seed={571}
        {...fillOpts(crayon.blue, 2.6)}
      />
      <REllipse
        cx={32}
        cy={38}
        w={28}
        h={36}
        seed={572}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      {eyes(30, 6)}
      <RPolygon
        points={[
          [28, 35],
          [36, 35],
          [32, 40],
        ]}
        seed={573}
        fill={crayon.orange}
        fillStyle="solid"
        strokeWidth={1.4}
      />
    </>
  ),
  octopus: () => (
    <>
      <RPath
        d="M14 40 C10 50 16 56 12 60 M22 44 C20 52 26 56 22 62 M32 46 C32 54 36 56 32 62 M42 44 C44 52 38 56 42 62 M50 40 C54 50 48 56 52 60"
        seed={581}
        stroke={crayon.purple}
        strokeWidth={3}
      />
      <REllipse
        cx={32}
        cy={28}
        w={42}
        h={38}
        seed={582}
        {...fillOpts(crayon.purple)}
      />
      {eyes(28)}
      {smile(583, 36)}
    </>
  ),
  robot: () => (
    <>
      <RPath d="M32 12 L32 4" seed={591} strokeWidth={2} />
      <RCircle
        cx={32}
        cy={4}
        d={6}
        seed={592}
        fill={crayon.red}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      <RRect
        x={12}
        y={12}
        w={40}
        h={40}
        seed={593}
        {...fillOpts(crayon.blue)}
      />
      <RRect
        x={20}
        y={22}
        w={8}
        h={8}
        seed={594}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      <RRect
        x={36}
        y={22}
        w={8}
        h={8}
        seed={595}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      <RPath
        d="M22 40 L42 40 M26 40 L26 44 M32 40 L32 44 M38 40 L38 44 M22 44 L42 44"
        seed={596}
        strokeWidth={1.6}
      />
    </>
  ),
  ghost: () => (
    <>
      <RPath
        d="M12 58 L12 28 C12 8 52 8 52 28 L52 58 L45 52 L38 58 L32 52 L26 58 L19 52 Z"
        seed={601}
        fill={ink.card}
        fillStyle="solid"
        strokeWidth={2}
      />
      <REllipse
        cx={25}
        cy={30}
        w={6}
        h={9}
        seed={602}
        fill={G}
        fillStyle="solid"
        strokeWidth={1}
      />
      <REllipse
        cx={39}
        cy={30}
        w={6}
        h={9}
        seed={603}
        fill={G}
        fillStyle="solid"
        strokeWidth={1}
      />
      <REllipse cx={32} cy={42} w={7} h={6} seed={604} strokeWidth={1.6} />
    </>
  ),
  alien: () => (
    <>
      <RPath d="M22 14 L16 4 M42 14 L48 4" seed={611} strokeWidth={2} />
      <RCircle
        cx={16}
        cy={4}
        d={6}
        seed={612}
        fill={crayon.yellow}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      <RCircle
        cx={48}
        cy={4}
        d={6}
        seed={613}
        fill={crayon.yellow}
        fillStyle="solid"
        strokeWidth={1.4}
      />
      <REllipse
        cx={32}
        cy={34}
        w={40}
        h={46}
        seed={614}
        {...fillOpts(crayon.green, 3.6)}
      />
      <REllipse
        cx={23}
        cy={32}
        w={11}
        h={15}
        seed={615}
        fill={G}
        fillStyle="solid"
        strokeWidth={1}
      />
      <REllipse
        cx={41}
        cy={32}
        w={11}
        h={15}
        seed={616}
        fill={G}
        fillStyle="solid"
        strokeWidth={1}
      />
      <RPath d="M28 47 L36 47" seed={617} strokeWidth={1.8} />
    </>
  ),
};

const CROWN = "M18 14 L22 2 L28 10 L32 0 L36 10 L42 2 L46 14 Z";

/**
 * A player's doodle avatar. Decorative unless `label` is given. `faded`
 * greys it out (disconnected players); `crown` marks the host.
 */
export function DoodleAvatar({
  avatar,
  size = 56,
  crown = false,
  faded = false,
  label,
  className,
}: {
  avatar: AvatarId;
  size?: number;
  crown?: boolean;
  faded?: boolean;
  label?: string;
  className?: string;
}) {
  const Drawing = DRAWINGS[avatar];
  return (
    <svg
      viewBox={crown ? "0 -14 64 78" : "0 0 64 64"}
      width={size}
      height={crown ? (size * 78) / 64 : size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      overflow="visible"
      className={cn(faded && "opacity-40 grayscale", className)}
    >
      {crown && (
        <g transform="translate(0 -14)">
          <RPath
            d={CROWN}
            seed={620}
            fill={crayon.yellow}
            fillStyle="solid"
            strokeWidth={1.6}
          />
        </g>
      )}
      <Drawing />
    </svg>
  );
}
