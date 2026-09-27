// The build agent streams newline-delimited JSON: text deltas, then "done"
// or "error". Shared by the route and the chat panel.

import type { AiErrorCode } from "../types";

// `code` on an error is set for AI failures the UI handles specially (see AiErrorCode).
export type AgentEvent = { type: "text"; text: string } | { type: "done" } | { type: "error"; message: string; code?: AiErrorCode };

export function encodeAgentEvent(event: AgentEvent): string {
  return `${JSON.stringify(event)}\n`;
}

/** Parses the complete lines in `buffer`; `rest` is a partial line to prepend to the next chunk. */
export function decodeAgentEvents(buffer: string): { events: AgentEvent[]; rest: string } {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const events = lines.filter((l) => l.trim()).map((l) => JSON.parse(l) as AgentEvent);
  return { events, rest };
}
