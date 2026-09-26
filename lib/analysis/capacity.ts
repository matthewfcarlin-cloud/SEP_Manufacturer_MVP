import { PROCESS_LABELS, PROCESSES } from "../processes";
import type { Shop } from "../types";

/**
 * One line per process describing local capacity, e.g.
 * "- CNC milling: 16 machines at 11 shops, 6 idle this month (largest idle envelope 1270 × 508 × 635 mm). Materials: ...".
 * Deterministic for a given seed file, so it can live in the cached system prompt.
 */
export function summarizeCapacity(shops: readonly Shop[]): string {
  const lines = PROCESSES.map((process) => {
    const entries = shops.flatMap((shop) =>
      shop.machines.filter((m) => m.type === process).map((m) => ({ shop, m })),
    );
    if (entries.length === 0) return `- ${PROCESS_LABELS[process]}: none locally.`;

    const idle = entries.filter((e) => e.m.idleThisMonth);
    const shopCount = new Set(entries.map((e) => e.shop.id)).size;
    const largestIdle = idle
      .map((e) => e.m.envelopeMm)
      .sort((a, b) => b.x * b.y * b.z - a.x * a.y * a.z)[0];
    const materials = [...new Set(entries.flatMap((e) => e.m.materials))].sort();
    const minQty = Math.min(...entries.map((e) => e.shop.minOrderQty));
    const maxQty = Math.max(...entries.map((e) => e.shop.maxOrderQty));

    const idleText = largestIdle
      ? `${idle.length} idle this month (largest idle envelope ${largestIdle.x} × ${largestIdle.y} × ${largestIdle.z} mm)`
      : "none idle this month";
    return (
      `- ${PROCESS_LABELS[process]} (${process}): ${entries.length} machines at ${shopCount} shops, ${idleText}. ` +
      `Those shops take orders of ${minQty}-${maxQty.toLocaleString("en-US")} units. Materials: ${materials.join(", ")}.`
    );
  });
  return lines.join("\n");
}
