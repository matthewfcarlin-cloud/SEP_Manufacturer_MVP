/** "Step 3 of 6", shown beside the progress bar. */
export function stepLabel(step: number, total: number): string {
  return `Step ${step} of ${total}`;
}

/** How full the bar is, 0–100. */
export function progressPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}
