import Anthropic from "@anthropic-ai/sdk";
import type { ModelTurn } from "./run";

const PARSE_FAILURE_PREFIX = "Failed to parse structured output";

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
    console.warn("[claude] unparseable structured output; treating as an empty answer", err.message);
    return { stopReason: "max_tokens", output: null };
  }
}
