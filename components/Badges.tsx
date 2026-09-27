export function DemoBadge({ label = "Demo data", title = "Fictional shop created for this demo" }: { label?: string; title?: string }) {
  return (
    <span title={title} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-demo-soft px-2 py-0.5 text-xs font-medium text-demo">
      {label}
    </span>
  );
}

export function IdleBadge({ hoursPerWeek }: { hoursPerWeek?: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-idle-soft px-2 py-0.5 text-xs font-medium text-idle">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-idle" />
      Idle this month{hoursPerWeek ? ` · ${hoursPerWeek} h/wk` : ""}
    </span>
  );
}
