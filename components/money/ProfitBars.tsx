"use client";

import { useState } from "react";
import { useBusinessCase } from "@/components/businessCase/BusinessCaseContext";
import { cx } from "@/components/ui/classes";
import { profitBars } from "@/lib/studio/money";

/** Plot height for the taller side of zero, in px. */
const PLOT_PX = 140;
const MINUS = "−";
/** Room for the value label above a profit bar or below a loss bar, so every column shares one zero line. */
const LABEL_PX = 24;

const compact = (n: number) => {
  const abs = Math.abs(n);
  const text = abs >= 1000 ? `$${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k` : `$${Math.round(abs)}`;
  return `${n < 0 ? MINUS : ""}${text}`;
};

/**
 * Profit (or loss) on the whole run if you made 100, 1,000 or 10,000, at the
 * price on the slider. One series, so no legend; green above zero, red below,
 * and every bar says "profit" or "loss" in words. The full table is in the details.
 */
export function ProfitBars() {
  const { inputs, paths } = useBusinessCase();
  const [hover, setHover] = useState<number | null>(null);
  if (!inputs) return null;
  const bars = profitBars(paths, inputs);
  const top = Math.max(0, ...bars.map((b) => b.profit));
  const bottom = Math.max(0, ...bars.map((b) => -b.profit));
  const scale = (top + bottom) === 0 ? 0 : PLOT_PX / Math.max(top, bottom);
  const above = top * scale;
  const below = bottom * scale;

  return (
    <section aria-labelledby="profit-heading" className="card card-pad flex flex-col gap-4">
      <div>
        <h2 id="profit-heading" className="type-h3">
          Profit on the whole run
        </h2>
        <p className="type-small text-ink-2">At this price, if you made 100, 1,000 or 10,000 (est.).</p>
      </div>
      <figure className="relative" aria-label="Profit on the whole run at 100, 1,000 and 10,000 made">
        <div className="grid grid-cols-3 gap-4">
          {bars.map((b, i) => {
            const isLoss = b.profit < 0;
            const h = Math.max(2, Math.abs(b.profit) * scale);
            const label = `${compact(b.profit)} ${isLoss ? "loss" : "profit"}`;
            return (
              <div
                key={b.quantity}
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`Make ${b.quantity.toLocaleString("en-US")}: ${label}`}
                className="relative flex flex-col items-center rounded-control outline-offset-4"
              >
                {/* Above zero */}
                <div className="flex w-full flex-col items-center justify-end" style={{ height: above + LABEL_PX }}>
                  {!isLoss && <span className="type-small mb-1 font-mono text-ink">{label}</span>}
                  {!isLoss && <span className="w-full max-w-12 rounded-t-[4px] bg-green" style={{ height: h }} />}
                </div>
                <span aria-hidden className="h-px w-full bg-border" />
                {/* Below zero */}
                <div className="flex w-full flex-col items-center justify-start" style={{ height: below + LABEL_PX }}>
                  {isLoss && <span className="w-full max-w-12 rounded-b-[4px] bg-red" style={{ height: h }} />}
                  {isLoss && <span className="type-small mt-1 font-mono text-ink">{label}</span>}
                </div>
                <span className="type-small mt-2 text-ink-2">{b.quantity.toLocaleString("en-US")} made</span>
                {hover === i && (
                  <span role="tooltip" className="type-small pointer-events-none absolute -top-2 left-1/2 z-10 w-44 -translate-x-1/2 -translate-y-full rounded-[12px] bg-surface p-2.5 text-ink shadow-pop">
                    Make {b.quantity.toLocaleString("en-US")}: you&apos;d {isLoss ? "lose" : "make"} about {compact(Math.abs(b.profit))} in total, or{" "}
                    ${(Math.abs(b.profit) / b.quantity).toFixed(2)} {isLoss ? "lost" : "kept"} on each (est.).
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </figure>
      <p className={cx("type-small text-muted")}>The table with every number is in the details below.</p>
    </section>
  );
}
