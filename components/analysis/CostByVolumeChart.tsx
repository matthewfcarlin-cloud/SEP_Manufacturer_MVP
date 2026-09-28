"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cheapestByVolume, type CostCurve } from "@/lib/costCurve";
import { formatUnitCostRange } from "@/lib/format";
import { PROCESS_LABELS } from "@/lib/processes";
import { DetailsAccordion } from "@/components/ui/DetailsAccordion";

// Series colors come from validated CSS tokens in fixed order (slot = path rank).
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];
const HEIGHT = 300;
const PAD = { top: 16, right: 132, bottom: 36, left: 56 };
const LABEL_GAP = 16;

const log = Math.log10;
const usd = (n: number) =>
  n >= 100 ? `$${Math.round(n).toLocaleString("en-US")}` : n >= 10 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
const qty = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));

/** 1-2-5 ticks spanning [min, max] on a log scale. */
function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let e = Math.floor(log(min)); e <= Math.ceil(log(max)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min && v <= max) ticks.push(v);
    }
  }
  return ticks;
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Spreads end-of-line labels apart so none overlap (keeps order by value). */
function placeLabels(ys: number[]): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < order.length; k++) {
    order[k].y = Math.max(order[k].y, order[k - 1].y + LABEL_GAP);
  }
  const placed = new Array<number>(ys.length);
  order.forEach(({ y, i }) => (placed[i] = y));
  return placed;
}

/** A horizontal reference line, e.g. the revenue per part: where a curve drops below it, that process makes money. */
export type PriceLine = { value: number; label: string };

type Props = {
  curves: CostCurve[];
  targetQuantity: number;
  title?: string;
  description?: React.ReactNode;
  priceLine?: PriceLine;
};

const DEFAULT_DESCRIPTION = (
  <>
    The estimated cost of each, all in, with the one-time setup cost spread over the run. AI estimates, shown as ranges. Cost only: &ldquo;how well it fits&rdquo;
    above also weighs finish, strength and timing, so the best fit isn&apos;t always the cheapest.
  </>
);

