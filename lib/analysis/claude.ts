import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { analysisOutputSchema, pitchOutputSchema, priceSuggestionOutputSchema } from "../schemas";
import { getShops } from "../shops";
import { summarizeCapacity } from "./capacity";
import type { CallTextModel } from "./structured";
import { tolerateUnparseableOutput } from "./structuredOutput";
import { AGENT_SYSTEM_PROMPT } from "../agent/prompt";
import type { AgentMessage } from "../types";
import { PITCH_SYSTEM_PROMPT } from "./pitch";
import { PRICE_SYSTEM_PROMPT } from "./price";
import { buildSystemPrompt } from "./prompt";
import type { TurnUsage } from "../usage/pricing";
import type { CallModel } from "./run";

// Server-only. The API key is read from ANTHROPIC_API_KEY by the SDK and
// never leaves the server.

const MODEL = process.env.IDLEFIT_MODEL ?? "claude-opus-5";
const EFFORT = (process.env.IDLEFIT_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max";
// Room for adaptive thinking plus a ~4-6k token JSON answer, while staying
// under the SDK's non-streaming timeout ceiling.
const MAX_TOKENS = 20_000;
// Server-side fallback: if a safety classifier declines, the API re-runs the
// request on Anthropic's recommended fallback model inside the same call.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** True when the server has a credential the SDK can use. Checked per request so adding a key only needs a restart. */
export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/**
 * Top-level usage covers the attempt that produced the returned message,
 * priced at the model that served it (a declined attempt isn't billed).
 */
function usageOf(response: { model: string; usage: Anthropic.Beta.BetaUsage }): TurnUsage {
  return {
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  };
}

let client: Anthropic | undefined;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// Stable across requests, so it's marked for prompt caching. Together with
// the output schema it forms a ~4.5k-token cached prefix (the logs show
// cacheWrite then cacheRead of that size), which also makes retries cheaper.
const systemPrompt = buildSystemPrompt(summarizeCapacity(getShops()));

export const callClaude: CallModel = ({ images, text }) => tolerateUnparseableOutput(async () => {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT, format: betaZodOutputFormat(analysisOutputSchema) },
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
          })),
          { type: "text" as const, text },
        ],
      },
    ],
  });

  console.info("[analysis] claude call", {
    model: response.model,
    stop: response.stop_reason,
    input: response.usage.input_tokens,
    cacheWrite: response.usage.cache_creation_input_tokens,
    cacheRead: response.usage.cache_read_input_tokens,
    output: response.usage.output_tokens,
  });

  return { stopReason: response.stop_reason, output: response.parsed_output, usage: usageOf(response) };
});

type TextCallerOptions = {
  system: string;
  schema: Parameters<typeof betaZodOutputFormat>[0];
  effort: typeof EFFORT;
  maxTokens: number;
  logTag: string;
};

/** A text-only structured call (price, pitch): no images, no prompt caching needed. */
function makeTextCaller({ system, schema, effort, maxTokens, logTag }: TextCallerOptions): CallTextModel {
  return (text) =>
    tolerateUnparseableOutput(async () => {
      const response = await getClient().beta.messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        output_config: { effort, format: betaZodOutputFormat(schema) },
        system,
        messages: [{ role: "user", content: text }],
      });
      console.info(`[${logTag}] claude call`, {
        model: response.model,
        stop: response.stop_reason,
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      });
      return { stopReason: response.stop_reason, output: response.parsed_output, usage: usageOf(response) };
    });
}

// Small, text-only question: low effort keeps it to a few seconds.
export const callClaudePrice = makeTextCaller({
  system: PRICE_SYSTEM_PROMPT,
  schema: priceSuggestionOutputSchema,
  effort: "low",
  maxTokens: 8_000,
  logTag: "price",
});

// A few short paragraphs of writing: medium effort.
export const callClaudePitch = makeTextCaller({
  system: PITCH_SYSTEM_PROMPT,
  schema: pitchOutputSchema,
  effort: "medium",
  maxTokens: 10_000,
  logTag: "pitch",
});

// The build agent: a streamed conversation. The product context is a stable
// system block marked for caching, so follow-up turns re-read it cheaply.
const AGENT_EFFORT = "medium" as const;
const AGENT_MAX_TOKENS = 8_000;

export type AgentStreamEvent = { type: "text"; text: string } | { type: "final"; usage: TurnUsage; stopReason: string | null };

export async function* streamAgentReply(input: {
  context: string;
  messages: AgentMessage[];
  signal: AbortSignal;
}): AsyncGenerator<AgentStreamEvent> {
  const stream = getClient().beta.messages.stream(
    {
      model: MODEL,
      max_tokens: AGENT_MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: AGENT_EFFORT },
      system: [
        { type: "text", text: AGENT_SYSTEM_PROMPT },
        { type: "text", text: input.context, cache_control: { type: "ephemeral" } },
      ],
      messages: input.messages,
    },
    { signal: input.signal },
  );
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { type: "text", text: event.delta.text };
    }
  }
  const final = await stream.finalMessage();
  console.info("[agent] claude call", { stop: final.stop_reason, ...usageOf(final) });
  yield { type: "final", usage: usageOf(final), stopReason: final.stop_reason };
}
