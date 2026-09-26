import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { analysisOutputSchema } from "../schemas";
import { getShops } from "../shops";
import { summarizeCapacity } from "./capacity";
import { buildSystemPrompt } from "./prompt";
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

let client: Anthropic | undefined;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// Stable across requests, so it's marked for prompt caching.
const systemPrompt = buildSystemPrompt(summarizeCapacity(getShops()));

export const callClaude: CallModel = async ({ images, text }) => {
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
    cacheRead: response.usage.cache_read_input_tokens,
    output: response.usage.output_tokens,
  });

  return { stopReason: response.stop_reason, output: response.parsed_output };
};
