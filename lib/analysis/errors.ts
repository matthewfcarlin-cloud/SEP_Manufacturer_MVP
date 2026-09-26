import Anthropic from "@anthropic-ai/sdk";
import { fail } from "../api";
import { AnalysisError } from "./run";

/** Maps an AI call failure to a user-safe API response, logging the detail server-side. */
export function aiFailure(err: unknown, logTag: string): Response {
  if (err instanceof AnalysisError) return fail(err.message, 422);
  if (err instanceof Anthropic.AuthenticationError) {
    console.error(`[${logTag}] Anthropic auth failed; is ANTHROPIC_API_KEY set?`, err.message);
    return fail("The server isn't configured with a working Anthropic API key.", 500);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return fail("The AI service is busy right now. Try again in a minute.", 429);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    console.error(`[${logTag}] couldn't reach the Anthropic API`, err);
    return fail("Couldn't reach the AI service. Check the connection and try again.", 502);
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[${logTag}] Anthropic API error ${err.status}`, err.message);
    return fail("The AI service returned an error. Please try again.", 502);
  }
  console.error(`[${logTag}] unexpected failure`, err);
  return fail("Something went wrong talking to the AI. Please try again.", 500);
}
