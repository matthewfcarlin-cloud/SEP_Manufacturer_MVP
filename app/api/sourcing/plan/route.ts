import { fail, ok } from "@/lib/api";
import { textCaller, isAiConfigured } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { buildSourcingPlanBrief, runSourcingPlan } from "@/lib/analysis/sourcing";
import { EMPTY_SOURCING } from "@/lib/sourcing/ops";
import { planRequestSchema } from "@/lib/sourcing/schemas";
import { changeSourcing } from "@/lib/sourcing/store";
import { negotiationTargets } from "@/lib/sourcing/targets";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 60;

/** Plans the Alibaba search (search terms, what to check, an RFQ) for one manufacturing path, replacing any earlier plan. */
export async function POST(request: Request): Promise<Response> {
  const body = planRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1 }.', 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const targets = negotiationTargets(found.version, body.data.process);
  if (!targets) return fail("Analyze this version before planning a supplier search.", 422);

  const ownerHash = await aiBudgetGate("sourcing");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("AI sourcing isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  }

  try {
    const answer = await runSourcingPlan(textCaller("sourcing_plan", ownerHash), buildSourcingPlanBrief(found.project, found.version, targets));
    const plan = { ...answer, process: targets.process, createdAt: new Date().toISOString() };
    const result = await changeSourcing(found.project.id, found.version.number, (current) => ({ ok: true, sourcing: { ...(current ?? EMPTY_SOURCING), plan } }));
    return result.ok ? ok(result.sourcing) : fail(result.error, result.status);
  } catch (err) {
    return aiFailure(err, "api/sourcing/plan");
  }
}
