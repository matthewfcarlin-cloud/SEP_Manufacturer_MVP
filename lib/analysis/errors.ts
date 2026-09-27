import { aiErrorInfo } from "../ai/errors";
import { AiError } from "../ai/types";
import { fail } from "../api";
import type { AiErrorCode } from "../types";
import { AnalysisError } from "./run";

/** A user-safe message, status and (for provider failures) code; logs the detail server-side. */
export function describeAiError(err: unknown, logTag: string): { message: string; status: number; code?: AiErrorCode } {
  if (err instanceof AnalysisError) return { message: err.message, status: 422 };
  if (err instanceof AiError) {
    if (err.keySource === "house" && err.kind === "invalid_key") console.error(`[${logTag}] the house AI key was rejected; is ANTHROPIC_API_KEY set?`);
    return aiErrorInfo(err.kind, err.keySource);
  }
  console.error(`[${logTag}] unexpected failure`, err);
  return { message: "Something went wrong talking to the AI. Please try again.", status: 500 };
}

/** Maps an AI call failure to a user-safe API response. */
export function aiFailure(err: unknown, logTag: string): Response {
  const { message, status, code } = describeAiError(err, logTag);
  return fail(message, status, code);
}
