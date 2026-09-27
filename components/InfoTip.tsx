/** A small ⓘ that explains an unavoidable term on hover or keyboard focus. */
export function InfoTip({ text, label = "What this means" }: { text: string; label?: string }) {
  return (
    <span className="group/tip relative inline-flex align-middle">
      <button type="button" aria-label={`${label}: ${text}`} className="ml-1 grid h-4 w-4 place-items-center text-[11px] leading-none text-muted hover:text-ink focus-visible:text-ink">
        ⓘ
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden w-56 -translate-x-1/2 border border-line bg-surface px-3 py-2 text-left text-xs font-normal normal-case leading-snug tracking-normal text-ink shadow-lg group-focus-within/tip:block group-hover/tip:block"
      >
        {text}
      </span>
    </span>
  );
}

/** Plain words for the terms everyday people trip on, with the explanation behind ⓘ. */
export const PLAIN_TERMS = {
  setup: { label: "One-time setup cost", tip: "A mold, fixture or die made once for your part (it's called tooling). You pay it once, however many you make." },
  time: { label: "How long it takes", tip: "Calendar days from placing the order to having your first finished parts (the lead time)." },
  fit: { label: "How well it fits", tip: "How well this way of making suits your part and quantity, out of 100." },
  minOrder: { label: "Smallest order", tip: "The fewest they'll make in one order (the minimum order quantity)." },
} as const;
