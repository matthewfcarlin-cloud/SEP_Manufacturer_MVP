// Browser-safe: no file system. The ledgers that use these live in ./budget.ts.

export type AiAction = "analysis" | "pitch" | "chat" | "price" | "sourcing" | "negotiation" | "plan" | "listing" | "bom" | "order";

/** Conservative cost of one action, including a possible retry (Opus 5, measured usage + headroom). */
export const ACTION_ESTIMATE_USD: Record<AiAction, number> = { analysis: 0.6, pitch: 0.15, chat: 0.1, price: 0.05, sourcing: 0.08, negotiation: 0.15, plan: 0.15, listing: 0.08, bom: 0.15, order: 0.08 };
