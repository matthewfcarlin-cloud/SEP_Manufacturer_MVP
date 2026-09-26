// Kept apart from lib/geometry.ts so UI code can use it without pulling in three.js.

/** Thinnest wall most processes handle reliably (FDM ~0.8, molding ~1.0). */
export const MIN_WALL_MM = 1.0;
