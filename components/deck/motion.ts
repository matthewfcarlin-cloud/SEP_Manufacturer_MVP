import type { Transition } from "motion/react";
import type { Beat } from "./script";

export const ease = [0.2, 0, 0, 1] as const;

// Long enough that a presenter clicking ahead retargets a move mid-flight
// instead of watching it snap.
export const move: Transition = { duration: 1.2, ease };
export const fade: Transition = { duration: 0.6, ease };

/** The value for this beat, or the fallback when the beat doesn't set one. */
export function pick<T>(states: Partial<Record<Beat, T>>, beat: Beat, fallback: T): T {
  return states[beat] ?? fallback;
}

/** The 1920×1080 canvas every slide is laid out on; the stage scales it to the window. */
export const canvas = { w: 1920, h: 1080 };

/** Brand colors on the always-dark stage. The logo orange is brighter than the site's UI accent. */
export const color = {
  stage: "#0a0a0a",
  ink: "#efeeec",
  muted: "#8f8b83",
  faint: "#3a3936",
  line: "#232321",
  cell: "#1c1c1a",
  orange: "#ff4a00",
  idle: "#5fd39a",
};
