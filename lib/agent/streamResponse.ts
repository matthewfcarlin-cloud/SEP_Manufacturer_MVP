import { describeAiError } from "../analysis/errors";
import type { GatewayStreamEvent } from "../ai/gateway";
import { encodeAgentEvent, type AgentEvent } from "./protocol";

/** Streams an agent reply to the browser as newline-delimited JSON (lib/agent/protocol.ts). */
export function agentStreamResponse(reply: () => AsyncIterable<GatewayStreamEvent>, signal: AbortSignal, logLabel: string): Response {
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
        for await (const event of reply()) {
          if (event.type === "text") {
            send(event);
            continue;
          }
          send(event.stopReason === "refusal" ? { type: "error", message: "The AI declined to answer that. Try asking another way." } : { type: "done" });
        }
      } catch (err) {
        if (!signal.aborted) {
          const { message, code } = describeAiError(err, logLabel);
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
