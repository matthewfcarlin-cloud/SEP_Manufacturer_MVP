import { fail } from "@/lib/api";
import { buildAgentContext } from "@/lib/agent/context";
import { encodeAgentEvent, type AgentEvent } from "@/lib/agent/protocol";
import { agentRequestSchema } from "@/lib/agent/request";
import { isAiConfigured, streamAgentReply } from "@/lib/analysis/callers";
import { describeAiError } from "@/lib/analysis/errors";
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
    return fail("The build agent isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.", 503);
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

  const context = buildAgentContext(found.project, found.version, await learningContextFor(found.project, found.version));
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
      try {
        const reply = streamAgentReply({ workspaceId: ownerHash, context, messages: body.data.messages, signal: request.signal });
        for await (const event of reply) {
          if (event.type === "text") {
            send(event);
            continue;
          }
          send(
            event.stopReason === "refusal"
              ? { type: "error", message: "The AI declined to answer that. Try asking another way." }
              : { type: "done" },
          );
        }
      } catch (err) {
        if (!request.signal.aborted) {
          const { message, code } = describeAiError(err, "api/agent");
          send({ type: "error", message, ...(code && { code }) });
        }
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
