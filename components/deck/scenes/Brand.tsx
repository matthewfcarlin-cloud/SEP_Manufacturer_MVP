"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef } from "react";
import { ease, move, pick } from "../motion";
import { ideaCellOrigin, ideaGrid, landedCells, rail, stageX } from "../layout";
import type { Beat } from "../script";

const LOGO_ASPECT = 1200 / 282;

type LogoSpot = { x: number; y: number; w: number; opacity: number };

// Bottom-left, clear of the stage rail and the ring that circles its labels.
const corner: LogoSpot = { x: 64, y: 1080 - 40 - 150 / LOGO_ASPECT, w: 150, opacity: 1 };
const center = (w: number, y: number): LogoSpot => ({ x: (1920 - w) / 2, y, w, opacity: 1 });

// The wordmark is one object for the whole deck: big on the title, gone while
// the problem is set up (so the reveal lands), then parked in the corner.
const logoSpots: Partial<Record<Beat, LogoSpot>> = {
  title: center(1180, 330),
  moko: center(1500, 360),
  upload: corner,
  design: corner,
  make: corner,
  money: corner,
  launch: corner,
  sell: corner,
  before: corner,
  after: corner,
  reshoring: corner,
  inflection: corner,
  field: corner,
  whole: corner,
  model: corner,
  ask: center(900, 240),
  thanks: center(1300, 380),
};

export function Logo({ beat }: { beat: Beat }) {
  const spot = pick(logoSpots, beat, { ...center(1180, 330), opacity: 0 });
  return (
    <motion.img
      src="/brand/moko-logo-night.png"
      alt=""
      className="absolute left-0 top-0 max-w-none"
      initial={false}
      animate={{ x: spot.x, y: spot.y, width: spot.w, height: spot.w / LOGO_ASPECT, opacity: spot.opacity }}
      transition={move}
      draggable={false}
    />
  );
}

type Mark = { x: number; y: number; w: number; h: number; rotate?: number };

const landedPair = (() => {
  const a = ideaCellOrigin(landedCells[0]);
  return { x: a.x + ideaGrid.cell + ideaGrid.gap / 2, y: a.y + ideaGrid.cell / 2 };
})();

const aroundStage = (index: number): Mark => ({ x: stageX(index), y: rail.labelY + 20, w: 250, h: 120, rotate: -4 });

// Where the hand-drawn ring circles something, per beat. Centers, in canvas px.
const marks: Partial<Record<Beat, Mark>> = {
  landed: { x: landedPair.x, y: landedPair.y, w: 190, h: 150, rotate: 8 },
  idle: { x: 250, y: 204, w: 330, h: 250, rotate: -6 },
  upload: aroundStage(0),
  design: aroundStage(1),
  make: aroundStage(2),
  money: aroundStage(3),
  launch: aroundStage(4),
  sell: aroundStage(5),
  after: { x: 1270, y: 800, w: 640, h: 280, rotate: -3 },
  reshoring: { x: 436, y: 432, w: 880, h: 440, rotate: 4 },
  whole: { x: 960, y: 896, w: 1880, h: 260, rotate: -1 },
  demo: { x: 960, y: 524, w: 1860, h: 560, rotate: -3 },
};

const sameMark = (a?: Mark, b?: Mark) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

/**
 * The scribbled ring from the logo, used as a pen: on each beat it lifts off
 * whatever it was circling and draws itself around the next thing that matters.
 */
export function Ring({ beat }: { beat: Beat }) {
  const reduce = useReducedMotion();
  const drawn = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(0);
  const h = useMotionValue(0);
  const rotate = useMotionValue(0);
  const mask = useTransform(drawn, (d) => `conic-gradient(from 210deg, #000 ${d * 360}deg, transparent ${d * 360 + 0.5}deg)`);

  const mark = marks[beat];
  // What the ring is currently drawn around, so a beat that keeps the same mark doesn't redraw it.
  const placed = useRef<Mark | undefined>(undefined);

  useEffect(() => {
    const running: AnimationPlaybackControls[] = [];
    let cancelled = false;
    const place = (m: Mark) => {
      x.set(m.x - m.w / 2);
      y.set(m.y - m.h / 2);
      w.set(m.w);
      h.set(m.h);
      rotate.set(m.rotate ?? 0);
    };
    const run = async () => {
      if (reduce) {
        if (mark) place(mark);
        drawn.set(mark ? 1 : 0);
        return;
      }
      if (drawn.get() > 0 && !sameMark(placed.current, mark)) {
        const erase = animate(drawn, 0, { duration: 0.28, ease });
        running.push(erase);
        await erase;
      }
      if (cancelled || !mark) return;
      if (!sameMark(placed.current, mark) || drawn.get() === 0) {
        place(mark);
        placed.current = mark;
        const draw = animate(drawn, 1, { duration: 0.85, ease: [0.45, 0, 0.2, 1], delay: 0.25 });
        running.push(draw);
        await draw;
      }
    };
    void run();
    return () => {
      cancelled = true;
      running.forEach((a) => a.stop());
    };
  }, [mark, reduce, drawn, x, y, w, h, rotate]);

  return (
    <motion.img
      src="/brand/moko-ring.png"
      alt=""
      className="pointer-events-none absolute left-0 top-0 max-w-none"
      style={{ x, y, width: w, height: h, rotate, maskImage: mask, WebkitMaskImage: mask }}
      draggable={false}
    />
  );
}
