import { formatDimensions } from "./format";
import { PROCESS_LABELS } from "./processes";
import type { Process, ProjectVersion } from "./types";

/**
 * What a shop sees before the owner shares anything more: the four facts
 * needed to say "we can quote that". No file, photos, notes or name.
 */
export type SpecSummary = { size: string; material: string; quantity: string; process: string };

export function specSummaryFor(version: ProjectVersion, process: Process): SpecSummary {
  const path = version.analysis?.paths.find((p) => p.process === process);
  return {
    size: version.geometry ? formatDimensions(version.geometry.boundingBoxMm) : "Not measured",
    material: path?.materials[0] ?? version.materialHints?.[0] ?? "To be confirmed",
    quantity: `${version.targetQuantity.toLocaleString("en-US")} units`,
    process: PROCESS_LABELS[process],
  };
}
