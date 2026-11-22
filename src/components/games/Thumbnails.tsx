"use client";

import { motion, type Variants } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import {
  RCircle,
  REllipse,
  RLine,
  RPath,
  RPolygon,
  RRect,
} from "@/components/sketch/Rough";
import type { ThumbnailKey } from "@/data/games";
import { spring, strokeEase } from "@/lib/motion";
import { crayon, ink } from "@/lib/palette";

/*
 * Every thumbnail is drawn on a 160×110 grid with rough.js (seeded, so the
 * SSR and client drawings match). Groups with `variants` respond to the
 * card's "hover" label with a small idle animation and settle back on
 * "shown".
 */

const G = ink.graphite;
const loop = (duration: number, repeatDelay = 0.15) => ({
  duration,
  repeat: Infinity,
  repeatDelay,
  ease: "easeInOut" as const,
});

const v = (
  rest: Record<string, number | string>,
  hover: Variants[string],
): Variants => ({
  shown: { ...rest, transition: spring },
  hover,
});

const drawIn: Variants = {
  shown: { pathLength: 0, opacity: 0, transition: { duration: 0.15 } },
  hover: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.45, ease: strokeEase },
  },
};

function Text({
  x,
  y,
  children,
  size = 18,
  color = G,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  color?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      className="font-hand"
    >
      {children}
    </text>
  );
}

function Snake() {
  return (
    <>
      <RCircle
        cx={128}
        cy={36}
        d={20}
        seed={1}
        fill={crayon.red}
        fillStyle="hachure"
        hachureGap={3}
      />
      <RPath
        d="M128 26 C130 20 134 18 138 18"
        seed={2}
        stroke={crayon.green}
        strokeWidth={2.4}
      />
      <motion.g
        variants={v(
          { x: 0, rotate: 0 },
          { x: [0, 4, -3, 0], rotate: [0, -3, 3, 0], transition: loop(0.7) },
        )}
      >
        <RPath
          d="M14 84 C30 52 50 98 70 72 S100 44 110 62"
          seed={3}
          stroke={crayon.green}
          strokeWidth={9}
          roughness={0.9}
        />
        <RCircle
          cx={112}
          cy={62}
          d={18}
          seed={4}
          fill={crayon.green}
          fillStyle="solid"
        />
        <circle cx={115} cy={59} r={2.2} fill={G} />
        <RPath
          d="M120 66 L128 68 M128 68 L131 65 M128 68 L131 71"
          seed={5}
          stroke={crayon.red}
          strokeWidth={1.6}
        />
      </motion.g>
    </>
  );
}

function TicTacToe() {
  return (
    <>
      <RLine x1={62} y1={12} x2={60} y2={100} seed={10} />
      <RLine x1={98} y1={10} x2={100} y2={98} seed={11} />
      <RLine x1={28} y1={40} x2={134} y2={38} seed={12} />
      <RLine x1={26} y1={70} x2={132} y2={72} seed={13} />
      <RPath
        d="M34 16 L54 34 M54 16 L34 34"
        seed={14}
        stroke={crayon.blue}
        strokeWidth={3}
      />
      <RCircle
        cx={80}
        cy={55}
        d={22}
        seed={15}
        stroke={crayon.red}
        strokeWidth={3}
      />
      <RPath
        d="M106 78 L126 96 M126 78 L106 96"
        seed={16}
        stroke={crayon.blue}
        strokeWidth={3}
      />
      <RCircle
        cx={44}
        cy={86}
        d={22}
        seed={17}
        stroke={crayon.red}
        strokeWidth={3}
      />
      <motion.path
        d="M106 16 L126 34 M126 16 L106 34"
        stroke={crayon.blue}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
        variants={drawIn}
      />
    </>
  );
}

