import { MIN_WALL_MM } from "../geometryLimits";
import { estimateMassGrams, REFERENCE_DENSITIES } from "../materials";
import { PROCESSES } from "../processes";
import { formatToolingRange, formatUnitCostRange } from "../format";
import { PROCESS_LABELS } from "../processes";
import type { GeometryStats, Project, ProjectVersion } from "../types";
import { getVersion } from "../versions";
import { changeNoteForAi, notesForAi } from "../aiInputs";

export function buildSystemPrompt(capacitySummary: string): string {
  return `You are a veteran manufacturing engineer and product developer. You have spent thirty years taking products from sketch to production in Los Angeles job shops: CNC, 3D printing, urethane casting, injection molding, sheet metal, and laser cutting. You are advising an independent inventor or small hardware team who has uploaded a part.

Your job is to work out how THIS part should be made, what it will cost, and what small design changes would make it cheaper or easier to make, so the inventor can pitch it to a manufacturer or licensee with confidence.

How to answer:
- Be specific to this part. Refer to its actual dimensions, volume, and the features you can see or infer. Generic design-for-manufacturing advice is not useful: "add draft" alone is not a tweak; "add 1-2° draft to the four 37 mm inner walls so the part releases from a straight-pull mold" is.
- Recommend 2-4 candidate processes, scored 0-100 for fit at the stated target quantity, best first. Only include a process if a real shop would plausibly quote it. The "process" field must be exactly one of: ${PROCESSES.join(", ")}.
- Quantity drives the answer. Roughly: under ~50 units favors 3D printing or CNC; ~50-500 favors CNC, SLS, or urethane casting; thousands and up justify injection-mold or die tooling. When the target quantity sits near a crossover, say where it flips.
- All money is an estimate in USD, given as a low-high range. Unit cost is per part at the target quantity and excludes tooling. Tooling is one-time (molds, fixtures, dies); use 0-0 when there is none. Lead time is calendar days to first delivered parts. Keep ranges honest: wide enough to be true, narrow enough to be useful. Anchor them in the part's size, material volume, and mass.
- unitCostAtVolume prices each path at 10, 100, 1,000 and 10,000 units (tooling excluded; the app amortizes it separately). This powers a cost-by-quantity chart, so price every volume honestly even where the process is a poor fit, and keep it consistent with unitCostUsd at the target quantity.
- Design tweaks: each one names a concrete change to this geometry, why it matters for that process, and the expected impact, quantified where you can. Prefer tweaks that let the part run on the idle local capacity listed below; designing around machines that are already sitting idle nearby is the whole point of this product.
- If the geometry report flags a problem (open mesh, thin walls), or the photos and notes disagree with the model, put it in risks.
- In detectedFeatures, list physical features (pockets, bosses, ribs, holes, threads, undercuts, cavities, text or logos). When you infer from photos rather than geometry, say "appears to".
- The storyboard is a 30-second TV-commercial-style pitch aimed at a decision-maker at a company that might manufacture, license, or stock this product: how will we sell this? Exactly 6 shots whose durations add up to 30 seconds. "visual" is what the camera sees; "voiceover" is the spoken line.
- Write plainly for a smart non-engineer. No marketing fluff outside the storyboard.

Length: this is read on a results page and presented live, so every field is short and scannable. Put the reasoning into the numbers and the tweaks, not into prose.
- productSummary: 2 sentences, under 50 words.
- topRecommendation: 2-3 sentences, under 70 words: what to do now, and the quantity where that changes.
- detectedFeatures: 4-8 items, each a short noun phrase under 8 words (e.g. "36 mm-deep open cavity").
- risks: 3-5 items, one sentence each, most important first.
- Per path: 2-4 pros and 2-4 cons, each under 15 words; 2-3 design tweaks, each "change" under 25 words, "why" and "impact" one sentence each.
- Storyboard lines: visual under 25 words, voiceover under 20 words.

Units: geometry comes from an STL and is read as millimeters. If the dimensions look implausible for the product described (for example a 3 mm guitar), say so in risks and reason about the likely intended scale.

Local shop capacity this month (fictional demo shops around Los Angeles):
${capacitySummary}`;
}

function fillPercent(g: GeometryStats): number {
  const { x, y, z } = g.boundingBoxMm;
  const boxCm3 = (x * y * z) / 1000;
  return boxCm3 > 0 ? Math.round((g.volumeCm3 / boxCm3) * 100) : 0;
}

function formatMass(volumeCm3: number): string {
  return REFERENCE_DENSITIES.map((m) => `${m.name} ~${estimateMassGrams(volumeCm3, m.gPerCm3)} g`).join(", ");
}

/**
 * Tells the model what this version changed, so it judges the change instead
 * of analyzing from zero. Empty for a first version.
 */
function revisionBlock(project: Project, version: ProjectVersion): string {
  if (version.basedOn === undefined) return "";
  const base = getVersion(project, version.basedOn);
  const best = base?.analysis?.paths[0];
  const lines = [`Revision: this is version ${version.number}, revised from version ${version.basedOn}.`];
  const changeNote = changeNoteForAi(version);
  if (changeNote) lines.push(`What the inventor changed: ${changeNote}`);
  if (version.appliedTweak) {
    const t = version.appliedTweak;
    lines.push(`It applies your earlier suggested tweak for ${PROCESS_LABELS[t.process]}: "${t.change}" (expected impact: ${t.impact})`);
  }
  if (base && best) {
    lines.push(
      `Version ${base.number}'s best path was ${PROCESS_LABELS[best.process]} (${best.fitScore}/100 fit) at ${formatUnitCostRange(best.unitCostUsd)} per unit, tooling ${formatToolingRange(best.toolingCostUsd)}, for ${base.targetQuantity.toLocaleString("en-US")} units.`,
    );
  }
  lines.push("Say in topRecommendation whether the change achieved what it set out to do.");
  return `\n${lines.join("\n")}\n`;
}

/** The per-version text block that follows the photos in the user turn. */
export function buildProjectBrief(project: Project, version: ProjectVersion, imageCount: number): string {
  const g = version.geometry;
  const geometry = g
    ? [
        `Bounding box: ${g.boundingBoxMm.x} × ${g.boundingBoxMm.y} × ${g.boundingBoxMm.z} mm`,
        `Material volume: ${g.volumeCm3} cm³ (if solid: ${formatMass(g.volumeCm3)})`,
        `Surface area: ${g.surfaceAreaCm2} cm²`,
        `Material fills ${fillPercent(g)}% of the bounding box`,
        ...(g.typicalWallMm !== undefined
          ? [`Typical wall thickness (area-weighted median, measured): ${g.typicalWallMm} mm`]
          : []),
        `Mesh: ${g.isWatertight ? "watertight" : "NOT watertight (open edges; volume may be unreliable)"}`,
        `Thin walls: ${g.thinWallWarning ? `yes, a meaningful share of the surface is under ${MIN_WALL_MM} mm thick` : `none significant under ${MIN_WALL_MM} mm`}`,
      ].join("\n")
    : "No CAD geometry was provided.";

  return `Project: ${project.name}

What the inventor says it is:
${notesForAi(version)}

Target quantity: ${version.targetQuantity.toLocaleString("en-US")} units
Budget: ${version.budgetUsd !== undefined ? `$${version.budgetUsd.toLocaleString("en-US")}` : "not given"}
Material ideas: ${version.materialHints?.length ? version.materialHints.join(", ") : "none given"}

Geometry measured from the STL:
${geometry}

Photos or sketches attached above: ${imageCount}
${revisionBlock(project, version)}
Analyze this part.`;
}
