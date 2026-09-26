// Anthropic first-party API list prices, USD per million tokens (from the
// claude-api reference, 2026). Cache writes (5-minute TTL) cost 1.25x input;
// cache reads cost 0.1x input. Used to meter the per-browser demo budget.

type Rate = { input: number; output: number };

const RATES: Record<string, Rate> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Unknown models are priced at the most expensive known rate, so a budget never under-counts. */
const MOST_EXPENSIVE = Object.values(RATES).reduce((a, b) => (b.input > a.input ? b : a));
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;
const PER_TOKEN = 1 / 1_000_000;

export type TurnUsage = {
  /** The model that actually served the turn (may be a fallback model). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
};

export function costOfTurn(usage: TurnUsage): number {
  const rate = RATES[usage.model] ?? MOST_EXPENSIVE;
  return (
    (usage.inputTokens * rate.input +
      usage.outputTokens * rate.output +
      usage.cacheWriteTokens * rate.input * CACHE_WRITE_MULTIPLIER +
      usage.cacheReadTokens * rate.input * CACHE_READ_MULTIPLIER) *
    PER_TOKEN
  );
}
