import type { z } from "zod";
import type { AiErrorKind, AiTask, KeySource, UsageRecord } from "../types";
import { ACTION_ESTIMATE_USD, recordSpend } from "../usage/budget";
import { costOfTurn, type TurnUsage } from "../usage/pricing";
import { readWorkspaceKey, UnreadableKeyError } from "./keyStore";
import { createAnthropicProvider, hasHouseKey } from "./providers/anthropic";
import { TASK_ROUTES } from "./routing";
import { appendUsage } from "./usageLog";
import { AiError, type AiProvider, type ChatMessage, type ModelTurn, type ProviderCall, type SystemBlock } from "./types";

// Every AI call in the app goes through here (BACKEND.md A1). The gateway
// picks the key, routes the model per task, and meters each call: one usage
// row (no content) plus the house demo budget when the house key paid.

type BaseRequest = { task: AiTask; workspaceId: string; system: SystemBlock[]; messages: ChatMessage[] };
export type GenerateRequest = BaseRequest & { schema: z.ZodType };
export type StreamRequest = BaseRequest & { signal: AbortSignal };
export type GatewayStreamEvent = { type: "text"; text: string } | { type: "final"; stopReason: string | null };

export type GatewayDeps = {
  /** The house provider, or null when the server has no key. */
  houseProvider: () => AiProvider | null;
  /** The workspace's own provider (BYOK), or null when it has no key. Throws AiError("invalid_key", "user") if its key can't be read. */
  userProvider: (workspaceId: string) => Promise<AiProvider | null>;
  logUsage: (record: UsageRecord) => Promise<void>;
  chargeHouse: (workspaceId: string, usd: number) => Promise<void>;
  now?: () => number;
};

type Picked = { provider: AiProvider; keySource: KeySource };

type Outcome = { ok: true; usage?: TurnUsage } | { ok: false; error: unknown; chargeEstimate: boolean };

export function createGateway(deps: GatewayDeps) {
  const now = deps.now ?? Date.now;

  /** The workspace's own key when it has one (never falling back if that key fails), else the house key. */
  async function pick(workspaceId: string): Promise<Picked> {
    const user = await deps.userProvider(workspaceId);
    if (user) return { provider: user, keySource: "user" };
    const house = deps.houseProvider();
    if (!house) throw new AiError("invalid_key", "house");
    return { provider: house, keySource: "house" };
  }

  function providerCall(req: BaseRequest): ProviderCall {
    const { model, effort, maxTokens, thinking } = TASK_ROUTES[req.task];
    return { model, effort, maxTokens, thinking, system: req.system, messages: req.messages };
  }

  /** Logs the row and charges the house budget. Metering problems are logged, never thrown into the caller's request. */
  async function meter(req: BaseRequest, picked: Picked, startedAt: number, outcome: Outcome): Promise<void> {
    const route = TASK_ROUTES[req.task];
    const estimate = ACTION_ESTIMATE_USD[route.budgetAction];
    const usage = outcome.ok ? outcome.usage : undefined;
    // Unknown usage on a returned turn (a cut-off answer, still billed) or a
    // stream broken after text was sent: charge the conservative estimate.
    const costUsd = usage ? costOfTurn(usage) : outcome.ok || outcome.chargeEstimate ? estimate : 0;
    const record: UsageRecord = {
      at: new Date().toISOString(),
      workspaceId: req.workspaceId,
      task: req.task,
      provider: picked.provider.name,
      model: usage?.model ?? route.model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cacheReadTokens: usage?.cacheReadTokens ?? 0,
      cacheWriteTokens: usage?.cacheWriteTokens ?? 0,
      estCostUsd: costUsd,
      keySource: picked.keySource,
      latencyMs: now() - startedAt,
      ok: outcome.ok,
      ...(!outcome.ok && { errorKind: errorKindOf(outcome.error) }),
    };
    const tasks = [deps.logUsage(record)];
    if (picked.keySource === "house" && costUsd > 0) tasks.push(deps.chargeHouse(req.workspaceId, costUsd));
    const results = await Promise.allSettled(tasks);
    for (const r of results) {
      if (r.status === "rejected") console.error(`[ai/gateway] metering failed for ${req.task}`, r.reason);
    }
  }

  return {
    /** Whether an AI call can run for this workspace right now. */
    async isConfigured(workspaceId: string): Promise<boolean> {
      return deps.houseProvider() !== null || (await deps.userProvider(workspaceId).catch(() => null)) !== null;
    },

    /** One structured call. Validation and retries stay with the caller (lib/analysis/). */
    async generate(req: GenerateRequest): Promise<ModelTurn> {
      const picked = await pick(req.workspaceId);
      const startedAt = now();
      try {
        const turn = await picked.provider.parse({ ...providerCall(req), schema: req.schema });
        await meter(req, picked, startedAt, { ok: true, usage: turn.usage });
        return turn;
      } catch (error) {
        await meter(req, picked, startedAt, { ok: false, error, chargeEstimate: false });
        throw error;
      }
    },

    /** A streamed text answer, metered once when it finishes or breaks. */
    async *stream(req: StreamRequest): AsyncGenerator<GatewayStreamEvent> {
      const picked = await pick(req.workspaceId);
      const startedAt = now();
      let hasStreamedText = false;
      try {
        for await (const event of picked.provider.stream(providerCall(req), req.signal)) {
          if (event.type === "text") {
            hasStreamedText = true;
            yield event;
            continue;
          }
          await meter(req, picked, startedAt, { ok: true, usage: event.usage });
          yield { type: "final", stopReason: event.stopReason };
        }
      } catch (error) {
        await meter(req, picked, startedAt, { ok: false, error, chargeEstimate: hasStreamedText });
        throw error;
      }
    },
  };
}

function errorKindOf(error: unknown): AiErrorKind {
  return error instanceof AiError ? error.kind : "provider_down";
}

export type Gateway = ReturnType<typeof createGateway>;

let houseProvider: AiProvider | undefined;

/** A provider on the workspace's saved key. The plaintext key goes straight into the SDK client and nowhere else. */
async function userProviderFor(workspaceId: string): Promise<AiProvider | null> {
  try {
    const saved = await readWorkspaceKey(workspaceId);
    return saved ? createAnthropicProvider("user", saved.apiKey) : null;
  } catch (err) {
    if (!(err instanceof UnreadableKeyError)) throw err;
    console.error("[ai/gateway] a workspace's saved key can't be decrypted; it needs to be added again");
    throw new AiError("invalid_key", "user");
  }
}

/** The app's gateway: the workspace's own key or the house key, usage rows on disk, the per-browser demo budget. */
export const gateway: Gateway = createGateway({
  houseProvider: () => {
    if (!hasHouseKey()) return null;
    houseProvider ??= createAnthropicProvider("house");
    return houseProvider;
  },
  userProvider: userProviderFor,
  logUsage: appendUsage,
  chargeHouse: recordSpend,
});
