"use client";

import { motion } from "motion/react";
import { memo, useMemo } from "react";
import type { DeckFacts } from "@/lib/deckFacts";
import { color, ease } from "../motion";
import { ideaCellOrigin, ideaGrid, landedCells, machineCellOrigin, machineGrid } from "../layout";
import { isAtOrAfter, type Beat } from "../script";

type Place = { x: number; y: number; size: number };
type Look = { visible: boolean; fill: string; drop: number; delay: number };

/**
 * One set of squares shared by two slides: 250 ideas pitched in a year, which
 * then fly into the 81 machines in the demo shops. Most of the deck they sit
 * invisible, parked wherever they last were.
 */
export function Cells({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const machines = useMemo(
    () => facts.machineColumns.flatMap((column, c) => column.idle.map((idle, i) => ({ idle, ...machineCellOrigin(c, i) }))),
    [facts.machineColumns],
  );
  const onMachines = isAtOrAfter(beat, "machines");

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: ideaGrid.count }, (_, index) => {
        const machine = machines[index];
        const place: Place =
          onMachines && machine
            ? { x: machine.x, y: machine.y, size: machineGrid.cell }
            : { ...ideaCellOrigin(index), size: ideaGrid.cell };
        const look = lookFor(beat, index, machine?.idle);
        return <Cell key={index} {...place} {...look} />;
      })}
    </div>
  );
}

function lookFor(beat: Beat, index: number, idle: boolean | undefined): Look {
  const landed = landedCells.includes(index);
  switch (beat) {
    case "pitched":
      return { visible: true, fill: "#2c2b28", drop: 0, delay: 0.15 + index * 0.004 };
    case "landed":
      return { visible: true, fill: landed ? color.orange : color.cell, drop: 0, delay: landed ? 0.2 : 0 };
    case "died":
      return { visible: true, fill: landed ? color.orange : "#141413", drop: landed ? 0 : 36, delay: landed ? 0 : (index % 25) * 0.012 };
    case "machines":
      return { visible: idle !== undefined, fill: "#34332f", drop: 0, delay: index * 0.006 };
    case "idle":
      return { visible: idle !== undefined, fill: idle ? color.idle : "#1f1f1d", drop: 0, delay: idle ? 0.1 + index * 0.012 : 0 };
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
