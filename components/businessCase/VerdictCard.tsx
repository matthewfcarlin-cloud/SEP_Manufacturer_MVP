import { VerdictCard as SummaryCard, type VerdictTone } from "@/components/ui/VerdictCard";
import type { Verdict } from "@/lib/businessCase";

const TONE: Record<Verdict["tone"], VerdictTone> = { good: "good", mixed: "check", bad: "bad" };

/** The business case's verdict: the shared summary card, colored by the verdict. */
export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return <SummaryCard tone={TONE[verdict.tone]} title={verdict.headline} explanation={verdict.detail ? `${verdict.detail} (estimate)` : "Estimate."} />;
}
