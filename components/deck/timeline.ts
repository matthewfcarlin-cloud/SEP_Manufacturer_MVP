export type Position = { slide: number; beat: number };

/** Beats per slide. */
export type Outline = readonly number[];

export const start: Position = { slide: 0, beat: 0 };

export function advance(position: Position, outline: Outline): Position {
  if (position.beat < outline[position.slide] - 1) return { slide: position.slide, beat: position.beat + 1 };
  if (position.slide < outline.length - 1) return { slide: position.slide + 1, beat: 0 };
  return position;
}

export function retreat(position: Position, outline: Outline): Position {
  if (position.beat > 0) return { slide: position.slide, beat: position.beat - 1 };
  if (position.slide > 0) {
    const slide = position.slide - 1;
    return { slide, beat: outline[slide] - 1 };
  }
  return position;
}

export function last(outline: Outline): Position {
  const slide = outline.length - 1;
  return { slide, beat: outline[slide] - 1 };
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), max);
}

/** `?slide=3&beat=2` (both 1-based) → a position; anything out of range is clamped. */
export function parsePosition(slideParam: string | undefined, beatParam: string | undefined, outline: Outline): Position {
  const slide = clamp(Number(slideParam ?? 1) - 1, outline.length - 1);
  const beat = clamp(Number(beatParam ?? 1) - 1, outline[slide] - 1);
  return { slide, beat };
}

export function toSearch(position: Position): string {
  const params = new URLSearchParams({ slide: String(position.slide + 1) });
  if (position.beat > 0) params.set("beat", String(position.beat + 1));
  return `?${params}`;
}

/** 0–1 progress through every beat of the deck. */
export function progress(position: Position, outline: Outline): number {
  const total = outline.reduce((sum, n) => sum + n, 0);
  const done = outline.slice(0, position.slide).reduce((sum, n) => sum + n, 0) + position.beat;
  return total > 1 ? done / (total - 1) : 1;
}
