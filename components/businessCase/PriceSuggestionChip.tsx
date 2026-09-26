import type { PriceSuggestion } from "@/lib/types";

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

type Props = { suggestion: PriceSuggestion; isApplied: boolean; onApply: () => void };

export function PriceSuggestionChip({ suggestion, isApplied, onApply }: Props) {
  return (
    <details className="rounded-lg border border-line bg-bg px-3 py-2 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1">
        <span className="eyebrow text-accent">AI suggests</span>
        <span className="font-mono font-semibold">{usd(suggestion.suggested)}</span>
        <span className="text-muted">
          ({usd(suggestion.low)}–{usd(suggestion.high)})
        </span>
        {isApplied ? (
          <span className="text-xs text-muted">· in use</span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onApply();
            }}
            className="rounded border border-line px-2 py-0.5 text-xs font-medium hover:border-ink"
          >
            Use this price
          </button>
        )}
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-muted">
        <p>{suggestion.reasoning}</p>
        <ul className="list-disc pl-5">
          {suggestion.comparables.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="text-xs">From the AI&apos;s general knowledge of similar products, not live market data.</p>
      </div>
    </details>
  );
}
