import { START_LABELS, startWindow } from "@/lib/availability";

export function DemoBadge({ label = "Demo data", title = "Fictional shop created for this demo" }: { label?: string; title?: string }) {
  return (
    <span title={title} className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-demo-soft px-2 py-0.5 text-xs font-medium text-demo">
      {label}
    </span>
  );
}

/** How soon a shop can start: green for this week, neutral otherwise. */
export function StartBadge({ canStartNow }: { canStartNow: boolean | undefined }) {
  const window = startWindow(canStartNow);
  return window === "this_week" ? (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-idle-soft px-2 py-0.5 text-xs font-medium text-idle">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-idle" />
      {START_LABELS[window]}
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">{START_LABELS[window]}</span>
  );
}
