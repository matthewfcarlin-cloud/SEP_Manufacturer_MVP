import type { OrderLine, ProjectVersion } from "../types";
import { pathFor } from "../sourcing/targets";

// The order layer's only view of the bill of materials. The BOM module
// ("BOM generator for sourcing") owns the BOM itself; this adapter maps its
// lines to `OrderLine` so the planner never depends on the BOM's storage
// shape. Until a version has a BOM, the product is treated as one custom part
// made by the process the user is sourcing (or the analysis's top path).

/** The id of the single line used when a version has no BOM yet. */
export const MAIN_PART_LINE_ID = "main-part";

export function orderLinesFor(version: ProjectVersion): OrderLine[] {
  const fromBom = bomLines(version);
  if (fromBom.length) return fromBom;
  const process = mainProcess(version);
  const path = pathFor(version, process);
  return [
    {
      id: MAIN_PART_LINE_ID,
      name: "Main part",
      kind: "custom_part",
      unit: "pc",
      quantityPerUnit: 1,
      process: path?.process ?? process,
      material: path?.materials[0] ?? version.materialHints?.[0],
    },
  ];
}

/** The process the user has already committed to, if any: a chosen local quote, then the Alibaba plan. */
function mainProcess(version: ProjectVersion) {
  const chosen = version.outreach?.quotes.find((q) => q.id === version.outreach?.chosenQuoteId);
  return chosen?.process ?? version.sourcing?.plan?.process;
}

/**
 * Hook-up point for the BOM module. Map each BOM line to an OrderLine here
 * once `version.bom` lands; nothing else in lib/orders reads the BOM.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- filled in when the BOM lands
function bomLines(version: ProjectVersion): OrderLine[] {
  return [];
}
