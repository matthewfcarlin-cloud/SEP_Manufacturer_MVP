import { PROCESS_LABELS } from "../processes";
import type { Bom, BomCategory, BomUnit, Process, ProjectVersion } from "../types";
import { CATEGORY_LABELS, runQuantity } from "./build";

// The BOM's interface for supplier sourcing (Alibaba plan, negotiation, and
// any future email outreach). Everything here is spec-level and safe to put
// in front of a supplier: no costs, no private notes, no product name.

export type BomSourcingLine = {
  name: string;
  spec: string;
  category: BomCategory;
  process?: Process;
  quantityPerProduct: number;
  unit: BomUnit;
  /** What the production run needs, at the version's target quantity. */
  runQuantity: number;
};

export type BomSourcingOptions = {
  /**
   * Only the custom parts made by this process: what one factory for that
   * process would quote. Omit for the whole BOM.
   */
  process?: Process;
};

/** The BOM's lines as a supplier may see them. Empty when the version has no BOM. */
export function bomSourcingLines(version: Pick<ProjectVersion, "bom" | "targetQuantity">, { process }: BomSourcingOptions = {}): BomSourcingLine[] {
  const bom: Bom | undefined = version.bom;
  if (!bom) return [];
  return bom.items
    .filter((i) => !process || (i.category === "custom_part" && i.process === process))
    .map((i) => ({
      name: i.name,
      spec: i.spec,
      category: i.category,
      ...(i.process && { process: i.process }),
      quantityPerProduct: i.quantityPerProduct,
      unit: i.unit,
      runQuantity: runQuantity(i, version.targetQuantity),
    }));
}

const unitLabel = (n: number, unit: BomUnit) => `${n.toLocaleString("en-US")} ${unit === "pc" && n !== 1 ? "pcs" : unit}`;

/**
 * The BOM as plain-text lines for an AI brief or a pasted RFQ, e.g.
 * "- Enclosure body (custom part, CNC milling): 6061-T6 aluminum… · 1 pc per unit, 250 pcs for the run".
 * Returns [] when there's nothing to list, so callers can spread it unconditionally.
 */
export function bomSpecText(version: Pick<ProjectVersion, "bom" | "targetQuantity">, options: BomSourcingOptions = {}): string[] {
  const lines = bomSourcingLines(version, options);
  if (!lines.length) return [];
  return [
    `Bill of materials (spec-level, safe to share; quantities for ${version.targetQuantity.toLocaleString("en-US")} units):`,
    ...lines.map((l) => {
      const kind = l.process ? `${CATEGORY_LABELS[l.category].toLowerCase()}, ${PROCESS_LABELS[l.process]}` : CATEGORY_LABELS[l.category].toLowerCase();
      return `- ${l.name} (${kind}): ${l.spec || "spec to follow"} · ${unitLabel(l.quantityPerProduct, l.unit)} per unit, ${unitLabel(l.runQuantity, l.unit)} for the run`;
    }),
  ];
}
