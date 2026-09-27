"use client";

import { useMemo, useState } from "react";
import { CostByVolumeChart } from "@/components/analysis/CostByVolumeChart";
import { FormError, inputClass } from "@/components/upload/UploadPickers";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import type { ApiResponse } from "@/lib/api";
import { AiCallError } from "@/lib/client/aiError";
import { buildBusinessCase, MAX_QUANTITY_TIERS } from "@/lib/businessCase";
import { effectiveCostCurve, type CostCurve } from "@/lib/costCurve";
import { formatUsd } from "@/lib/format";
import type { BusinessCaseInputs, ManufacturingPath } from "@/lib/types";
import { PriceSuggestionChip } from "./PriceSuggestionChip";
import { TierTable } from "./TierTable";
import { useBusinessCaseDraft, type SaveState } from "./useBusinessCaseDraft";
import { VerdictCard } from "./VerdictCard";

type Props = {
  projectId: string;
  version: number;
  paths: ManufacturingPath[];
  targetQuantity: number;
  initial?: BusinessCaseInputs;
};

const SAVE_LABEL: Record<SaveState, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Not saved" };

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

export function BusinessCasePanel({ projectId, version, paths, targetQuantity, initial }: Props) {
  const { draft, parsed, suggestion, saveState, saveError, update, acceptServerInputs } = useBusinessCaseDraft(projectId, version, initial);
  const priceAi = useSuggestPrice(projectId, version, acceptServerInputs);

  const result = useMemo(() => ("inputs" in parsed ? buildBusinessCase(paths, parsed.inputs) : null), [parsed, paths]);
  const curves = useMemo(() => paths.map(effectiveCostCurve).filter((c): c is CostCurve => c !== null), [paths]);
  const hasCurves = curves.length === paths.length && curves.length > 0;
  const revenueShare = "inputs" in parsed ? parsed.inputs.revenueShare : null;

  return (
    <section aria-labelledby="business-case-heading" className="flex flex-col gap-6 border-t border-line pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="business-case-heading" className="display-type text-[clamp(2rem,4vw,3.25rem)]">Business case</h2>
          <p className="mt-1 text-sm text-muted">Can this make money? Set a retail price and the run sizes you&apos;re weighing.</p>
        </div>
        <p className="text-xs text-muted" aria-live="polite">{SAVE_LABEL[saveState]}</p>
      </div>

      <div className="grid gap-4 rounded-xl border border-line bg-surface p-5 lg:grid-cols-[1fr_1.4fr_1fr]">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Retail price (USD)
            <input
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => update({ price: e.target.value, priceSource: "user" })}
              className={inputClass}
              placeholder="49"
            />
          </label>
          {suggestion ? (
            <PriceSuggestionChip
              suggestion={suggestion}
              isApplied={draft.priceSource === "ai" && Number(draft.price) === suggestion.suggested}
              onApply={() => update({ price: String(suggestion.suggested), priceSource: "ai" })}
            />
          ) : null}
          <button
            type="button"
            onClick={priceAi.ask}
            disabled={priceAi.isAsking}
            className="self-start text-sm font-medium text-accent hover:underline disabled:cursor-wait disabled:opacity-60"
          >
            {priceAi.isAsking ? "Looking at similar products…" : suggestion ? "Ask the AI again" : "Suggest a price from similar products"}
          </button>
          {priceAi.error && <AiErrorBanner message={priceAi.error.message} status={priceAi.error.status} />}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Run sizes (units)</legend>
          <div className="flex flex-wrap items-center gap-2">
            {draft.tiers.map((tier, i) => (
              <div key={i} className="flex items-center">
                <input
                  inputMode="numeric"
                  aria-label={`Run size ${i + 1}`}
                  value={tier}
                  onChange={(e) => update({ tiers: draft.tiers.map((t, j) => (j === i ? e.target.value : t)) })}
                  className={`${inputClass} w-24`}
                />
                {draft.tiers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove run size ${i + 1}`}
                    onClick={() => update({ tiers: draft.tiers.filter((_, j) => j !== i) })}
                    className="px-1.5 text-muted hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {draft.tiers.length < MAX_QUANTITY_TIERS && (
              <button
                type="button"
                onClick={() => update({ tiers: [...draft.tiers, String(Number(draft.tiers.at(-1) ?? 100) * 10 || 100)] })}
                className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-muted hover:border-ink hover:text-ink"
              >
                + Add
              </button>
            )}
          </div>
          <p className="text-xs text-muted">Your target is {targetQuantity.toLocaleString("en-US")} units.</p>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Your share of retail (%)
            <input inputMode="numeric" value={draft.sharePct} onChange={(e) => update({ sharePct: e.target.value })} className={`${inputClass} w-24`} />
          </label>
          <p className="text-xs text-muted">
            Stores and distributors usually keep 40–60% of the shelf price.
            {result && revenueShare !== null && <> At {Math.round(revenueShare * 100)}%, you receive {formatUsd(result.revenuePerUnit)} per unit.</>}
          </p>
        </div>
      </div>

      {"error" in parsed ? (
        <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">{parsed.error}</p>
      ) : (
        result && (
          <>
            <VerdictCard verdict={result.verdict} />
            <TierTable tiers={result.tiers} />
            {hasCurves && (
              <CostByVolumeChart
                curves={curves}
                targetQuantity={targetQuantity}
                title="Cost per part vs. what you receive"
                description="Each process's all-in cost per part (the one-time setup cost spread over the run) against your revenue per unit. Where a line drops below the dashed line, that process pays back its tooling and starts making money."
                priceLine={{ value: result.revenuePerUnit, label: "You receive" }}
              />
            )}
          </>
        )
      )}

      <FormError message={saveState === "error" ? saveError : null} />
      <p className="text-xs text-muted">
        All figures are estimates from the AI analysis, shown as ranges; margin is on what you receive per unit. The retail
        suggestion comes from the AI&apos;s general knowledge of similar products, not live market data.
      </p>
    </section>
  );
}
