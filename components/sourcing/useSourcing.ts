"use client";

import { useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { AiCallError } from "@/lib/client/aiError";
import type { SourcingOp } from "@/lib/sourcing/schemas";
import type { Process, Sourcing } from "@/lib/types";

async function call<T>(url: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) throw new Error("The server didn't answer. Please try again.");
  if (!json.success) throw new AiCallError(json.error, res.status);
  return json.data;
}

/** A version's sourcing record plus the calls that change it. Every call returns the saved record. */
export function useSourcing(projectId: string, version: number, initial: Sourcing | undefined) {
  const [sourcing, setSourcing] = useState<Sourcing>(initial ?? { suppliers: [] });
  const target = { projectId, version };

  return {
    sourcing,
    /** Applies an edit; throws with the server's message on failure. */
    edit: async (op: SourcingOp) => setSourcing(await call<Sourcing>("/api/sourcing", "PUT", { ...target, op })),
    plan: async (process: Process) => setSourcing(await call<Sourcing>("/api/sourcing/plan", "POST", { ...target, process })),
    /** Asks the AI for the next message; returns its private rationale. */
    draft: async (supplierId: string) => {
      const data = await call<{ sourcing: Sourcing; rationale: string }>("/api/sourcing/draft", "POST", { ...target, supplierId });
      setSourcing(data.sourcing);
      return data.rationale;
    },
  };
}

/** Runs one async action at a time per key, with its error. */
export function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState(0);
  const run = async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(key);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setErrorStatus(err instanceof AiCallError ? err.status : 0);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      return undefined;
    } finally {
      setBusy(null);
    }
  };
  return { busy, error, errorStatus, run };
}
