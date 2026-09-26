import { buildBusinessCase } from "../businessCase";
import { formatToolingRange, formatUnitCostRange } from "../format";
import { buildIterationStory } from "../iterationStory";
import { PROCESS_LABELS } from "../processes";
import { pitchAnswerSchema } from "../schemas";
import type { PitchContent, Project, ProjectVersion } from "../types";
import { runStructured, type CallTextModel } from "./structured";

export const PITCH_SYSTEM_PROMPT = `You write licensing pitches for independent inventors. The reader is a decision-maker at a company that might license, manufacture or stock the product: a product manager, a category buyer, a head of new business. They read dozens of these and have two minutes.

Write plainly and concretely, the way a good founder talks to a buyer:
- Lead with the customer's problem, then the product, then who buys it, then the ask.
- Use the facts in the brief: the product, how it gets made, the cost and business-case estimates, and how the design improved. Never invent facts, customers, sales figures, patents or partnerships. If something isn't in the brief, leave it out.
- Costs and margins are estimates; if you mention them, say so.
- No hype words (revolutionary, game-changing, disruptive), no exclamation marks.
- Keep every field inside its word limit.`;

function economicsLine(version: ProjectVersion): string {
  if (!version.analysis || !version.businessCase) return "Business case: not set up yet.";
  const { verdict, revenuePerUnit } = buildBusinessCase(version.analysis.paths, version.businessCase);
  return `Business case (estimate): ${verdict.headline} ${verdict.detail ?? ""} Retail $${version.businessCase.retailPriceUsd}, maker receives ~$${revenuePerUnit.toFixed(2)} per unit.`.trim();
}

/** Everything the pitch writer needs, for the version being pitched. */
export function buildPitchBrief(project: Project, version: ProjectVersion): string {
  const lines = [`Product: ${project.name}`, "", "What the inventor says it is:", version.notes.trim() || "(no notes given)"];
  const analysis = version.analysis;
  if (analysis) {
    const best = analysis.paths[0];
    lines.push(
      "",
      `Summary: ${analysis.productSummary}`,
      `Features: ${analysis.detectedFeatures.join("; ")}`,
      `Recommended process: ${PROCESS_LABELS[best.process]} (${best.materials.slice(0, 2).join(", ")}), est. ${formatUnitCostRange(best.unitCostUsd)} per unit, tooling ${formatToolingRange(best.toolingCostUsd)}, at ${version.targetQuantity.toLocaleString("en-US")} units.`,
      `Manufacturing recommendation: ${analysis.topRecommendation}`,
    );
  }
  lines.push(economicsLine(version));

  const story = buildIterationStory(project).filter((s) => s.to <= version.number);
  if (story.length) {
    lines.push("", "Design history:", ...story.map((s) => `- v${s.from} → v${s.to}: ${s.change ?? "revised"}. Result: ${s.summary}`));
  }
  lines.push("", "Write the pitch.");
  return lines.join("\n");
}

/** Generates the pitch text, with one retry that names what failed validation. */
export async function runPitchGeneration(callModel: CallTextModel, brief: string): Promise<PitchContent> {
  const answer = await runStructured(callModel, brief, {
    schema: pitchAnswerSchema,
    logTag: "pitch",
    refusalMessage: "The AI declined to write this pitch.",
    failMessage: "The AI's pitch didn't pass our checks. Please try again.",
  });
  return { ...answer, editedByUser: false };
}
