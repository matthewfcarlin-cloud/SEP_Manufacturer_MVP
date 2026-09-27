import { fail } from "@/lib/api";
import { buildAgentContext } from "@/lib/agent/context";
import { encodeAgentEvent, type AgentEvent } from "@/lib/agent/protocol";
import { agentRequestSchema } from "@/lib/agent/request";
import { isClaudeConfigured, streamAgentReply } from "@/lib/analysis/claude";
import { describeAiError } from "@/lib/analysis/errors";
import { ACTION_ESTIMATE_USD, recordSpend } from "@/lib/usage/budget";
import { aiBudgetGate } from "@/lib/usage/gate";
import { costOfTurn } from "@/lib/usage/pricing";
import { findVersion } from "@/lib/versionLookup";

export const maxDuration = 120;

/**
 * Streams the build agent's answer as newline-delimited JSON (lib/agent/protocol.ts).
 * Budget-gated like every AI route; the real cost is charged when the answer
 * finishes, or the chat estimate if it's cut off after text has streamed.
 */
export async function POST(request: Request): Promise<Response> {
  const body = agentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid conversation.", 400);

  const found = await findVersion(body.data.projectId, body.data.version);
  if (found instanceof Response) return found;
  if (!isClaudeConfigured()) {
    return fail("The build agent isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
  }
  const ownerHash = await aiBudgetGate("chat");
  if (ownerHash instanceof Response) return ownerHash;

  const context = buildAgentContext(found.project, found.version);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeAgentEvent(event)));
        } catch {
          // The browser went away; nothing left to tell it.
        }
      };
      let hasStreamedText = false;
      let isCharged = false;
      try {
        for await (const event of streamAgentReply({ context, messages: body.data.messages, signal: request.signal })) {
          if (event.type === "text") {
            hasStreamedText = true;
            send(event);
            continue;
          }
          await recordSpend(ownerHash, costOfTurn(event.usage));
          isCharged = true;
          send(
            event.stopReason === "refusal"
              ? { type: "error", message: "The AI declined to answer that. Try asking another way." }
              : { type: "done" },
          );
        }
      } catch (err) {
        if (hasStreamedText && !isCharged) await recordSpend(ownerHash, ACTION_ESTIMATE_USD.chat);
        if (!request.signal.aborted) send({ type: "error", message: describeAiError(err, "api/agent").message });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by a disconnect.
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
