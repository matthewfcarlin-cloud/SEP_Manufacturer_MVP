import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test, vi } from "vitest";
import { AiError } from "../types";
import { toAiError, tolerateUnparseableOutput } from "./anthropic";

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

describe("toAiError", () => {
  const headers = new Headers();
  test.each([
    [new Anthropic.AuthenticationError(401, undefined, "bad key sk-ant-SECRET", headers), "auth"],
    [new Anthropic.PermissionDeniedError(403, undefined, "no", headers), "auth"],
    [new Anthropic.RateLimitError(429, undefined, "slow", headers), "rate_limit"],
    [new Anthropic.APIConnectionError({ message: "down" }), "connection"],
    [new Anthropic.InternalServerError(500, undefined, "oops", headers), "provider"],
  ] as const)("maps %s to %s", (err, kind) => {
    const mapped = toAiError(err, "user");
    expect(mapped).toBeInstanceOf(AiError);
    expect(mapped).toMatchObject({ kind, keySource: "user" });
  });

  test("never copies the provider's message, which could echo request details", () => {
    const mapped = toAiError(new Anthropic.AuthenticationError(401, undefined, "invalid x-api-key sk-ant-SECRET", headers), "user");
    expect((mapped as Error).message).not.toContain("SECRET");
  });

  test("leaves non-SDK errors alone so bugs keep their stack", () => {
    const bug = new TypeError("undefined is not a function");
    expect(toAiError(bug, "house")).toBe(bug);
  });
});
