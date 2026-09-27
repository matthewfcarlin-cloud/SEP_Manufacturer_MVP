import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { textCaller, isAiConfigured } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { buildNegotiationBrief, runSupplierDraft } from "@/lib/analysis/sourcing";
import { withDraft } from "@/lib/sourcing/ops";
import { changeSourcing, opContext } from "@/lib/sourcing/store";
import { negotiationTargets } from "@/lib/sourcing/targets";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

const bodySchema = z.object({ projectId: z.string(), version: z.number().int().positive(), supplierId: z.string() });

/**
 * Drafts the next message to one supplier (first contact or a counter-offer)
 * and saves it as that supplier's unsent draft. The user sends it themselves.
 */
export async function POST(request: Request): Promise<Response> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1, "supplierId": "..." }.', 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const sourcing = found.version.sourcing;
  const supplier = sourcing?.suppliers.find((s) => s.id === body.data.supplierId);
  if (!sourcing || !supplier) return fail("That supplier isn't on this version's list anymore.", 404);
  const targets = negotiationTargets(found.version, sourcing.plan?.process);
  if (!targets) return fail("Analyze this version before drafting supplier messages.", 422);

  const ownerHash = await aiBudgetGate("negotiation");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("AI drafting isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server. You can still write messages yourself.", 503);
  }

  try {
    const others = sourcing.suppliers.filter((s) => s.id !== supplier.id && s.status !== "dropped").length;
    const brief = buildNegotiationBrief(found.project, found.version, sourcing.plan, supplier, others, targets);
    const draft = await runSupplierDraft(textCaller("negotiation", ownerHash), brief, targets);
    const ctx = opContext();
    const result = await changeSourcing(found.project.id, found.version.number, (current) => {
      const target = current?.suppliers.find((s) => s.id === supplier.id);
      if (!current || !target) return { ok: false, error: "That supplier was removed while the message was being drafted.", status: 404 };
      const updated = withDraft(target, draft.message, true, ctx, draft.subject);
      return { ok: true, sourcing: { ...current, suppliers: current.suppliers.map((s) => (s.id === supplier.id ? updated : s)) } };
    });
    return result.ok ? ok({ sourcing: result.sourcing, rationale: draft.rationale }) : fail(result.error, result.status);
  } catch (err) {
    return aiFailure(err, "api/sourcing/draft");
  }
}
