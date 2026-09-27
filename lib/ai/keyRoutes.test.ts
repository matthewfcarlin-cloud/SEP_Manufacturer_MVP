import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi, type MockInstance } from "vitest";
import { AiError } from "./types";

// Route-level proof of the key rules: keys are never logged, never returned
// unmasked, never included in errors, and only saved after a passing test.

const WS = "e".repeat(64);
const API_KEY = "sk-ant-api03-ROUTEKEY-abcdefghijklmnopqrstuvwxyz9Zk1";
const LEAK_MARKER = "ROUTEKEY";

const ownerHash = vi.hoisted(() => ({ value: "e".repeat(64) as string | undefined }));
vi.mock("@/lib/access", () => ({ currentOwnerHash: async () => ownerHash.value }));

const verify = vi.hoisted(() => vi.fn<(apiKey: string) => Promise<void>>());
vi.mock("@/lib/ai/providers/anthropic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./providers/anthropic")>()),
  verifyAnthropicKey: verify,
}));

const keyRoute = await import("@/app/api/settings/ai-key/route");
const testRoute = await import("@/app/api/settings/ai-key/test/route");
const usageRoute = await import("@/app/api/usage/route");
const { resetKeyAttempts } = await import("./keyAttempts");

let dir: string;
let consoleSpies: MockInstance[];

beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "idlefit-keyroutes-"));
  process.env.IDLEFIT_DATA_DIR = dir;
  process.env.KEY_ENCRYPTION_SECRET = randomBytes(32).toString("base64");
  process.env.IDLEFIT_BROWSER_BUDGET_USD = "3";
});
afterAll(async () => {
  delete process.env.IDLEFIT_DATA_DIR;
  delete process.env.KEY_ENCRYPTION_SECRET;
  delete process.env.IDLEFIT_BROWSER_BUDGET_USD;
  await rm(dir, { recursive: true, force: true });
});
beforeEach(async () => {
  ownerHash.value = WS;
  verify.mockReset();
  verify.mockResolvedValue(undefined);
  resetKeyAttempts();
  consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  await keyRoute.DELETE();
});
afterEach(() => {
  // Nothing any route logged may contain the key.
  for (const spy of consoleSpies) expect(JSON.stringify(spy.mock.calls)).not.toContain(LEAK_MARKER);
  vi.restoreAllMocks();
});

const post = (url: string, body: unknown, contentType = "application/json") =>
  new Request(`http://localhost${url}`, { method: "POST", headers: { "Content-Type": contentType }, body: JSON.stringify(body) });

async function read(res: Response) {
  const text = await res.text();
  expect(text).not.toContain(LEAK_MARKER);
  return { status: res.status, body: JSON.parse(text) };
}

async function keyFiles(): Promise<string[]> {
  return readdir(path.join(dir, "keys")).catch(() => []);
}

describe("POST /api/settings/ai-key/test", () => {
  test("a working key tests valid and is not saved", async () => {
    const { status, body } = await read(await testRoute.POST(post("/api/settings/ai-key/test", { apiKey: API_KEY })));
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: { valid: true }, error: null });
    expect(verify).toHaveBeenCalledWith(API_KEY);
    expect(await keyFiles()).toEqual([]);
  });

  test("a rejected key returns invalid_key with a plain message", async () => {
    verify.mockRejectedValue(new AiError("invalid_key", "user", 401));
    const { status, body } = await read(await testRoute.POST(post("/api/settings/ai-key/test", { apiKey: API_KEY })));
    expect(status).toBe(401);
    expect(body).toMatchObject({ success: false, data: null, code: "invalid_key", error: expect.stringMatching(/rejected/i) });
  });

  test("something that isn't an Anthropic key is refused without calling the provider", async () => {
    const { status, body } = await read(await testRoute.POST(post("/api/settings/ai-key/test", { apiKey: "hello ROUTEKEY" })));
    expect(status).toBe(422);
    expect(body.code).toBe("invalid_key");
    expect(verify).not.toHaveBeenCalled();
  });
});