function Memory() {
  return (
    <>
      <g transform="rotate(-8 40 55)">
        <RRect
          x={18}
          y={22}
          w={42}
          h={62}
          seed={20}
          fill={crayon.purple}
          fillStyle="cross-hatch"
          hachureGap={6}
        />
      </g>
      <motion.g
        variants={v(
          { scaleX: 1 },
          { scaleX: [1, 0.05, 1], transition: loop(0.6, 0.5) },
        )}
        style={{ originX: "80px", originY: "55px" }}
      >
        <RRect
          x={59}
          y={20}
          w={42}
          h={64}
          seed={21}
          fill={ink.card}
          fillStyle="solid"
        />
        <RPath
          d="M80 34 L84 46 L96 47 L86 54 L90 66 L80 59 L70 66 L74 54 L64 47 L76 46 Z"
          seed={22}
          fill={crayon.yellow}
          fillStyle="hachure"
          hachureGap={2.5}
          strokeWidth={1.6}
        />
      </motion.g>
      <g transform="rotate(9 122 56)">
        <RRect
          x={101}
          y={24}
          w={42}
          h={62}
          seed={23}
          fill={ink.card}
          fillStyle="solid"
        />
        <RPath
          d="M122 72 C108 62 106 54 110 48 C114 43 120 44 122 50 C124 44 130 43 134 48 C138 54 136 62 122 72 Z"
          seed={24}
          fill={crayon.red}
          fillStyle="hachure"
          hachureGap={2.5}
          strokeWidth={1.6}
        />
      </g>
    </>
  );
}

function Hangman() {
  return (
    <>
      <RPath
        d="M20 100 L70 100 M38 100 L38 12 L92 12 L92 24"
        seed={30}
        strokeWidth={2.6}
      />
      <RLine x1={38} y1={32} x2={56} y2={12} seed={31} />
      <motion.g
        variants={v(
          { rotate: 0 },
          { rotate: [-7, 7, -7], transition: loop(1.2, 0) },
        )}
        style={{ originX: "92px", originY: "24px" }}
      >
        <RCircle cx={92} cy={36} d={22} seed={32} />
        <RPath
          d="M92 47 L92 74 M92 56 L80 66 M92 56 L104 66 M92 74 L82 92 M92 74 L102 92"
          seed={33}
        />
      </motion.g>
      <RPath
        d="M112 96 L124 96 M130 96 L142 96 M148 96 L156 96"
        seed={34}
        stroke={crayon.orange}
        strokeWidth={2.6}
      />
      <Text x={118} y={86} size={16}>
        A
      </Text>
    </>
  );
}

function Pong() {
  return (
    <>
      <RPath
        d="M80 8 L80 22 M80 32 L80 46 M80 56 L80 70 M80 80 L80 94"
        seed={40}
        stroke={ink.sketch}
        strokeWidth={1.6}
      />
      <RRect
        x={14}
        y={30}
        w={10}
        h={38}
        seed={41}
        fill={crayon.red}
        fillStyle="solid"
      />
      <RRect
        x={136}
        y={44}
        w={10}
        h={38}
        seed={42}
        fill={crayon.blue}
        fillStyle="solid"
      />
      <motion.g
        variants={v(
          { x: 0, y: 0 },
          {
            x: [0, 46, 0, -46, 0],
            y: [0, -14, 0, 14, 0],
            transition: loop(1.4, 0),
          },
        )}
      >
        <RCircle
          cx={80}
          cy={56}
          d={14}
          seed={43}
          fill={crayon.yellow}
          fillStyle="solid"
        />
      </motion.g>
      <Text x={56} y={18}>
        3
      </Text>
      <Text x={104} y={18}>
        2
      </Text>
    </>
  );
}

