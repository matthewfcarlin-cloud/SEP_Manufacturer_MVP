import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test, vi } from "vitest";
import { tolerateUnparseableOutput } from "./structuredOutput";

describe("tolerateUnparseableOutput", () => {
  test("turns the SDK's parse failure into an empty turn the retry can handle", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const call = () => Promise.reject(new Anthropic.AnthropicError("Failed to parse structured output: SyntaxError: Unexpected end of JSON input"));
    expect(await tolerateUnparseableOutput(call)).toEqual({ stopReason: "max_tokens", output: null });
  });

  test("passes a good turn through", async () => {
    const turn = { stopReason: "end_turn", output: { ok: 1 } };
    expect(await tolerateUnparseableOutput(() => Promise.resolve(turn))).toBe(turn);
  });

  test("still throws real API errors and other failures", async () => {
    const rateLimited = new Anthropic.RateLimitError(429, undefined, "slow down", new Headers());
    await expect(tolerateUnparseableOutput(() => Promise.reject(rateLimited))).rejects.toBe(rateLimited);
    await expect(tolerateUnparseableOutput(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});
