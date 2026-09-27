import { describe, expect, test } from "vitest";
import { classifyAiError } from "./aiError";

describe("classifyAiError", () => {
  test("a spent demo budget", () => {
    expect(classifyAiError(429, "This browser has used its $3.00 AI budget for the demo.")).toBe("budget");
    expect(classifyAiError(429, "The demo's AI budget for today is used up.")).toBe("budget");
  });
  test("a key that failed", () => {
    expect(classifyAiError(500, "The server isn't configured with a working Anthropic API key.")).toBe("key");
    expect(classifyAiError(401, "Invalid key")).toBe("key");
  });
  test("a busy service, and everything else", () => {
    expect(classifyAiError(429, "The AI service is busy right now.")).toBe("busy");
    expect(classifyAiError(422, "The AI's plan didn't pass our checks.")).toBe("other");
  });
});
