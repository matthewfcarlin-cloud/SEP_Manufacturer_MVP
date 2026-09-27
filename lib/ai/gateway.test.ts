import { describe, expect, test, vi } from "vitest";
import type { UsageRecord } from "../types";
import { ACTION_ESTIMATE_USD } from "../usage/budget";
import { costOfTurn } from "../usage/pricing";
import { createGateway, type GatewayDeps } from "./gateway";
import { TASK_ROUTES } from "./routing";
import { AiError, type AiProvider, type ModelTurn, type ProviderStreamEvent } from "./types";
import { z } from "zod";

const WORKSPACE = "w".repeat(64);
const SECRET_PROMPT = "my secret pedal idea";
const usage = { model: "claude-opus-5", inputTokens: 10_000, outputTokens: 2_000, cacheWriteTokens: 0, cacheReadTokens: 4_000 };
const schema = z.object({ ok: z.boolean() });

function fakeProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    name: "anthropic",
    parse: vi.fn(async (): Promise<ModelTurn> => ({ stopReason: "end_turn", output: { ok: true }, usage })),
    stream: vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> {
      yield { type: "text", text: "Hel" };
      yield { type: "text", text: "lo" };
      yield { type: "final", usage, stopReason: "end_turn" };
    }),
    ...overrides,
  };
}

function setup(provider: AiProvider | null = fakeProvider(), userProvider: GatewayDeps["userProvider"] = async () => null) {
  const rows: UsageRecord[] = [];
  const charges: { workspaceId: string; usd: number }[] = [];
  const deps: GatewayDeps = {
    houseProvider: () => provider,
    userProvider,
    logUsage: async (r) => void rows.push(r),
    chargeHouse: async (workspaceId, usd) => void charges.push({ workspaceId, usd }),
    now: (() => {
      let t = 1_000;
      return () => (t += 250);
    })(),
  };
  return { gateway: createGateway(deps), rows, charges, provider };
}

const request = {
  task: "analyze" as const,
  workspaceId: WORKSPACE,
  system: [{ text: "You are an engineer.", cache: true }],
  messages: [{ role: "user" as const, content: SECRET_PROMPT }],
  schema,
};

describe("gateway.generate", () => {
  test("routes the task's model, effort and token limit to the provider", async () => {
    const { gateway, provider } = setup();
    const turn = await gateway.generate(request);
    expect(turn.output).toEqual({ ok: true });
    const route = TASK_ROUTES.analyze;
    expect(provider!.parse).toHaveBeenCalledWith(
      expect.objectContaining({ model: route.model, effort: route.effort, maxTokens: route.maxTokens, thinking: route.thinking, schema }),
    );
  });

  test("records one usage row per call, with tokens and cost but no content", async () => {
    const { gateway, rows } = setup();
    await gateway.generate(request);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      workspaceId: WORKSPACE,
      task: "analyze",
      provider: "anthropic",
      model: "claude-opus-5",
      inputTokens: 10_000,
      outputTokens: 2_000,
      cacheReadTokens: 4_000,
      keySource: "house",
      latencyMs: 250,
      ok: true,
    });
    expect(rows[0].estCostUsd).toBeCloseTo(costOfTurn(usage));
    expect(JSON.stringify(rows[0])).not.toContain(SECRET_PROMPT);
    expect(JSON.stringify(rows[0])).not.toContain("engineer");
  });

  test("charges the house budget the real cost of a house-key call", async () => {
    const { gateway, charges } = setup();
    await gateway.generate(request);
    expect(charges).toEqual([{ workspaceId: WORKSPACE, usd: costOfTurn(usage) }]);
  });

  test("charges the task's estimate when the provider couldn't report usage", async () => {
    const provider = fakeProvider({ parse: vi.fn(async () => ({ stopReason: "max_tokens", output: null })) });
    const { gateway, charges, rows } = setup(provider);
    await gateway.generate({ ...request, task: "pitch" });
    expect(charges).toEqual([{ workspaceId: WORKSPACE, usd: ACTION_ESTIMATE_USD.pitch }]);
    expect(rows[0]).toMatchObject({ ok: true, estCostUsd: ACTION_ESTIMATE_USD.pitch, model: TASK_ROUTES.pitch.model });
  });

  test("a provider failure is rethrown, logged as a failed row, and not charged", async () => {
    const failure = new AiError("quota_exceeded", "house");
    const { gateway, rows, charges } = setup(fakeProvider({ parse: vi.fn(async () => Promise.reject(failure)) }));
    await expect(gateway.generate(request)).rejects.toBe(failure);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ok: false, errorKind: "quota_exceeded", estCostUsd: 0, inputTokens: 0, keySource: "house" });
    expect(charges).toEqual([]);
  });

  test("an unexpected failure is logged with the generic provider kind", async () => {
    const { gateway, rows } = setup(fakeProvider({ parse: vi.fn(async () => Promise.reject(new Error("boom"))) }));
    await expect(gateway.generate(request)).rejects.toThrow("boom");
    expect(rows[0]).toMatchObject({ ok: false, errorKind: "provider_down" });
  });

  test("a broken usage log never fails the AI call", async () => {
    const provider = fakeProvider();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const gateway = createGateway({
      houseProvider: () => provider,
      userProvider: async () => null,
      logUsage: async () => Promise.reject(new Error("disk full")),
      chargeHouse: async () => {},
    });
    await expect(gateway.generate(request)).resolves.toMatchObject({ output: { ok: true } });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("with no key configured, the call fails as an auth problem without reaching a provider", async () => {
    const { gateway, rows } = setup(null);
    expect(await gateway.isConfigured(WORKSPACE)).toBe(false);
    await expect(gateway.generate(request)).rejects.toMatchObject({ kind: "invalid_key" });
    expect(rows).toEqual([]);
  });
});

