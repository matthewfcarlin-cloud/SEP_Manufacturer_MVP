"use client";

import { useMemo } from "react";
import { CostByVolumeChart } from "@/components/analysis/CostByVolumeChart";
import { FormError } from "@/components/upload/UploadPickers";
import { controlClasses } from "@/components/ui/Field";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { MAX_QUANTITY_TIERS } from "@/lib/businessCase";
import { effectiveCostCurve, type CostCurve } from "@/lib/costCurve";
import { formatUsd } from "@/lib/format";
import { PriceSuggestionChip } from "./PriceSuggestionChip";
import { TierTable } from "./TierTable";
import { useBusinessCase } from "./BusinessCaseContext";
import type { SaveState } from "./useBusinessCaseDraft";
import { VerdictCard } from "./VerdictCard";
import { buttonClasses } from "@/components/ui/classes";

const SAVE_LABEL: Record<SaveState, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Not saved" };

/** The full business case, for the Money screen's details: every number, the table and the cost chart. */
export function BusinessCasePanel() {
  const { draft, parsed, suggestion, saveState, saveError, update, priceAi, result, paths, targetQuantity } = useBusinessCase();
  const curves = useMemo(() => paths.map(effectiveCostCurve).filter((c): c is CostCurve => c !== null), [paths]);
  const hasCurves = curves.length === paths.length && curves.length > 0;
  const revenueShare = "inputs" in parsed ? parsed.inputs.revenueShare : null;

  return (
    <section aria-labelledby="business-case-heading" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="business-case-heading" className="type-h2">Business case</h2>
          <p className="mt-1 text-sm text-ink-2">Can this make money? Set a retail price and the run sizes you&apos;re weighing.</p>
        </div>
        <p className="text-[13px] text-ink-2" aria-live="polite">{SAVE_LABEL[saveState]}</p>
      </div>

      <div className="grid gap-4 card card-pad @3xl:grid-cols-[1fr_1.4fr_1fr]">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Retail price (USD)
            <input
              inputMode="decimal"
              value={draft.price}
              onChange={(e) => update({ price: e.target.value, priceSource: "user" })}
              className={controlClasses()}
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
            className="self-start text-sm font-medium text-accent-ink hover:underline disabled:cursor-wait disabled:opacity-60"
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
                  className={`${controlClasses()} w-24`}
                />
                {draft.tiers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove run size ${i + 1}`}
                    onClick={() => update({ tiers: draft.tiers.filter((_, j) => j !== i) })}
                    className="px-1.5 text-ink-2 hover:text-ink"
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
                className={buttonClasses({ variant: "secondary", size: "sm", className: "border-dashed" })}
              >
                + Add
              </button>
            )}
          </div>
          <p className="text-[13px] text-ink-2">Your target is {targetQuantity.toLocaleString("en-US")} units.</p>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Your share of retail (%)
            <input inputMode="numeric" value={draft.sharePct} onChange={(e) => update({ sharePct: e.target.value })} className={`${controlClasses()} w-24`} />
          </label>
          <p className="text-[13px] text-ink-2">
            Stores and distributors usually keep 40–60% of the shelf price.
            {result && revenueShare !== null && <> At {Math.round(revenueShare * 100)}%, you receive {formatUsd(result.revenuePerUnit)} per unit.</>}
          </p>
        </div>
      </div>

      {"error" in parsed ? (
        <p className="rounded-card bg-bg p-5 text-sm text-ink-2">{parsed.error}</p>
      ) : (
        result && (
          <>
            <VerdictCard verdict={result.verdict} />
            <TierTable tiers={result.tiers} />
            {hasCurves && (
              <CostByVolumeChart
                curves={curves}
                targetQuantity={targetQuantity}
                title="Cost of each vs. what you receive"
                description="What each way of making it costs for each one (with the one-time setup cost spread over the run), against what you receive per sale. Where a line drops below the dashed line, that process pays back its tooling and starts making money."
                priceLine={{ value: result.revenuePerUnit, label: "You receive" }}
              />
            )}
          </>
        )
      )}

      <FormError message={saveState === "error" ? saveError : null} />
      <p className="text-[13px] text-ink-2">
        All figures are estimates from the AI analysis, shown as ranges; what you keep is worked out from what you receive per sale. The retail
        suggestion comes from the AI&apos;s general knowledge of similar products, not live market data.
      </p>
    </section>
  );
}
