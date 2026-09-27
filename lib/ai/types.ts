import type { z } from "zod";
import type { AiErrorKind, KeySource } from "../types";
import type { TurnUsage } from "../usage/pricing";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** A system prompt block. `cache` marks a stable prefix for prompt caching. */
export type SystemBlock = { text: string; cache?: boolean };

export type ImagePart = { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };
export type ContentPart = { type: "text"; text: string } | ImagePart;
export type ChatMessage = { role: "user" | "assistant"; content: string | ContentPart[] };

/** What one model call returns, stripped to what the callers' retry loops need. */
export type ModelTurn = {
  stopReason: string | null;
  /** Parsed structured output, or null if the model produced none. */
  output: unknown;
  /** Token usage of the billed attempt. Absent when unknown. */
  usage?: TurnUsage;
};

/** Everything a provider needs for one call; the gateway fills the model settings from the routing table. */
export type ProviderCall = {
  model: string;
  maxTokens: number;
  effort: Effort;
  thinking: boolean;
  system: SystemBlock[];
  messages: ChatMessage[];
};

export type ProviderStreamEvent = { type: "text"; text: string } | { type: "final"; usage: TurnUsage; stopReason: string | null };

/** One AI provider behind the gateway. Adapters live in lib/ai/providers/ and are the only code that touches an SDK. */
export interface AiProvider {
  readonly name: "anthropic";
  parse(call: ProviderCall & { schema: z.ZodType }): Promise<ModelTurn>;
  stream(call: ProviderCall, signal: AbortSignal): AsyncGenerator<ProviderStreamEvent>;
}

const MESSAGES: Record<AiErrorKind, string> = {
  auth: "The AI provider rejected the API key.",
  rate_limit: "The AI provider is rate-limiting requests.",
  connection: "Couldn't reach the AI provider.",
  provider: "The AI provider returned an error.",
};

/**
 * A provider failure in the app's own terms. The message is fixed per kind:
 * provider messages can echo request details, so they're never carried here.
 */
export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    readonly keySource: KeySource,
    readonly status?: number,
  ) {
    super(MESSAGES[kind]);
    this.name = "AiError";
  }
}
