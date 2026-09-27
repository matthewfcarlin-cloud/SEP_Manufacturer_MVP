"use client";

import { useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { AiCallError } from "@/lib/client/aiError";
import type { OrderOp } from "@/lib/orders/schemas";
import type { OrderView } from "@/lib/orders/view";
import type { OrderMessagePurpose, OrderRecipient } from "@/lib/types";

async function call<T>(url: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) throw new Error("The server didn't answer. Please try again.");
  if (!json.success) throw new AiCallError(json.error, res.status);
  return json.data;
}

/** A version's order view plus the calls that change it. Every call returns the recomputed view. */
export function useOrder(projectId: string, version: number, initial: OrderView) {
  const [view, setView] = useState<OrderView>(initial);
  // A server refresh (e.g. after choosing a quote above) brings a new plan.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setView(initial);
  }
  const target = { projectId, version };
  return {
    view,
    edit: async (op: OrderOp) => setView(await call<OrderView>("/api/orders", "PUT", { ...target, op })),
    /** Asks the AI for an email; returns its private rationale. */
    draft: async (to: OrderRecipient, purpose: OrderMessagePurpose) => {
      const data = await call<OrderView & { rationale: string }>("/api/orders/draft", "POST", { ...target, to, purpose });
      const { rationale, ...next } = data;
      setView(next);
      return rationale;
    },
  };
}
