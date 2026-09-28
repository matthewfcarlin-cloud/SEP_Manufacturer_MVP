"use client";

import { useBusinessCase } from "@/components/businessCase/BusinessCaseContext";
import { priceRange } from "@/lib/studio/money";

const SAVE_LABEL = { idle: "", saving: "Saving…", saved: "Saved", error: "Not saved" } as const;
const usd = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** The retail price as a slider: drag it and the verdict and profit bars update at once; it saves itself. */
export function PriceSlider() {
  const { draft, inputs, paths, targetQuantity, suggestion, saveState, update } = useBusinessCase();
  const { min, max, step } = priceRange(paths, inputs, targetQuantity);
  const current = Number(draft.price);
  const value = Number.isFinite(current) && current > 0 ? Math.min(Math.max(current, min), max) : min;
  const isSuggestionInUse = suggestion && current === suggestion.suggested;

  return (
    <section aria-labelledby="price-heading" className="card card-pad flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="price-heading" className="type-h3">
            Your price
          </h2>
          <p className="type-small text-ink-2">What a customer pays for one.</p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="type-price-lg" aria-hidden>
            {draft.price.trim() ? usd(current) : "—"}
          </p>
          <span className="type-small text-muted" aria-live="polite">
            {SAVE_LABEL[saveState]}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => update({ price: e.target.value, priceSource: "user" })}
        aria-label="Your price in US dollars"
        aria-valuetext={usd(value)}
        className="h-2 w-full cursor-pointer accent-[var(--accent)]"
      />
      <div className="type-small flex justify-between font-mono text-muted" aria-hidden>
        <span>{usd(min)}</span>
        <span>{usd(max)}</span>
      </div>
      {suggestion && (
        <p className="type-small text-ink-2">
          Similar products sell for about {usd(suggestion.low)}–{usd(suggestion.high)}.{" "}
          {isSuggestionInUse ? (
            <span className="text-muted">That&apos;s the price Moko suggests.</span>
          ) : (
            <button type="button" onClick={() => update({ price: String(suggestion.suggested), priceSource: "ai" })} className="font-semibold text-accent-ink hover:underline">
              Use Moko&apos;s suggestion, {usd(suggestion.suggested)}
            </button>
          )}
        </p>
      )}
    </section>
  );
}
