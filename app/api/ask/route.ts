import { fail } from "@/lib/api";
import { generalAgentRequestSchema } from "@/lib/agent/request";
import { agentStreamResponse } from "@/lib/agent/streamResponse";
import { isAiConfigured, streamGeneralReply } from "@/lib/analysis/callers";
import { aiBudgetGate } from "@/lib/usage/gate";

export const maxDuration = 120;

/** Ask Moko's full page: general questions, not tied to a product. Budget-gated like every AI route. */
export async function POST(request: Request): Promise<Response> {
  const body = generalAgentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid conversation.", 400);
  const ownerHash = await aiBudgetGate("chat");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("Ask Moko isn't set up yet: add ANTHROPIC_API_KEY to .env.local, or your own key in Settings.", 503);
  }
  return agentStreamResponse(() => streamGeneralReply({ workspaceId: ownerHash, messages: body.data.messages, signal: request.signal }), request.signal, "api/ask");
}