export function CostByVolumeChart({ curves, targetQuantity, title = "Cost of each by quantity", description = DEFAULT_DESCRIPTION, priceLine }: Props) {
  const headingId = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const quantities = curves[0].points.map((p) => p.quantity);
  const summary = cheapestByVolume(curves);

  const geo = useMemo(() => {
    const all = [...curves.flatMap((c) => c.points.flatMap((p) => [p.low, p.high])), ...(priceLine ? [priceLine.value] : [])];
    const yMin = Math.min(...all) * 0.8;
    const yMax = Math.max(...all) * 1.25;
    const qMin = quantities[0];
    const qMax = quantities[quantities.length - 1];
    const plotW = Math.max(120, width - PAD.left - PAD.right);
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    // Rounded to 0.01 px: Node and the browser disagree in the last digits of
    // Math.log10, which otherwise causes a hydration mismatch on SSR.
    const px = (n: number) => Math.round(n * 100) / 100;
    const x = (q: number) => px(PAD.left + ((log(q) - log(qMin)) / (log(qMax) - log(qMin))) * plotW);
    const y = (v: number) => px(PAD.top + (1 - (log(v) - log(yMin)) / (log(yMax) - log(yMin))) * plotH);
    return { x, y, yTicks: logTicks(yMin, yMax), plotW, plotH, qMin, qMax };
  }, [curves, quantities, width, priceLine]);

  const endYs = placeLabels(curves.map((c) => geo.y(c.points[c.points.length - 1].mid)));
  const showTarget = targetQuantity >= geo.qMin && targetQuantity <= geo.qMax;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + PAD.left;
    let best = 0;
    quantities.forEach((q, i) => {
      if (Math.abs(geo.x(q) - px) < Math.abs(geo.x(quantities[best]) - px)) best = i;
    });
    setHover(best);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 card card-pad">
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="font-semibold">{title}</h3>
        <p className="text-sm text-ink-2">{description}</p>
      </div>
      {summary && <p className="text-sm font-medium">{summary}</p>}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2" aria-label="Legend">
        {curves.map((c, i) => (
          <li key={c.process} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-pill" style={{ background: SERIES[i] }} />
            {PROCESS_LABELS[c.process]}
          </li>
        ))}
        {priceLine && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-ink" />
            {priceLine.label}
          </li>
        )}
      </ul>

      <div ref={ref} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={summary ?? "Cost of each by quantity"}
          className="block max-w-full print:h-auto"
        >
          {geo.yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--ink-2)] text-[12px]">
                {usd(t)}
              </text>
            </g>
          ))}
          {quantities.map((q) => (
            <text key={q} x={geo.x(q)} y={HEIGHT - PAD.bottom + 20} textAnchor="middle" className="fill-[var(--ink-2)] text-[12px]">
              {qty(q)} units
            </text>
          ))}

          {showTarget && (
            <g>
              <line x1={geo.x(targetQuantity)} x2={geo.x(targetQuantity)} y1={PAD.top} y2={PAD.top + geo.plotH} stroke="var(--ink)" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
              <text x={geo.x(targetQuantity) + 6} y={PAD.top + 10} className="fill-[var(--ink)] text-[12px]">
                Your {targetQuantity.toLocaleString("en-US")}
              </text>
            </g>
          )}

          {priceLine && (
            <g>
              <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={geo.y(priceLine.value)} y2={geo.y(priceLine.value)} stroke="var(--ink)" strokeWidth={2} strokeDasharray="6 4" />
              <text x={PAD.left + 6} y={geo.y(priceLine.value) - 6} className="fill-[var(--ink)] text-[12px] font-medium">
                {priceLine.label} {usd(priceLine.value)}
              </text>
            </g>
          )}

          {curves.map((c, i) => {
            const band =
              c.points.map((p) => `${geo.x(p.quantity)},${geo.y(p.high)}`).join(" ") +
              " " +
              [...c.points].reverse().map((p) => `${geo.x(p.quantity)},${geo.y(p.low)}`).join(" ");
            const line = c.points.map((p) => `${geo.x(p.quantity)},${geo.y(p.mid)}`).join(" ");
            return (
              <g key={c.process}>
                <polygon points={band} fill={SERIES[i]} opacity={0.12} />
                <polyline points={line} fill="none" stroke={SERIES[i]} strokeWidth={2} strokeLinejoin="round" />
                {c.points.map((p) => (
                  <circle key={p.quantity} cx={geo.x(p.quantity)} cy={geo.y(p.mid)} r={4} fill={SERIES[i]} stroke="var(--surface)" strokeWidth={2} />
                ))}
                <circle cx={PAD.left + geo.plotW + 12} cy={endYs[i]} r={4} fill={SERIES[i]} />
                <text x={PAD.left + geo.plotW + 20} y={endYs[i]} dy="0.32em" className="fill-[var(--ink)] text-[12px]">
                  {PROCESS_LABELS[c.process]}
                </text>
              </g>
            );
          })}

          {hover !== null && (
            <line x1={geo.x(quantities[hover])} x2={geo.x(quantities[hover])} y1={PAD.top} y2={PAD.top + geo.plotH} stroke="var(--ink-2)" strokeWidth={1} />
          )}
          <rect
            x={PAD.left - 20}
            y={PAD.top}
            width={geo.plotW + 40}
            height={geo.plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 w-56 card p-3 text-[13px] shadow-pop"
            style={{ left: Math.min(geo.x(quantities[hover]) + 12, width - 232) }}
          >
            <p className="mb-2 font-medium">{quantities[hover].toLocaleString("en-US")} made, cost of each</p>
            {priceLine && (
              <p className="mb-2 flex justify-between gap-2 border-b border-border pb-2">
                <span>{priceLine.label}</span>
                <span className="font-mono">{usd(priceLine.value)}</span>
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {curves.map((c, i) => (
                <li key={c.process} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="h-2 w-2 rounded-pill" style={{ background: SERIES[i] }} />
                    {PROCESS_LABELS[c.process]}
                  </span>
                  <span className="font-mono">{formatUnitCostRange(c.points[hover])}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DetailsAccordion label="Show as table" openLabel="Hide the table" className="text-[14px] print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-ink-2">
                <th className="py-2 pr-3 font-medium">Process</th>
                {quantities.map((q) => (
                  <th key={q} className="py-2 pr-3 font-medium">{q.toLocaleString("en-US")} units</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {curves.map((c) => (
                <tr key={c.process} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">{PROCESS_LABELS[c.process]}</td>
                  {c.points.map((p) => (
                    <td key={p.quantity} className="py-2 pr-3 font-mono">{formatUnitCostRange(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DetailsAccordion>
    </section>
  );
}
