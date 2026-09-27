import Anthropic from "@anthropic-ai/sdk";
import { fail } from "../api";
import { AnalysisError } from "./run";

/** A user-safe message and status for an AI call failure; logs the detail server-side. */
export function describeAiError(err: unknown, logTag: string): { message: string; status: number } {
  if (err instanceof AnalysisError) return { message: err.message, status: 422 };
  if (err instanceof Anthropic.AuthenticationError) {
    console.error(`[${logTag}] Anthropic auth failed; is ANTHROPIC_API_KEY set?`, err.message);
    return { message: "The server isn't configured with a working Anthropic API key.", status: 500 };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "The AI service is busy right now. Try again in a minute.", status: 429 };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error(`[${logTag}] couldn't reach the Anthropic API`, err);
    return { message: "Couldn't reach the AI service. Check the connection and try again.", status: 502 };
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[${logTag}] Anthropic API error ${err.status}`, err.message);
    return { message: "The AI service returned an error. Please try again.", status: 502 };
  }
  console.error(`[${logTag}] unexpected failure`, err);
  return { message: "Something went wrong talking to the AI. Please try again.", status: 500 };
}

/** Maps an AI call failure to a user-safe API response. */
export function aiFailure(err: unknown, logTag: string): Response {
  const { message, status } = describeAiError(err, logTag);
  return fail(message, status);
}