function Flappy() {
  return (
    <>
      <RRect
        x={96}
        y={4}
        w={26}
        h={34}
        seed={50}
        fill={crayon.green}
        fillStyle="hachure"
        hachureGap={4}
      />
      <RRect
        x={92}
        y={32}
        w={34}
        h={10}
        seed={51}
        fill={crayon.green}
        fillStyle="solid"
      />
      <RRect
        x={96}
        y={78}
        w={26}
        h={30}
        seed={52}
        fill={crayon.green}
        fillStyle="hachure"
        hachureGap={4}
      />
      <RRect
        x={92}
        y={72}
        w={34}
        h={10}
        seed={53}
        fill={crayon.green}
        fillStyle="solid"
      />
      <RPath
        d="M10 96 C30 92 40 100 60 96"
        seed={54}
        stroke={ink.sketch}
        strokeWidth={1.4}
      />
      <motion.g
        variants={v(
          { y: 0, rotate: 0 },
          {
            y: [0, -10, 4, 0],
            rotate: [0, -10, 6, 0],
            transition: loop(0.8, 0),
          },
        )}
      >
        <REllipse
          cx={52}
          cy={56}
          w={36}
          h={28}
          seed={55}
          fill={crayon.yellow}
          fillStyle="hachure"
          hachureGap={3}
        />
        <RPath
          d="M44 58 C38 50 32 54 36 62 Z"
          seed={56}
          fill={ink.card}
          fillStyle="solid"
          strokeWidth={1.6}
        />
        <RPolygon
          points={[
            [69, 54],
            [80, 58],
            [69, 62],
          ]}
          seed={57}
          fill={crayon.orange}
          fillStyle="solid"
          strokeWidth={1.6}
        />
        <circle cx={60} cy={50} r={2.6} fill={G} />
      </motion.g>
    </>
  );
}

function T2048() {
  const tiles: Array<[number, number, string, string]> = [
    [0, 0, "2", crayon.yellow],
    [1, 0, "4", crayon.orange],
    [2, 1, "8", crayon.red],
    [0, 2, "2", crayon.yellow],
    [2, 2, "16", crayon.purple],
  ];
  return (
    <>
      <RRect x={36} y={6} w={98} h={98} seed={60} strokeWidth={2.4} />
      {tiles.map(([cx, cy, n, c], i) => (
        <g key={i}>
          <RRect
            x={42 + cx * 30}
            y={12 + cy * 30}
            w={26}
            h={26}
            seed={61 + i}
            fill={c}
            fillStyle="hachure"
            hachureGap={3}
            strokeWidth={1.6}
          />
          <Text x={55 + cx * 30} y={25 + cy * 30} size={n.length > 1 ? 15 : 18}>
            {n}
          </Text>
        </g>
      ))}
      <motion.g
        variants={v(
          { scale: 1 },
          { scale: [1, 1.25, 1], transition: loop(0.5, 0.5) },
        )}
        style={{ originX: "85px", originY: "55px" }}
      >
        <RRect
          x={72}
          y={42}
          w={26}
          h={26}
          seed={68}
          fill={crayon.green}
          fillStyle="hachure"
          hachureGap={3}
          strokeWidth={1.6}
        />
        <Text x={85} y={55} size={18}>
          4
        </Text>
      </motion.g>
    </>
  );
}

function Minesweeper() {
  const nums: Array<[number, number, string, string]> = [
    [1, 0, "1", crayon.blue],
    [2, 1, "2", crayon.green],
    [0, 2, "1", crayon.blue],
    [3, 2, "3", crayon.red],
  ];
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const cx = i % 4;
        const cy = Math.floor(i / 4);
        const covered = (cx + cy) % 3 === 0;
        return (
          <RRect
            key={i}
            x={22 + cx * 30}
            y={8 + cy * 32}
            w={28}
            h={30}
            seed={70 + i}
            strokeWidth={1.4}
            fill={covered ? ink.sketch : undefined}
            fillStyle="hachure"
            hachureGap={5}
          />
        );
      })}
      {nums.map(([cx, cy, n, c], i) => (
        <Text key={i} x={36 + cx * 30} y={23 + cy * 32} color={c}>
          {n}
        </Text>
      ))}
      <RCircle cx={96} cy={24} d={14} seed={83} fill={G} fillStyle="solid" />
      <RPath
        d="M96 13 L96 35 M85 24 L107 24 M89 17 L103 31 M103 17 L89 31"
        seed={84}
        strokeWidth={1.6}
      />
      <RLine x1={40} y1={44} x2={40} y2={66} seed={85} strokeWidth={2} />
      <motion.g
        variants={v(
          { skewY: 0, scaleX: 1 },
          {
            skewY: [0, -8, 6, 0],
            scaleX: [1, 0.85, 1.05, 1],
            transition: loop(0.7, 0),
          },
        )}
        style={{ originX: "40px", originY: "50px" }}
      >
        <RPolygon
          points={[
            [40, 44],
            [54, 50],
            [40, 56],
          ]}
          seed={86}
          fill={crayon.red}
          fillStyle="solid"
          strokeWidth={1.6}
        />
      </motion.g>
    </>
  );
}

