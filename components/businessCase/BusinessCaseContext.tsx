"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ApiResponse } from "@/lib/api";
import { buildBusinessCase } from "@/lib/businessCase";
import { AiCallError } from "@/lib/client/aiError";
import type { BusinessCaseInputs, ManufacturingPath } from "@/lib/types";
import { useBusinessCaseDraft } from "./useBusinessCaseDraft";

function useSuggestPrice(projectId: string, version: number, onDone: (inputs: BusinessCaseInputs) => void) {
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const ask = async () => {
    setIsAsking(true);
    setError(null);
    try {
      const res = await fetch("/api/business-case/suggest-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version }),
      });
      const json = (await res.json()) as ApiResponse<BusinessCaseInputs>;
      if (!json.success) throw new AiCallError(json.error, res.status);
      onDone(json.data);
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "Couldn't get a price suggestion.", status: err instanceof AiCallError ? err.status : 0 });
    } finally {
      setIsAsking(false);
    }
  };
  return { ask, isAsking, error };
}

type Props = { projectId: string; version: number; paths: ManufacturingPath[]; targetQuantity: number; initial?: BusinessCaseInputs; children: ReactNode };

function useBusinessCaseState({ projectId, version, paths, targetQuantity, initial }: Omit<Props, "children">) {
  const draftState = useBusinessCaseDraft(projectId, version, initial);
  const priceAi = useSuggestPrice(projectId, version, draftState.acceptServerInputs);
  const { parsed, suggestion } = draftState;
  /** The inputs as they stand right now (with the saved AI suggestion), or undefined while the form is invalid. */
  const inputs = useMemo<BusinessCaseInputs | undefined>(() => ("inputs" in parsed ? { ...parsed.inputs, ...(suggestion && { priceSuggestion: suggestion }) } : undefined), [parsed, suggestion]);
  const result = useMemo(() => (inputs ? buildBusinessCase(paths, inputs) : null), [inputs, paths]);
  return { ...draftState, priceAi, inputs, result, paths, targetQuantity, projectId, version };
}

type BusinessCaseState = ReturnType<typeof useBusinessCaseState>;
const Context = createContext<BusinessCaseState | null>(null);

/**
 * One version's business case, shared by everything on the Money screen: the
 * price slider, the live verdict, the profit bars and the full table in the
 * details all read and edit the same draft, which saves itself.
 */
export function BusinessCaseProvider({ children, ...props }: Props) {
  const state = useBusinessCaseState(props);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useBusinessCase(): BusinessCaseState {
  const state = useContext(Context);
  if (!state) throw new Error("useBusinessCase must be used inside <BusinessCaseProvider>");
  return state;
}
