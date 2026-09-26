import type { Verdict } from "@/lib/businessCase";

// Status is never color alone: each tone has an icon and a word.
const TONE = {
  good: { icon: "✓", word: "Looks profitable", className: "border-idle text-idle" },
  mixed: { icon: "!", word: "Depends on volume", className: "border-accent text-accent" },
  bad: { icon: "✕", word: "Not profitable", className: "border-accent text-accent" },
} as const;

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  const tone = TONE[verdict.tone];
  return (
    <div className={`flex flex-col gap-2 rounded-xl border-l-4 bg-surface p-5 ${tone.className}`} role="status">
      <p className="eyebrow flex items-center gap-2">
        <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px]">
          {tone.icon}
        </span>
        {tone.word} · estimate
      </p>
      <p className="display-type text-[clamp(1.4rem,2.6vw,2.1rem)] text-ink">{verdict.headline}</p>
      {verdict.detail && <p className="max-w-3xl text-sm text-muted">{verdict.detail}</p>}
    </div>
  );
}
