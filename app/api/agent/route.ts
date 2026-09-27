import { fail } from "@/lib/api";
import { buildAgentContext } from "@/lib/agent/context";
import { AGENT_PAGE_LABELS } from "@/lib/agent/pages";
import { agentRequestSchema } from "@/lib/agent/request";
import { agentStreamResponse } from "@/lib/agent/streamResponse";
import { isAiConfigured, streamAgentReply } from "@/lib/analysis/callers";
import { recordEvent } from "@/lib/learning/record";
import { learningContextFor } from "@/lib/learning/retrieval";
import { aiBudgetGate } from "@/lib/usage/gate";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

/**
 * Streams the build agent's answer as newline-delimited JSON (lib/agent/protocol.ts).
 * Budget-gated like every AI route; the gateway meters it (the real cost when
 * the answer finishes, or the chat estimate if it's cut off after text has streamed).
 */
export async function POST(request: Request): Promise<Response> {
  const body = agentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid conversation.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  const ownerHash = await aiBudgetGate("chat");
  if (ownerHash instanceof Response) return ownerHash;
  if (!(await isAiConfigured(ownerHash))) {
    return fail("Ask Moko isn't set up yet: add ANTHROPIC_API_KEY to .env.local, or your own key in Settings.", 503);
  }

  // Only the conversation's length is logged, never what was asked.
  await recordEvent({
    workspaceId: ownerHash,
    projectId: found.project.id,
    version: found.version.number,
    access: found.access,
    type: "agent_question",
    payload: { turnCount: body.data.messages.length },
  });

  const base = buildAgentContext(found.project, found.version, await learningContextFor(found.project, found.version));
  const page = body.data.page ? `\n\nThe creator is on the product's "${AGENT_PAGE_LABELS[body.data.page]}" page right now; start from what that page is for.` : "";
  return agentStreamResponse(
    () => streamAgentReply({ workspaceId: ownerHash, context: base + page, messages: body.data.messages, signal: request.signal }),
    request.signal,
    "api/agent",
  );
}
