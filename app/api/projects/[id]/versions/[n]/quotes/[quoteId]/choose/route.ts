import { chooseQuote } from "@/lib/outreach/pipeline";
import { editOutreach } from "@/lib/outreach/store";

/** Saves this quote as the chosen one on the version. */
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/quotes/[quoteId]/choose">): Promise<Response> {
  const { id, n, quoteId } = await ctx.params;
  return editOutreach(id, n, (outreach) => chooseQuote(outreach, quoteId));
}
