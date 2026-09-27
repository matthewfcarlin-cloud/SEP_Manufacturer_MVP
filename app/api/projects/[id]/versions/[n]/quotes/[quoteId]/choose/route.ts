import { chooseQuote } from "@/lib/outreach/pipeline";
import { editOutreach } from "@/lib/outreach/store";
import { redatePlan } from "@/lib/plan/schedule";

/** Saves this quote as the chosen one on the version. */
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/quotes/[quoteId]/choose">): Promise<Response> {
  const { id, n, quoteId } = await ctx.params;
  // Choosing a quote re-dates an existing launch plan (no AI call).
  return editOutreach(id, n, (outreach) => chooseQuote(outreach, quoteId), (version) =>
    version.plan ? { ...version, plan: redatePlan(version.plan, version) } : version,
  );
}
