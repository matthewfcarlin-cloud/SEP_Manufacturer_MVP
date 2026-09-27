import { z } from "zod";
import { currentOwnerHash } from "@/lib/access";
import { fail, isJsonRequest } from "../api";
import { keyTestErrorInfo, MALFORMED_KEY } from "./errors";
import { allowKeyAttempt } from "./keyAttempts";
import { verifyAnthropicKey } from "./providers/anthropic";
import { AiError } from "./types";

// Shared by the /api/settings/ai-key routes. The key in a request body is
// only ever handed to verifyAnthropicKey and the key store: never logged,
// never echoed, never put in an error.

const MAX_KEY_LENGTH = 256;
const ANTHROPIC_KEY = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export const keyBodySchema = z.object({
  provider: z.literal("anthropic").default("anthropic"),
  apiKey: z.string().trim().min(1).max(MAX_KEY_LENGTH),
});

/** The browser's workspace id, or the response to return. */
export async function workspaceOrFail(): Promise<string | Response> {
  return (await currentOwnerHash()) ?? fail("Enable cookies for this site to manage an AI key.", 400);
}

/** Parses a JSON key request (JSON only; see isJsonRequest). */
export async function readKeyBody(request: Request): Promise<{ apiKey: string } | Response> {
  if (!isJsonRequest(request)) return fail("Send the key as JSON.", 415);
  const body = keyBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail('Send JSON like { "provider": "anthropic", "apiKey": "sk-ant-..." }.', 400);
  return { apiKey: body.data.apiKey };
}

/** Checks the key's shape, then tests it with a tiny real call. Null when it works, else the response to return. */
export async function testKeyOrFail(workspaceId: string, apiKey: string): Promise<Response | null> {
  if (!ANTHROPIC_KEY.test(apiKey)) return fail(MALFORMED_KEY.message, MALFORMED_KEY.status, MALFORMED_KEY.code);
  if (!allowKeyAttempt(workspaceId)) return fail("Too many key checks from this browser. Wait a few minutes and try again.", 429);
  try {
    await verifyAnthropicKey(apiKey);
    return null;
  } catch (err) {
    if (err instanceof AiError) {
      const { message, status, code } = keyTestErrorInfo(err.kind);
      return fail(message, status, code);
    }
    // Only the error's name: its message or stack could quote the request.
    console.error("[api/settings/ai-key] key test failed unexpectedly", err instanceof Error ? err.name : typeof err);
    return fail("Couldn't test the key. Please try again.", 500);
  }
}
