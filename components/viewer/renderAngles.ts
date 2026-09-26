// Kept out of ModelViewer.tsx so pages can read these without loading three.js.

/** Neutral light backdrop baked into pitch renders, independent of the page theme. */
export const STUDIO_BACKDROP = "#f6f4ef";

/** Studio angles for pitch renders, in radians around the part (polar 0 = straight down). */
export const RENDER_ANGLES: readonly { label: string; azimuth: number; polar: number }[] = [
  { label: "Front three-quarter", azimuth: Math.PI / 4, polar: Math.PI / 3 },
  { label: "Side", azimuth: Math.PI / 2, polar: Math.PI / 2.4 },
  { label: "Rear three-quarter", azimuth: (3 * Math.PI) / 4, polar: Math.PI / 3 },
  { label: "Top", azimuth: Math.PI / 4, polar: Math.PI / 8 },
];
