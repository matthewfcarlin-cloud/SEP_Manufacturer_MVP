import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { KeySource } from "../../types";
import type { TurnUsage } from "../../usage/pricing";
import { AiError, type AiProvider, type ChatMessage, type ModelTurn, type ProviderCall, type ProviderStreamEvent, type SystemBlock } from "../types";

// Server-only. The one file that calls the Anthropic SDK.

// Server-side fallback: if a safety classifier declines, the API re-runs the
// request on Anthropic's recommended fallback model inside the same call.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const PARSE_FAILURE_PREFIX = "Failed to parse structured output";

/** Maps an SDK error to an AiError. Anything else (a bug, a validation error) passes through unchanged. */
export function toAiError(err: unknown, keySource: KeySource): unknown {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return new AiError("auth", keySource, err.status);
  if (err instanceof Anthropic.RateLimitError) return new AiError("rate_limit", keySource, err.status);
  if (err instanceof Anthropic.APIConnectionError) return new AiError("connection", keySource);
  if (err instanceof Anthropic.APIError) {
    console.error(`[ai/anthropic] API error ${err.status}`, err.message);
    return new AiError("provider", keySource, err.status);
  }
  return err;
}

/**
 * The SDK throws (rather than returning) when a structured answer is cut off
 * or malformed. That's a bad answer, not an outage: report it as an empty
 * turn so the caller's one retry runs instead of failing the request.
 */
export async function tolerateUnparseableOutput(call: () => Promise<ModelTurn>): Promise<ModelTurn> {
  try {
    return await call();
  } catch (err) {
    const isParseFailure =
      err instanceof Anthropic.AnthropicError && !(err instanceof Anthropic.APIError) && err.message.startsWith(PARSE_FAILURE_PREFIX);
    if (!isParseFailure) throw err;
    console.warn("[ai/anthropic] unparseable structured output; treating as an empty answer", err.message);
    return { stopReason: "max_tokens", output: null };
  }
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

function toSystem(blocks: SystemBlock[]): Anthropic.Beta.BetaTextBlockParam[] {
  return blocks.map((b) => ({ type: "text", text: b.text, ...(b.cache && { cache_control: { type: "ephemeral" as const } }) }));
}

function toMessages(messages: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content.map((part) =>
            part.type === "text"
              ? { type: "text" as const, text: part.text }
              : { type: "image" as const, source: { type: "base64" as const, media_type: part.mediaType, data: part.base64 } },
          ),
  }));
}

function baseParams(call: ProviderCall) {
  return {
    model: call.model,
    max_tokens: call.maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: "default" as const,
    ...(call.thinking && { thinking: { type: "adaptive" as const } }),
    system: toSystem(call.system),
    messages: toMessages(call.messages),
  };
}

/**
 * An Anthropic provider. With no `apiKey` the SDK reads ANTHROPIC_API_KEY
 * (the house key). Keys are only ever handed to the SDK client.
 */
export function createAnthropicProvider(keySource: KeySource, apiKey?: string): AiProvider {
  const client = new Anthropic(apiKey ? { apiKey } : {});

  return {
    name: "anthropic",

    async parse(call) {
      try {
        return await tolerateUnparseableOutput(async () => {
          const response = await client.beta.messages.parse({
            ...baseParams(call),
            output_config: { effort: call.effort, format: betaZodOutputFormat(call.schema) },
          });
          return { stopReason: response.stop_reason, output: response.parsed_output, usage: usageOf(response) };
        });
      } catch (err) {
        throw toAiError(err, keySource);
      }
    },

    async *stream(call, signal): AsyncGenerator<ProviderStreamEvent> {
      try {
        const stream = client.beta.messages.stream({ ...baseParams(call), output_config: { effort: call.effort } }, { signal });
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            yield { type: "text", text: event.delta.text };
          }
        }
        const final = await stream.finalMessage();
        yield { type: "final", usage: usageOf(final), stopReason: final.stop_reason };
      } catch (err) {
        throw toAiError(err, keySource);
      }
    },
  };
}

/** True when the server has a house credential the SDK can use. Checked per request so adding a key only needs a restart. */
export function hasHouseKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
