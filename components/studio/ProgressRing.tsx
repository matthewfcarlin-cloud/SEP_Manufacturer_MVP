/** A 48px progress ring with "2/5" in the middle. */
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 48;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = total > 0 ? (done / total) * circumference : 0;
  return (
    <div className="relative grid h-12 w-12 shrink-0 place-items-center" role="img" aria-label={`${done} of ${total} done`}>
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done === total ? "var(--green)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] motion-reduce:transition-none"
        />
      </svg>
      <span aria-hidden className="font-mono text-[13px] text-ink">
        {done}/{total}
      </span>
    </div>
  );
}
