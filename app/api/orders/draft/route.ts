import { fail, ok } from "@/lib/api";
import { isAiConfigured, textCaller } from "@/lib/analysis/callers";
import { aiFailure } from "@/lib/analysis/errors";
import { buildAssemblerBrief, buildSupplierOrderBrief, runOrderDraft } from "@/lib/analysis/orders";
import { getAssemblerById } from "@/lib/orders/assemblers";
import { orderLinesFor } from "@/lib/orders/lines";
import { planWith, recipientProblem, withOrderDraft } from "@/lib/orders/ops";
import { emptyOrder } from "@/lib/orders/plan";
import { orderDraftRequestSchema } from "@/lib/orders/schemas";
import { changeOrder, newOrderId } from "@/lib/orders/store";
import { orderView } from "@/lib/orders/view";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

/**
 * Drafts one order email: a purchase order to a supplier or the assembler
 * (only while the user's sign-off matches the plan), or an assembly quote
 * request. Saved as that recipient's unsent draft; the user sends it.
 */
export async function POST(request: Request): Promise<Response> {
  const body = orderDraftRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "projectId": "...", "version": 1, "to": { "kind": "assembler", "assemblerId": "..." }, "purpose": "assembly_rfq" }.', 400);
  const { to, purpose } = body.data;

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const lines = orderLinesFor(found.version);
  const plan = planWith(found.version, found.version.order ?? emptyOrder(found.version), lines);
  if (purpose === "purchase_order" && !plan.signedOff) {
    return fail(plan.signOffStale ? "The plan changed after you signed off. Review it and sign off again first." : "Sign off on the order plan before writing purchase orders.", 409);
  }
  const problem = recipientProblem(found.version, plan, to, purpose);
  if (problem) return fail(problem, 400);

  const ownerHash = await aiBudgetGate("order");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("AI drafting isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server. You can still write the email yourself.", 503);
  }

  try {
    const brief = to.kind === "assembler" ? buildAssemblerBrief(plan, getAssemblerById(to.assemblerId)!, purpose) : buildSupplierOrderBrief(plan, to);
    const draft = await runOrderDraft(textCaller("order_draft", ownerHash), brief);
    const ctx = { now: new Date().toISOString(), newId: newOrderId };
    const result = await changeOrder(found.project.id, found.version.number, (v) => {
      const order = v.order ?? emptyOrder(v);
      const current = planWith(v, order, orderLinesFor(v));
      // The plan may have changed while the model was writing.
      if (purpose === "purchase_order" && current.fingerprint !== plan.fingerprint) {
        return { ok: false, error: "The plan changed while the email was being drafted. Review it and try again.", status: 409 };
      }
      return { ok: true, order: withOrderDraft(order, { to, purpose, subject: draft.subject, text: draft.message, aiDrafted: true }, ctx) };
    });
    if (!result.ok) return fail(result.error, result.status);
    return ok({ ...orderView(result.version!), rationale: draft.rationale });
  } catch (err) {
    return aiFailure(err, "api/orders/draft");
  }
}
