import { describe, expect, test, vi } from "vitest";
import { AiError } from "../ai/types";
import { describeAiError } from "./errors";
import { AnalysisError } from "./run";

describe("describeAiError", () => {
  test.each([
    ["invalid_key", "user", 401, /your anthropic api key was rejected/i],
    ["quota_exceeded", "user", 429, /your anthropic account/i],
    ["provider_down", "user", 503, /isn't responding/i],
    ["invalid_key", "house", 503, /add your own anthropic key/i],
    ["quota_exceeded", "house", 429, /add your own anthropic key/i],
  ] as const)("%s on the %s key → %i with a plain message", (kind, keySource, status, message) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const described = describeAiError(new AiError(kind, keySource), "test");
    expect(described).toMatchObject({ code: kind, status });
    expect(described.message).toMatch(message);
    expect(described.message).not.toMatch(/sk-ant/);
  });

  test("validation failures keep their own message and carry no code", () => {
    expect(describeAiError(new AnalysisError("Try again."), "test")).toEqual({ message: "Try again.", status: 422 });
  });

  test("unknown failures are a generic 500 that never echoes the error text", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const described = describeAiError(new Error("sk-ant-api03-LEAKED"), "test");
    expect(described).toEqual({ message: expect.not.stringContaining("LEAKED"), status: 500 });
  });
});