describe("POST /api/settings/ai-key", () => {
  test("saves a key only after it tests valid, and answers with the masked form", async () => {
    const { status, body } = await read(await keyRoute.POST(post("/api/settings/ai-key", { provider: "anthropic", apiKey: API_KEY })));
    expect(status).toBe(200);
    expect(body.data).toEqual({ provider: "anthropic", maskedKey: "sk-ant-…9Zk1", createdAt: expect.any(String) });
    expect(verify).toHaveBeenCalledOnce();
    const files = await keyFiles();
    expect(files).toEqual([`${WS}.json`]);
    expect(await readFile(path.join(dir, "keys", files[0]), "utf8")).not.toContain(LEAK_MARKER);
  });

  test.each([
    [new AiError("invalid_key", "user", 401), 401, "invalid_key"],
    [new AiError("quota_exceeded", "user", 429), 429, "quota_exceeded"],
    [new AiError("provider_down", "user"), 503, "provider_down"],
  ])("a key that fails its test is not saved (%s)", async (failure, expectedStatus, code) => {
    verify.mockRejectedValue(failure);
    const { status, body } = await read(await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY })));
    expect(status).toBe(expectedStatus);
    expect(body.code).toBe(code);
    expect(await keyFiles()).toEqual([]);
  });

  test("an unexpected failure during the test is a generic error that still doesn't echo the key", async () => {
    verify.mockRejectedValue(new Error(`bad request with key ${API_KEY}`));
    const { status, body } = await read(await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY })));
    expect(status).toBe(500);
    expect(body.success).toBe(false);
    expect(await keyFiles()).toEqual([]);
  });

  test("requires a JSON body, so a cross-site form can't post a key", async () => {
    const res = await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY }, "text/plain"));
    expect(res.status).toBe(415);
    expect(verify).not.toHaveBeenCalled();
  });

  test("an empty or oversized key is a 400 before any provider call", async () => {
    expect((await keyRoute.POST(post("/api/settings/ai-key", {}))).status).toBe(400);
    expect((await keyRoute.POST(post("/api/settings/ai-key", { apiKey: `sk-ant-${"x".repeat(400)}` }))).status).toBe(400);
    expect((await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY, provider: "openai" }))).status).toBe(400);
    expect(verify).not.toHaveBeenCalled();
  });

  test("limits how often one browser can test keys", async () => {
    verify.mockRejectedValue(new AiError("invalid_key", "user", 401));
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await testRoute.POST(post("/api/settings/ai-key/test", { apiKey: API_KEY }))).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    expect(verify).toHaveBeenCalledTimes(10);
  });

  test("without the owner cookie there's no workspace to save to", async () => {
    ownerHash.value = undefined;
    expect((await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY }))).status).toBe(400);
  });
});

describe("GET and DELETE /api/settings/ai-key", () => {
  test("GET shows the masked key or null; DELETE removes it", async () => {
    expect((await read(await keyRoute.GET())).body.data).toEqual({ key: null });
    await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY }));
    expect((await read(await keyRoute.GET())).body.data).toEqual({ key: { provider: "anthropic", maskedKey: "sk-ant-…9Zk1", createdAt: expect.any(String) } });
    const del = await read(await keyRoute.DELETE());
    expect(del.body.data).toEqual({ removed: true });
    expect((await read(await keyRoute.GET())).body.data).toEqual({ key: null });
    expect(await keyFiles()).toEqual([]);
  });
});

describe("GET /api/usage", () => {
  test("no key: the house pays, with the demo budget left", async () => {
    const { body } = await read(await usageRoute.GET());
    expect(body.data).toEqual({ keySource: "house", demoBudgetRemainingUsd: 3 });
  });

  test("with a key: the creator pays, shown masked", async () => {
    await keyRoute.POST(post("/api/settings/ai-key", { apiKey: API_KEY }));
    const { body } = await read(await usageRoute.GET());
    expect(body.data).toEqual({ keySource: "user", maskedKey: "sk-ant-…9Zk1", demoBudgetRemainingUsd: 3 });
  });
});
