import type { OrderLine, ProjectVersion } from "../types";
import { bomSourcingLines } from "../bom/sourcing";
import { pathFor } from "../sourcing/targets";

// The order layer's only view of the bill of materials. lib/bom owns the BOM;
// this adapter maps its supplier-safe lines to `OrderLine` so the planner never
// depends on the BOM's storage shape. Without a BOM, the product is treated as
// one custom part made by the process the user is sourcing (or the top path).

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
 * The BOM's lines, through its supplier-safe view (`bomSourcingLines`): spec,
 * quantity and process only, never costs or private notes. Empty without a BOM.
 */
function bomLines(version: ProjectVersion): OrderLine[] {
  return bomSourcingLines(version).map((l) => ({
    id: l.id,
    name: l.name,
    kind: l.category,
    quantityPerUnit: l.quantityPerProduct,
    unit: l.unit,
    ...(l.spec && { spec: l.spec }),
    ...(l.process && { process: l.process }),
  }));
}
