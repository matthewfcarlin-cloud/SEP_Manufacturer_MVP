import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from "vitest";
import { register } from "@/instrumentation";

let exit: MockInstance;
let error: MockInstance;
beforeEach(() => {
  process.env.NEXT_RUNTIME = "nodejs";
  exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.KEY_ENCRYPTION_SECRET;
  delete process.env.NEXT_RUNTIME;
  vi.restoreAllMocks();
});

describe("server startup", () => {
  test("exits without KEY_ENCRYPTION_SECRET, saying how to make one", async () => {
    await register();
    expect(exit).toHaveBeenCalledWith(1);
    expect(String(error.mock.calls[0][0])).toMatch(/KEY_ENCRYPTION_SECRET is not set.*openssl rand -base64 32/);
  });

  test("exits with a malformed secret, without printing it", async () => {
    process.env.KEY_ENCRYPTION_SECRET = "too-short-secret-value";
    await register();
    expect(exit).toHaveBeenCalledWith(1);
    expect(String(error.mock.calls[0][0])).not.toContain("too-short-secret-value");
  });

  test("starts with a valid secret", async () => {
    process.env.KEY_ENCRYPTION_SECRET = randomBytes(32).toString("base64");
    await register();
    expect(exit).not.toHaveBeenCalled();
  });
});
