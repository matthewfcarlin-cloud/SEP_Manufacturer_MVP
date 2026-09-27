import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { callClaudePlan, isClaudeConfigured } from "@/lib/analysis/claude";
import { aiFailure } from "@/lib/analysis/errors";
import { buildPlanBrief, runPlanDraft } from "@/lib/analysis/plan";
import { buildPlan, productionFacts, todayIso } from "@/lib/plan/schedule";
import { updateVersion } from "@/lib/projectStore";
import { aiBudgetGate } from "@/lib/usage/gate";
import { metered } from "@/lib/usage/metered";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive().optional() });

/** Claude drafts the launch milestones; the code dates them from the chosen quote (or analysis). Replaces any plan. */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);
  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  if (!found.version.analysis) return fail("Analyze this version before planning its launch.", 422);
  if (!isClaudeConfigured()) return fail("AI planning isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  const ownerHash = await aiBudgetGate("plan");
  if (ownerHash instanceof Response) return ownerHash;

  try {
    const facts = productionFacts(found.version);
    const draft = await runPlanDraft(metered(callClaudePlan, ownerHash, "plan"), buildPlanBrief(found.project, found.version, facts));
    const plan = buildPlan(draft, found.version, new Date().toISOString(), todayIso());
    const saved = await updateVersion(found.project.id, found.version.number, (v) => ({ ...v, plan }));
    return saved ? ok(plan, 201) : fail("This version was removed while it was being planned.", 404);
  } catch (err) {
    return aiFailure(err, "api/plan");
  }
}
