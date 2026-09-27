import type { AiErrorCode, AiErrorKind, KeySource } from "../types";

// What the UI shows for each AI error code. Fixed strings only: nothing from
// a provider response or a key ever goes into these messages.

export const SETTINGS_HINT = "Add your own Anthropic key in Settings to keep going.";

const DOWN = "The AI service isn't responding right now. Please try again in a few minutes.";

const DURING_A_CALL: Record<KeySource, Record<AiErrorKind, { message: string; status: number }>> = {
  user: {
    invalid_key: { status: 401, message: "Your Anthropic API key was rejected. Check or replace it in Settings, or remove it to use the demo budget." },
    quota_exceeded: { status: 429, message: "Your Anthropic account hit its rate or spending limit. Wait a minute, or check your plan and billing in the Anthropic Console." },
    provider_down: { status: 503, message: DOWN },
  },
  house: {
    invalid_key: { status: 503, message: `The demo's AI key isn't working right now. ${SETTINGS_HINT}` },
    quota_exceeded: { status: 429, message: `The demo AI is busy right now. Try again in a minute, or add your own Anthropic key in Settings.` },
    provider_down: { status: 503, message: DOWN },
  },
};

/** A failed AI call's code, status and message, worded for whose key it was. */
export function aiErrorInfo(kind: AiErrorKind, keySource: KeySource): { code: AiErrorCode; status: number; message: string } {
  return { code: kind, ...DURING_A_CALL[keySource][kind] };
}

const WHILE_TESTING: Record<AiErrorKind, { message: string; status: number }> = {
  invalid_key: { status: 401, message: "Anthropic rejected this key. Check that you copied all of it; keys start with sk-ant-." },
  quota_exceeded: { status: 429, message: "This key signed in, but its account is rate-limited or out of credit. Check billing in the Anthropic Console, then try again." },
  provider_down: { status: 503, message: "Couldn't reach Anthropic to test the key. Please try again in a minute." },
};

/** A key test's failure, worded for the Settings page. */
export function keyTestErrorInfo(kind: AiErrorKind): { code: AiErrorCode; status: number; message: string } {
  return { code: kind, ...WHILE_TESTING[kind] };
}

export const MALFORMED_KEY = { code: "invalid_key" as const, status: 422, message: "That doesn't look like an Anthropic API key. Keys start with sk-ant-." };
