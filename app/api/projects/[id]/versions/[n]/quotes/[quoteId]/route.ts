import { z } from "zod";
import { fail } from "@/lib/api";
import { advanceQuote } from "@/lib/outreach/pipeline";
import { editOutreach } from "@/lib/outreach/store";
import { quoteStatusSchema } from "@/lib/schemas";

const bodySchema = z.object({ status: quoteStatusSchema });

/** Moves a quote along its pipeline (Sent → Quoted → Sample → Ordered). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[id]/versions/[n]/quotes/[quoteId]">): Promise<Response> {
  const { id, n, quoteId } = await ctx.params;
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "status": "sample" }.', 400);
  return editOutreach(id, n, (outreach) => advanceQuote(outreach, quoteId, body.data.status));
}
