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
    [new Anthropic.AuthenticationError(401, undefined, "bad key sk-ant-SECRET", headers), "invalid_key"],
    [new Anthropic.PermissionDeniedError(403, undefined, "no", headers), "invalid_key"],
    [new Anthropic.RateLimitError(429, undefined, "slow", headers), "quota_exceeded"],
    [new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }, "Your credit balance is too low to access the Anthropic API.", headers), "quota_exceeded"],
    [new Anthropic.APIConnectionError({ message: "down" }), "provider_down"],
    [new Anthropic.InternalServerError(500, undefined, "oops", headers), "provider_down"],
    [Anthropic.APIError.generate(529, { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }, "Overloaded", headers), "provider_down"],
  ] as const)("maps %s to %s", (err, kind) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const mapped = toAiError(err, "user");
    expect(mapped).toBeInstanceOf(AiError);
    expect(mapped).toMatchObject({ kind, keySource: "user" });
  });

  test("never logs the provider's message, which could echo request details", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    toAiError(new Anthropic.InternalServerError(500, undefined, "boom for sk-ant-SECRET", headers), "user");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("SECRET");
    spy.mockRestore();
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