function RPS() {
  const jig = (d: number) =>
    v(
      { y: 0, rotate: 0 },
      {
        y: [0, -6, 0],
        rotate: [0, d, 0],
        transition: { ...loop(0.5, 0.2), delay: Math.abs(d) / 40 },
      },
    );
  return (
    <>
      <motion.g variants={jig(-8)}>
        <RPath
          d="M14 70 C12 50 26 40 40 44 C52 40 60 52 56 66 C54 80 40 84 28 82 C20 81 15 77 14 70 Z"
          seed={90}
          fill={ink.sketch}
          fillStyle="hachure"
          hachureGap={3.5}
        />
      </motion.g>
      <motion.g variants={jig(6)}>
        <g transform="rotate(-6 80 56)">
          <RRect
            x={64}
            y={34}
            w={34}
            h={44}
            seed={91}
            fill={ink.card}
            fillStyle="solid"
          />
          <RPath
            d="M70 46 L92 46 M70 54 L92 54 M70 62 L86 62"
            seed={92}
            stroke={ink.rule}
            strokeWidth={1.4}
          />
        </g>
      </motion.g>
      <motion.g variants={jig(-5)}>
        <RCircle
          cx={118}
          cy={80}
          d={16}
          seed={93}
          stroke={crayon.red}
          strokeWidth={2.4}
        />
        <RCircle
          cx={142}
          cy={80}
          d={16}
          seed={94}
          stroke={crayon.red}
          strokeWidth={2.4}
        />
        <RPath
          d="M122 73 L148 30 M138 73 L114 30"
          seed={95}
          strokeWidth={2.6}
        />
      </motion.g>
      <Text x={80} y={98} size={14} color={ink.sketch}>
        vs
      </Text>
    </>
  );
}

function Whack() {
  return (
    <>
      <REllipse
        cx={40}
        cy={88}
        w={50}
        h={16}
        seed={100}
        fill={G}
        fillStyle="solid"
      />
      <REllipse
        cx={110}
        cy={88}
        w={50}
        h={16}
        seed={101}
        fill={G}
        fillStyle="solid"
      />
      <motion.g
        variants={v(
          { y: 6 },
          { y: [8, -8, -8, 8], transition: loop(0.9, 0.2) },
        )}
      >
        <RPath
          d="M92 88 C92 60 128 60 128 88"
          seed={102}
          fill="#A0703E"
          fillStyle="hachure"
          hachureGap={3}
        />
        <circle cx={104} cy={74} r={2.4} fill={G} />
        <circle cx={116} cy={74} r={2.4} fill={G} />
        <REllipse
          cx={110}
          cy={81}
          w={9}
          h={6}
          seed={103}
          fill={crayon.red}
          fillStyle="solid"
          strokeWidth={1.2}
        />
      </motion.g>
      <REllipse
        cx={110}
        cy={92}
        w={56}
        h={8}
        seed={104}
        fill={ink.card}
        fillStyle="solid"
        stroke="none"
      />
      <g transform="rotate(-30 50 40)">
        <RRect
          x={30}
          y={24}
          w={40}
          h={18}
          seed={105}
          fill={crayon.yellow}
          fillStyle="hachure"
          hachureGap={3}
        />
        <RRect
          x={46}
          y={42}
          w={8}
          h={38}
          seed={106}
          fill="#C28B52"
          fillStyle="solid"
        />
      </g>
      <REllipse
        cx={40}
        cy={92}
        w={56}
        h={8}
        seed={107}
        fill={ink.card}
        fillStyle="solid"
        stroke="none"
      />
    </>
  );
}

