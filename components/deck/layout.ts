/** Shared positions on the 1920×1080 canvas, for objects that more than one scene points at. */

export const STAGES = ["Idea", "Design", "Make", "Money", "Launch", "Sell"] as const;

export const rail = { y: 170, labelY: 104, first: 240, step: 288 };

export function stageX(index: number): number {
  return rail.first + index * rail.step;
}

/** The problem slide's 25×10 grid: one cell per idea pitched in a year. */
export const ideaGrid = { columns: 25, cell: 40, gap: 14, x: 292, y: 400, count: 250 };

/** The two ideas that landed, side by side so one ring can circle both. */
export const landedCells = [112, 113];

export function ideaCellOrigin(index: number) {
  const step = ideaGrid.cell + ideaGrid.gap;
  return { x: ideaGrid.x + (index % ideaGrid.columns) * step, y: ideaGrid.y + Math.floor(index / ideaGrid.columns) * step };
}
