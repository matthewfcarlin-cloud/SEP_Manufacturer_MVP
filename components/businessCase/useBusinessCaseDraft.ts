"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { DEFAULT_QUANTITY_TIERS, DEFAULT_REVENUE_SHARE } from "@/lib/businessCase";
import { businessCaseInputsSchema } from "@/lib/schemas";
import type { BusinessCaseInputs, PriceSuggestion } from "@/lib/types";

const SAVE_DELAY_MS = 700;
const editableSchema = businessCaseInputsSchema.omit({ priceSuggestion: true });

/** What the form holds: raw strings, so half-typed numbers don't jump around. */
export type Draft = { price: string; tiers: string[]; sharePct: string; priceSource: "ai" | "user" };
export type SaveState = "idle" | "saving" | "saved" | "error";

const toDraft = (inputs?: BusinessCaseInputs): Draft => ({
  price: inputs ? String(inputs.retailPriceUsd) : "",
  tiers: (inputs?.quantityTiers ?? DEFAULT_QUANTITY_TIERS).map(String),
  sharePct: String(Math.round((inputs?.revenueShare ?? DEFAULT_REVENUE_SHARE) * 100)),
  priceSource: inputs?.priceSource ?? "user",
});

const toNumber = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));

/** Parses the draft; the error names the first problem in plain words. */
function parseDraft(draft: Draft): { inputs: Omit<BusinessCaseInputs, "priceSuggestion"> } | { error: string } {
  if (draft.price.trim() === "") return { error: "Enter a retail price, or ask the AI for one." };
  const result = editableSchema.safeParse({
    retailPriceUsd: toNumber(draft.price),
    priceSource: draft.priceSource,
    quantityTiers: draft.tiers.map(toNumber),
    revenueShare: toNumber(draft.sharePct) / 100,
  });
  if (!result.success) {
    const issue = result.error.issues[0];
    return { error: issue.code === "invalid_type" ? "Fill in every number." : issue.message };
  }
  return { inputs: result.data };
}

/** Form state for one version's business case, auto-saved shortly after each valid change. */
export function useBusinessCaseDraft(projectId: string, version: number, initial?: BusinessCaseInputs) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [suggestion, setSuggestion] = useState<PriceSuggestion | undefined>(initial?.priceSuggestion);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const isDirty = useRef(false);
  const router = useRouter();
  // The first price ever saved finishes the Money stage: refresh once so the stepper can celebrate.
  const isFirstSave = useRef(!initial);

  const parsed = useMemo(() => parseDraft(draft), [draft]);

  useEffect(() => {
    if (!isDirty.current || !("inputs" in parsed)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSaveState("saving");
      try {
        const res = await fetch("/api/business-case", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, version, inputs: parsed.inputs }),
          signal: controller.signal,
        });
        const json = (await res.json()) as ApiResponse<BusinessCaseInputs>;
        if (!json.success) throw new Error(json.error);
        setSaveState("saved");
        setSaveError(null);
        if (isFirstSave.current) {
          isFirstSave.current = false;
          router.refresh();
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setSaveState("error");
        setSaveError(err instanceof Error ? err.message : "Couldn't save.");
      }
    }, SAVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [parsed, projectId, version, router]);

  const update = (patch: Partial<Draft>) => {
    isDirty.current = true;
    setDraft((d) => ({ ...d, ...patch }));
  };

  /** Takes what the server returned from the AI price call (already saved there). */
  const acceptServerInputs = (inputs: BusinessCaseInputs) => {
    isDirty.current = false;
    setSuggestion(inputs.priceSuggestion);
    setDraft(toDraft(inputs));
    setSaveState("saved");
  };

  return { draft, parsed, suggestion, saveState, saveError, update, acceptServerInputs };
}
