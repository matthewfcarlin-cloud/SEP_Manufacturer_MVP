"use client";

import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { useBusinessCase } from "@/components/businessCase/BusinessCaseContext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { VerdictCard, type VerdictTone } from "@/components/ui/VerdictCard";
import { moneyReadout, type MoneyTone } from "@/lib/studio/money";

const TONE: Record<MoneyTone, VerdictTone> = { good: "good", warn: "check", bad: "bad", neutral: "check" };

type Props = { tweakHref: string; next: { label: string; href: string } };

/** Money's summary card: the verdict follows the price slider as it moves, with one button for what to do about it. */
export function LiveMoneySummary({ tweakHref, next }: Props) {
  const { inputs, paths, targetQuantity, priceAi } = useBusinessCase();
  const readout = moneyReadout(paths, inputs, targetQuantity);
  const action =
    readout.tone === "bad" ? (
      <ButtonLink href={tweakHref} icon={Wand2}>
        Try a design tweak
      </ButtonLink>
    ) : readout.tone === "neutral" ? (
      <div className="flex flex-col items-start gap-3">
        <Button icon={Sparkles} onClick={priceAi.ask} disabled={priceAi.isAsking}>
          {priceAi.isAsking ? "Looking at similar products…" : "Suggest a price"}
        </Button>
        {priceAi.error && <AiErrorBanner message={priceAi.error.message} status={priceAi.error.status} />}
      </div>
    ) : (
      <ButtonLink href={next.href} iconRight={ArrowRight}>
        {next.label}
      </ButtonLink>
    );
  return <VerdictCard aria-label="Summary" tone={TONE[readout.tone]} title={readout.title} explanation={readout.explanation} action={action} />;
}
