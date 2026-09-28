// Design tokens needed from script (design/DESIGN.md §2–3). Colors and
// sizes for styling live in app/globals.css; these are the ones JS reads.

/** Every transition: 160ms on the workshop curve. */
export const MOTION_MS = 160;
export const EASE = "cubic-bezier(.2,.8,.2,1)";

/** How long a toast stays up. */
export const TOAST_MS = 3000;

/** The stage-complete confetti burst: small, accent + green. */
export const CONFETTI = { particleCount: 60, spread: 70, startVelocity: 32, colors: ["#F25C2A", "#16A34A"] } as const;

/** Whether the viewer asked for less motion (no lift, shimmer or confetti). */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
