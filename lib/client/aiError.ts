// Classifies an AI call failure so the screen that made the call can say what
// happened and what to do. Shared by every AI feature's error banner.

export type AiErrorKind = "budget" | "key" | "busy" | "other";

/** An AI call failure that keeps its HTTP status (0 when unknown, e.g. mid-stream). */
export class AiCallError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AiCallError";
  }
}

export function classifyAiError(status: number, message: string): AiErrorKind {
  if (/\bAI budget\b/i.test(message)) return "budget";
  if (/api key|provider key|your key/i.test(message) || status === 401 || status === 402) return "key";
  if (status === 429 || status === 502 || status === 503) return "busy";
  return "other";
}
