import { currentOwnerHash } from "@/lib/access";
import { recordEvent } from "@/lib/learning/record";
import { chooseQuote } from "@/lib/outreach/pipeline";
import { editOutreach } from "@/lib/outreach/store";
import { redatePlan } from "@/lib/plan/schedule";

/** Saves this quote as the chosen one on the version. */
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/quotes/[quoteId]/choose">): Promise<Response> {
  const { id, n, quoteId } = await ctx.params;
  // Choosing a quote re-dates an existing launch plan (no AI call).
  return editOutreach(
    id,
    n,
    (outreach) => chooseQuote(outreach, quoteId),
    (version) => (version.plan ? { ...version, plan: redatePlan(version.plan, version) } : version),
    async (outreach, { version, access }) => {
      const quote = outreach.quotes.find((q) => q.id === quoteId);
      if (!quote) return;
      await recordEvent({
        workspaceId: await currentOwnerHash(),
        projectId: id,
        version,
        access,
        type: "quote_chosen",
        payload: { process: quote.process, quantity: quote.quantity, unitPriceUsd: quote.unitPriceUsd, leadTimeDays: quote.leadTimeDays },
        simulated: true, // demo quotes
      });
    },
  );
}