function Dots() {
  const pts = [0, 1, 2, 3].flatMap((x) =>
    [0, 1, 2].map((y) => [30 + x * 34, 18 + y * 36] as const),
  );
  return (
    <>
      <RRect
        x={30}
        y={18}
        w={34}
        h={36}
        seed={110}
        stroke="none"
        fill={crayon.yellow}
        fillStyle="hachure"
        hachureGap={3.5}
      />
      <RPath
        d="M30 18 L64 18 L64 54 L30 54 Z"
        seed={111}
        stroke={crayon.blue}
        strokeWidth={2.6}
      />
      <RPath
        d="M64 54 L98 54 L98 90 M98 18 L132 18"
        seed={112}
        stroke={crayon.red}
        strokeWidth={2.6}
      />
      <Text x={47} y={36} size={16}>
        A
      </Text>
      <motion.path
        d="M132 18 L132 54"
        stroke={crayon.blue}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        variants={drawIn}
      />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.4} fill={G} />
      ))}
    </>
  );
}

function Sudoku() {
  const digits: Array<[number, number, string]> = [
    [0, 0, "5"],
    [1, 0, "3"],
    [4, 0, "7"],
    [0, 1, "6"],
    [3, 1, "1"],
    [5, 1, "9"],
    [1, 2, "9"],
    [2, 2, "8"],
    [5, 2, "6"],
  ];
  return (
    <>
      <RRect x={26} y={10} w={108} h={90} seed={120} strokeWidth={2.6} />
      <RLine x1={62} y1={10} x2={62} y2={100} seed={121} strokeWidth={2.2} />
      <RLine x1={98} y1={10} x2={98} y2={100} seed={122} strokeWidth={2.2} />
      {[1, 2].map((i) => (
        <RLine
          key={i}
          x1={26}
          y1={10 + i * 30}
          x2={134}
          y2={10 + i * 30}
          seed={123 + i}
          strokeWidth={1.2}
          stroke={ink.sketch}
        />
      ))}
      {[1, 2, 4, 5].map((i) => (
        <RLine
          key={i}
          x1={26 + i * 18}
          y1={10}
          x2={26 + i * 18}
          y2={100}
          seed={126 + i}
          strokeWidth={1}
          stroke={ink.sketch}
        />
      ))}
      {digits.map(([cx, cy, n], i) => (
        <Text key={i} x={35 + cx * 18} y={25 + cy * 30} size={17}>
          {n}
        </Text>
      ))}
      <motion.g
        variants={{
          shown: { opacity: 0, y: 4, transition: { duration: 0.15 } },
          hover: { opacity: 1, y: 0, transition: spring },
        }}
      >
        <Text x={35 + 3 * 18} y={85} size={19} color={crayon.purple}>
          4
        </Text>
      </motion.g>
    </>
  );
}

function ConnectFour() {
  const filled: Record<string, string> = {
    "0-3": crayon.red,
    "1-3": crayon.yellow,
    "1-2": crayon.red,
    "2-3": crayon.yellow,
    "3-3": crayon.red,
    "2-2": crayon.yellow,
  };
  return (
    <>
      <RRect
        x={22}
        y={24}
        w={116}
        h={82}
        seed={130}
        fill={crayon.blue}
        fillStyle="hachure"
        hachureGap={5}
        strokeWidth={2.4}
      />
      {Array.from({ length: 16 }, (_, i) => {
        const cx = i % 4;
        const cy = Math.floor(i / 4);
        const c = filled[`${cx}-${cy}`];
        return (
          <RCircle
            key={i}
            cx={40 + cx * 27}
            cy={38 + cy * 19}
            d={15}
            seed={131 + i}
            strokeWidth={1.4}
            fill={c ?? ink.card}
            fillStyle={c ? "hachure" : "solid"}
            hachureGap={2.5}
          />
        );
      })}
      <motion.g
        variants={v(
          { y: -30, opacity: 0 },
          { y: [-30, 0, -4, 0], opacity: 1, transition: { duration: 0.6 } },
        )}
      >
        <RCircle
          cx={121}
          cy={95}
          d={15}
          seed={150}
          fill={crayon.red}
          fillStyle="hachure"
          hachureGap={2.5}
          strokeWidth={1.4}
        />
      </motion.g>
      <RPolygon
        points={[
          [115, 8],
          [127, 8],
          [121, 18],
        ]}
        seed={151}
        fill={crayon.red}
        fillStyle="solid"
        strokeWidth={1.4}
      />
    </>
  );
}

