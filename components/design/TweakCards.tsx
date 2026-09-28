import { Lightbulb } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import type { ManufacturingPath } from "@/lib/types";
import { tweakSaving } from "@/lib/studio/stageDisplay";

type Props = { projectId: string; version: number; path: ManufacturingPath };

/** Cheaper-to-make suggestions (§4 Design): a lightbulb, the tweak in plain words, what it saves, and "Apply this". */
export function TweakCards({ projectId, version, path }: Props) {
  if (path.designTweaks.length === 0) return null;
  const unitCostMid = (path.unitCostUsd.low + path.unitCostUsd.high) / 2;
  return (
    <section aria-labelledby="tweaks-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="tweaks-heading" className="type-h2">
          Ways to make it cheaper
        </h2>
        <p className="text-ink-2">Each one is a change to your design. Applying it starts a new version you can compare.</p>
      </div>
      <ul className="grid gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {path.designTweaks.map((tweak, i) => {
          const saving = tweakSaving(tweak.impact, unitCostMid);
          return (
            <li key={`${i}-${tweak.change}`} className="card card-pad flex flex-col gap-3">
              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-pill bg-amber-soft text-amber-ink">
                <Lightbulb size={20} strokeWidth={1.75} />
              </span>
              <h3 className="type-h3 line-clamp-3">{tweak.change}</h3>
              {saving !== null && saving >= 0.5 ? (
                <p className="font-semibold text-green-ink">Saves about ${saving < 10 ? saving.toFixed(2) : Math.round(saving)} each</p>
              ) : (
                <p className="type-small line-clamp-2 text-ink-2">{tweak.impact}</p>
              )}
              <div className="mt-auto pt-1">
                <ButtonLink href={`/project/${projectId}/versions/new?from=${version}&tweak=0.${i}`} variant="secondary" size="sm">
                  Apply this
                </ButtonLink>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="type-small text-muted">Savings are estimates from the analysis.</p>
    </section>
  );
}