describe("gateway.stream", () => {
  const streamRequest = { task: "agent_chat" as const, workspaceId: WORKSPACE, system: [{ text: "ctx" }], messages: [{ role: "user" as const, content: "hi" }], signal: new AbortController().signal };

  async function collect(gen: AsyncGenerator<unknown>) {
    const out: unknown[] = [];
    for await (const e of gen) out.push(e);
    return out;
  }

  test("passes text through, then a final event, and meters the whole answer once", async () => {
    const { gateway, rows, charges, provider } = setup();
    const events = await collect(gateway.stream(streamRequest));
    expect(events).toEqual([
      { type: "text", text: "Hel" },
      { type: "text", text: "lo" },
      { type: "final", stopReason: "end_turn" },
    ]);
    expect(provider!.stream).toHaveBeenCalledWith(expect.objectContaining({ model: TASK_ROUTES.agent_chat.model }), streamRequest.signal);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ task: "agent_chat", ok: true, outputTokens: 2_000 });
    expect(charges).toEqual([{ workspaceId: WORKSPACE, usd: costOfTurn(usage) }]);
  });

  test("a stream cut off after text was sent charges the estimate and logs a failed row", async () => {
    const provider = fakeProvider({
      stream: vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> {
        yield { type: "text", text: "partial" };
        throw new AiError("provider_down", "house");
      }),
    });
    const { gateway, rows, charges } = setup(provider);
    await expect(collect(gateway.stream(streamRequest))).rejects.toMatchObject({ kind: "provider_down" });
    expect(charges).toEqual([{ workspaceId: WORKSPACE, usd: ACTION_ESTIMATE_USD.chat }]);
    expect(rows[0]).toMatchObject({ ok: false, errorKind: "provider_down", estCostUsd: ACTION_ESTIMATE_USD.chat });
  });

  test("a stream that fails before any text is not charged", async () => {
    const provider = fakeProvider({
      stream: vi.fn(async function* (): AsyncGenerator<ProviderStreamEvent> {
        throw new AiError("quota_exceeded", "house");
      }),
    });
    const { gateway, rows, charges } = setup(provider);
    await expect(collect(gateway.stream(streamRequest))).rejects.toMatchObject({ kind: "quota_exceeded" });
    expect(charges).toEqual([]);
    expect(rows[0]).toMatchObject({ ok: false, estCostUsd: 0 });
  });
});

describe("gateway with the workspace's own key", () => {
  test("uses the workspace's key, logs it as a user call, and charges nothing to the demo budget", async () => {
    const house = fakeProvider();
    const user = fakeProvider();
    const { gateway, rows, charges } = setup(house, async (ws) => (ws === WORKSPACE ? user : null));
    await gateway.generate(request);
    expect(user.parse).toHaveBeenCalledOnce();
    expect(house.parse).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({ keySource: "user", ok: true });
    expect(rows[0].estCostUsd).toBeGreaterThan(0);
    expect(charges).toEqual([]);
  });

  test("streams on the workspace's key too, without charging the demo budget", async () => {
    const user = fakeProvider();
    const { gateway, rows, charges } = setup(fakeProvider(), async () => user);
    for await (const event of gateway.stream({ ...request, task: "agent_chat", signal: new AbortController().signal })) void event;
    expect(user.stream).toHaveBeenCalledOnce();
    expect(rows[0]).toMatchObject({ keySource: "user", task: "agent_chat" });
    expect(charges).toEqual([]);
  });

  test("a rejected user key fails the call; it never falls back to the house key", async () => {
    const house = fakeProvider();
    const user = fakeProvider({ parse: vi.fn(async () => Promise.reject(new AiError("invalid_key", "user"))) });
    const { gateway, rows } = setup(house, async () => user);
    await expect(gateway.generate(request)).rejects.toMatchObject({ kind: "invalid_key", keySource: "user" });
    expect(house.parse).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({ ok: false, keySource: "user", errorKind: "invalid_key" });
  });

  test("a saved key that can't be read fails as invalid_key rather than silently using the demo budget", async () => {
    const house = fakeProvider();
    const { gateway } = setup(house, async () => Promise.reject(new AiError("invalid_key", "user")));
    await expect(gateway.generate(request)).rejects.toMatchObject({ kind: "invalid_key", keySource: "user" });
    expect(house.parse).not.toHaveBeenCalled();
  });

  test("is configured with a user key even when the server has no house key", async () => {
    const { gateway } = setup(null, async () => fakeProvider());
    expect(await gateway.isConfigured(WORKSPACE)).toBe(true);
    await expect(gateway.generate(request)).resolves.toMatchObject({ output: { ok: true } });
  });
});
