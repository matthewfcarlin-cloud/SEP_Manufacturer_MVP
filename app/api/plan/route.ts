import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { isAiConfigured, textCaller } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { buildPlanBrief, runPlanDraft } from "@/lib/analysis/plan";
import { buildPlan, productionFacts, todayIso } from "@/lib/plan/schedule";
import { updateVersion } from "@/lib/projectStore";
import { aiBudgetGate } from "@/lib/usage/gate";
import { recordEvent } from "@/lib/learning/record";
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
  const ownerHash = await aiBudgetGate("plan");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) return fail("AI planning isn't set up yet: add ANTHROPIC_API_KEY to .env.local, or your own key in Settings.", 503);

  try {
    const facts = productionFacts(found.version);
    const draft = await runPlanDraft(textCaller("plan", ownerHash), buildPlanBrief(found.project, found.version, facts));
    const plan = buildPlan(draft, found.version, new Date().toISOString(), todayIso());
    const saved = await updateVersion(found.project.id, found.version.number, (v) => ({ ...v, plan }));
    if (!saved) return fail("This version was removed while it was being planned.", 404);
    await recordEvent({ workspaceId: ownerHash, projectId: found.project.id, version: found.version.number, access: found.access, type: "plan_generated", payload: {} });
    return ok(plan, 201);
  } catch (err) {
    return aiFailure(err, "api/plan");
  }
}
