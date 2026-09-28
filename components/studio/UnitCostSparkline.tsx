import type { TrendPoint } from "@/lib/studio/summary";

const W = 320;
const H = 48;
const PAD = 5;
const usd = (n: number) => `$${n < 10 ? n.toFixed(2) : Math.round(n).toLocaleString("en-US")}`;

/**
 * Best-path unit cost (est.) per analyzed version. One series, so no legend:
 * the caption names it, and the first and last values are labeled.
 */
export function UnitCostSparkline({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="text-[13px] text-ink-2">The cost of each appears here after the first analysis.</p>;
  }
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length === 1) {
    // Nothing to trend yet: a baseline that invites the next version.
    return (
      <figure className="flex flex-col gap-1.5">
        <figcaption className="text-[13px] font-medium text-ink-2">Cost of each by version, est.</figcaption>
        <div className="relative flex h-12 items-center">
          <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
          <span aria-hidden className="relative h-2.5 w-2.5 rounded-pill bg-accent" />
        </div>
        <p className="flex justify-between gap-2 font-mono text-[12px] text-ink-2">
          <span className="text-ink">Version {first.version}: {usd(first.mid)}</span>
          <span>Try a design tweak to bring this down</span>
        </p>
      </figure>
    );
  }
  const change = Math.round(((last.mid - first.mid) / first.mid) * 100);
  const lo = Math.min(...points.map((p) => p.low));
  const hi = Math.max(...points.map((p) => p.high));
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - 2 * PAD));
  const y = (v: number) => (hi === lo ? H / 2 : PAD + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD));
  const band =
    points.map((p, i) => `${x(i)},${y(p.high)}`).join(" ") + " " + [...points].reverse().map((p, i) => `${x(points.length - 1 - i)},${y(p.low)}`).join(" ");

  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-2">Cost of each by version, est.</span>
        {points.length > 1 && change !== 0 && (
          <span className={`font-mono text-[13px] font-semibold ${change < 0 ? "text-green-ink" : "text-accent-ink"}`}>
            {change < 0 ? "−" : "+"}
            {Math.abs(change)}%
          </span>
        )}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`The cost of each went from ${usd(first.mid)} in version ${first.version} to ${usd(last.mid)} in v${last.version} (estimates).`}>
        {points.length > 1 && <polygon points={band} className="fill-ink/5" />}
        {points.length > 1 && (
          <polyline points={points.map((p, i) => `${x(i)},${y(p.mid)}`).join(" ")} fill="none" className="stroke-ink" strokeWidth={2} />
        )}
        {points.map((p, i) => (
          <circle key={p.version} cx={x(i)} cy={y(p.mid)} r={3.5} className={i === points.length - 1 ? "fill-accent" : "fill-ink"}>
            <title>{`v${p.version}: ${usd(p.low)}–${usd(p.high)} per unit (est.)`}</title>
          </circle>
        ))}
      </svg>
      <p className="flex justify-between font-mono text-[12px] text-ink-2">
        <span>Version {first.version}: {usd(first.mid)}</span>
        {points.length > 1 ? <span className="text-ink">Version {last.version}: {usd(last.mid)}</span> : <span>One version so far</span>}
      </p>
    </figure>
  );
}