function WordSearch() {
  const rows = ["CATSQ", "PLAYZ", "DOGEM"];
  return (
    <>
      {rows.map((row, y) =>
        [...row].map((ch, x) => (
          <Text key={`${x}-${y}`} x={32 + x * 24} y={24 + y * 30} size={20}>
            {ch}
          </Text>
        )),
      )}
      <REllipse
        cx={68}
        cy={54}
        w={104}
        h={28}
        seed={160}
        stroke={crayon.orange}
        strokeWidth={2.6}
      />
      <motion.ellipse
        cx={56}
        cy={24}
        rx={44}
        ry={13}
        stroke={crayon.green}
        strokeWidth={2.8}
        fill="none"
        variants={drawIn}
      />
      <RPath
        d="M20 100 L40 100 M48 100 L74 100"
        seed={161}
        stroke={ink.sketch}
        strokeWidth={1.6}
      />
    </>
  );
}

function Checkers() {
  return (
    <>
      {Array.from({ length: 15 }, (_, i) => {
        const cx = i % 5;
        const cy = Math.floor(i / 5);
        return (cx + cy) % 2 === 1 ? (
          <RRect
            key={i}
            x={20 + cx * 24}
            y={20 + cy * 26}
            w={24}
            h={26}
            seed={170 + i}
            stroke="none"
            fill={G}
            fillStyle="hachure"
            hachureGap={3}
            fillWeight={1.2}
          />
        ) : null;
      })}
      <RRect x={20} y={20} w={120} h={78} seed={186} strokeWidth={2.4} />
      <RCircle
        cx={56}
        cy={33}
        d={18}
        seed={187}
        fill={crayon.red}
        fillStyle="hachure"
        hachureGap={2.5}
      />
      <RCircle cx={104} cy={85} d={18} seed={188} fill={G} fillStyle="solid" />
      <motion.g
        variants={v(
          { x: 0, y: 0 },
          { x: [0, 12, 24], y: [0, -22, -26], transition: loop(0.7, 0.4) },
        )}
      >
        <RCircle
          cx={56}
          cy={85}
          d={18}
          seed={189}
          fill={crayon.red}
          fillStyle="hachure"
          hachureGap={2.5}
        />
      </motion.g>
    </>
  );
}

function Chess() {
  return (
    <>
      <RPath d="M12 100 L148 100" seed={190} strokeWidth={2.4} />
      <RPath
        d="M44 98 L76 98 L72 88 L66 86 C66 72 72 66 72 58 C72 52 66 50 60 50 C54 50 48 52 48 58 C48 66 54 72 54 86 L48 88 Z"
        seed={191}
        fill={ink.card}
        fillStyle="solid"
      />
      <RCircle
        cx={60}
        cy={42}
        d={14}
        seed={192}
        fill={ink.card}
        fillStyle="solid"
      />
      <motion.g
        variants={v(
          { rotate: 0 },
          { rotate: [0, -8, 6, 0], transition: loop(0.8, 0.2) },
        )}
        style={{ originX: "110px", originY: "98px" }}
      >
        <RPath
          d="M92 98 L128 98 L124 86 L118 84 L122 48 L98 48 L102 84 L96 86 Z"
          seed={193}
          fill={G}
          fillStyle="hachure"
          hachureGap={3}
        />
        <RPath
          d="M96 48 L124 48 L120 38 L100 38 Z"
          seed={194}
          fill={G}
          fillStyle="solid"
        />
        <RPath
          d="M110 36 L110 18 M102 26 L118 26"
          seed={195}
          strokeWidth={2.6}
          stroke={crayon.yellow}
        />
      </motion.g>
    </>
  );
}

/** Speech bubble with a tail pointing down-left or down-right at a head. */
function bubblePath(x: number, y: number, w: number, tailRight: boolean) {
  const tx = tailRight ? x + w - 12 : x + 12;
  const tip = tailRight ? tx + 6 : tx - 6;
  return `M${x} ${y} L${x + w} ${y} L${x + w} ${y + 20} L${tx + 4} ${y + 20} L${tip} ${y + 28} L${tx - 4} ${y + 20} L${x} ${y + 20} Z`;
}

