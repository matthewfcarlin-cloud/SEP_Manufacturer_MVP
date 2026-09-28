import { StatusPill } from "@/components/ui/StatusPill";
import { START_LABELS, startWindow } from "@/lib/availability";

export function DemoBadge({ label = "Demo data", title = "Fictional shop created for this demo" }: { label?: string; title?: string }) {
  return (
    <StatusPill tone="amber" title={title}>
      {label}
    </StatusPill>
  );
}

/** How soon a shop can start: green for this week, neutral otherwise. */
export function StartBadge({ canStartNow }: { canStartNow: boolean | undefined }) {
  const window = startWindow(canStartNow);
  return <StatusPill tone={window === "this_week" ? "green" : "neutral"}>{START_LABELS[window]}</StatusPill>;
}
