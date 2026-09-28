import type { PriceSuggestion } from "@/lib/types";
import { buttonClasses } from "@/components/ui/classes";

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);

type Props = { suggestion: PriceSuggestion; isApplied: boolean; onApply: () => void };

export function PriceSuggestionChip({ suggestion, isApplied, onApply }: Props) {
  return (
    <details className="rounded-control bg-accent-soft px-3 py-2 text-[14px]">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[13px] font-medium text-accent-ink">AI suggests</span>
        <span className="font-mono font-semibold">{usd(suggestion.suggested)}</span>
        <span className="text-ink-2">
          ({usd(suggestion.low)}–{usd(suggestion.high)})
        </span>
        {isApplied ? (
          <span className="text-[13px] text-ink-2">· in use</span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onApply();
            }}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Use this price
          </button>
        )}
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-ink-2">
        <p>{suggestion.reasoning}</p>
        <ul className="list-disc pl-5">
          {suggestion.comparables.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="text-[13px]">From the AI&apos;s general knowledge of similar products, not live market data.</p>
      </div>
    </details>
  );
}