function Imposter() {
  const player = (cx: number, seed: number) => (
    <>
      <RPath
        d={`M${cx - 17} 108 C${cx - 17} 88 ${cx + 17} 88 ${cx + 17} 108`}
        seed={seed}
        strokeWidth={2}
      />
      <RCircle
        cx={cx}
        cy={72}
        d={26}
        seed={seed + 1}
        fill={ink.card}
        fillStyle="solid"
      />
    </>
  );
  return (
    <>
      {/* Two players who know the word */}
      {player(26, 200)}
      <circle cx={21} cy={70} r={1.8} fill={G} />
      <circle cx={31} cy={70} r={1.8} fill={G} />
      <RPath d="M20 77 C24 81 28 81 32 77" seed={202} strokeWidth={1.6} />
      <RPath d={bubblePath(4, 18, 46, false)} seed={203} strokeWidth={1.6} />
      <Text x={27} y={28} size={14}>
        pizza
      </Text>

      {player(134, 210)}
      <circle cx={129} cy={70} r={1.8} fill={G} />
      <circle cx={139} cy={70} r={1.8} fill={G} />
      <RPath d="M128 77 C132 81 136 81 140 77" seed={212} strokeWidth={1.6} />
      <RPath d={bubblePath(110, 18, 46, true)} seed={213} strokeWidth={1.6} />
      <Text x={133} y={28} size={14}>
        pizza
      </Text>

      {/* The imposter: pink-shaded, shifty eyes, bluffing "???" */}
      <RPath
        d="M63 108 C63 86 97 86 97 108"
        seed={220}
        strokeWidth={2}
        fill={crayon.pink}
        fillStyle="hachure"
        hachureGap={3}
      />
      <RCircle
        cx={80}
        cy={68}
        d={28}
        seed={221}
        fill={crayon.pink}
        fillStyle="hachure"
        hachureGap={3.5}
      />
      <motion.g
        variants={v({ x: 0 }, { x: [0, -3, 3, 0], transition: loop(0.9, 0.2) })}
      >
        <circle cx={76} cy={66} r={2} fill={G} />
        <circle cx={86} cy={66} r={2} fill={G} />
      </motion.g>
      <RPath d="M74 76 L86 75" seed={222} strokeWidth={1.8} />
      <motion.g
        variants={v(
          { rotate: 0 },
          { rotate: [0, -6, 6, 0], transition: loop(0.6, 0.3) },
        )}
        style={{ originX: "80px", originY: "40px" }}
      >
        <RPath
          d={bubblePath(58, 6, 44, false)}
          seed={223}
          strokeWidth={1.8}
          stroke={crayon.pink}
        />
        <Text x={80} y={16} size={16} color={crayon.pink}>
          ???
        </Text>
      </motion.g>
    </>
  );
}

const THUMBNAILS: Record<ThumbnailKey, ComponentType> = {
  snake: Snake,
  "tic-tac-toe": TicTacToe,
  memory: Memory,
  hangman: Hangman,
  pong: Pong,
  flappy: Flappy,
  "2048": T2048,
  minesweeper: Minesweeper,
  rps: RPS,
  whack: Whack,
  dots: Dots,
  sudoku: Sudoku,
  "connect-four": ConnectFour,
  "word-search": WordSearch,
  checkers: Checkers,
  chess: Chess,
  imposter: Imposter,
};

export const thumbnailKeys = Object.keys(THUMBNAILS) as ThumbnailKey[];

/**
 * Doodle thumbnail. Inside a GameCard it inherits the card's
 * "shown"/"hover" labels; elsewhere pass `state` to drive it directly.
 */
export function GameThumbnail({
  name,
  state,
  className,
}: {
  name: ThumbnailKey;
  state?: "shown" | "hover";
  className?: string;
}) {
  const Doodle = THUMBNAILS[name];
  return (
    <motion.svg
      viewBox="0 0 160 110"
      className={className}
      aria-hidden="true"
      focusable="false"
      overflow="visible"
      {...(state ? { initial: "shown", animate: state } : {})}
    >
      <Doodle />
    </motion.svg>
  );
}
