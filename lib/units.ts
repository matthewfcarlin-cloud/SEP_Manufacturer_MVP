import { formatNumber } from "./format";
import type { GeometryStats } from "./types";

// STL files carry no units. The app works in millimeters, so uploads say
// which unit the file was exported in and the server scales it to mm.
// STEP files record their own units and are converted automatically.

export const STL_UNITS = ["mm", "cm", "m", "in"] as const;
export type StlUnit = (typeof STL_UNITS)[number];

export const MM_PER_UNIT: Record<StlUnit, number> = { mm: 1, cm: 10, m: 1000, in: 25.4 };

export const UNIT_LABELS: Record<StlUnit, string> = {
  mm: "Millimeters",
  cm: "Centimeters",
  m: "Meters",
  in: "Inches",
};

/** "" means the default, millimeters. Anything unknown is null. */
export function parseStlUnit(raw: string): StlUnit | null {
  if (raw === "") return "mm";
  return (STL_UNITS as readonly string[]).includes(raw) ? (raw as StlUnit) : null;
}

/** Smaller than this across, a manufactured part was almost certainly exported in other units. */
const TINY_PART_MM = 5;
/** Bigger than this across, same (e.g. millimeters uploaded as inches). */
const HUGE_PART_MM = 3000;

/** A plain-language warning when a part's size suggests the wrong units, else null. */
export function scaleWarning(box: GeometryStats["boundingBoxMm"]): string | null {
  const largest = Math.max(box.x, box.y, box.z);
  if (largest < TINY_PART_MM) {
    return `This part is only ${formatNumber(largest)} mm across. If it was exported in inches or centimeters, upload it again as a new version and pick the right units.`;
  }
  if (largest > HUGE_PART_MM) {
    return `This part is ${formatNumber(largest / 1000)} m across. If that's not right, upload it again as a new version and pick the units the file was exported in.`;
  }
  return null;
}
