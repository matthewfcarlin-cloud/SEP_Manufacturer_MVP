"use client";

import { motion } from "motion/react";
import { memo } from "react";
import { color, ease } from "../motion";
import { ideaCellOrigin, ideaGrid, landedCells } from "../layout";
import type { Beat } from "../script";

type Place = { x: number; y: number; size: number };
type Look = { visible: boolean; fill: string; drop: number; delay: number };

/**
 * One square per idea Kendall pitches in a year. Two light up; the rest fall
 * away. After the problem slide they sit invisible.
 */
export function Cells({ beat }: { beat: Beat }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: ideaGrid.count }, (_, index) => (
        <Cell key={index} {...ideaCellOrigin(index)} size={ideaGrid.cell} {...lookFor(beat, index)} />
      ))}
    </div>
  );
}

function lookFor(beat: Beat, index: number): Look {
  const landed = landedCells.includes(index);
  switch (beat) {
    case "pitched":
      return { visible: true, fill: "#2c2b28", drop: 0, delay: 0.15 + index * 0.004 };
    case "landed":
      return { visible: true, fill: landed ? color.orange : color.cell, drop: 0, delay: landed ? 0.2 : 0 };
    case "died":
      return { visible: true, fill: landed ? color.orange : "#141413", drop: landed ? 0 : 36, delay: landed ? 0 : (index % 25) * 0.012 };
    default:
      return { visible: false, fill: color.cell, drop: 0, delay: 0 };
  }
}

type CellProps = Place & Look;

// Memoised on primitives: every scene stays mounted, so without this all 250
// cells re-render on every beat of the deck.
const Cell = memo(function Cell({ x, y, size, visible, fill, drop, delay }: CellProps) {
  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={false}
      animate={{
        x,
        y: y + drop,
        width: size,
        height: size,
        opacity: visible ? (drop ? 0.35 : 1) : 0,
        backgroundColor: fill,
      }}
      transition={{ duration: 0.9, ease, delay }}
    />
  );
});
