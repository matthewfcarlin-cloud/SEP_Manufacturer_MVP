import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { AiKeySettings } from "@/components/settings/AiKeySettings";
import { currentOwnerHash } from "@/lib/access";
import { budgetStatus } from "@/lib/usage/budget";
import { NewProductButton } from "@/components/shell/NewProductButton";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const ownerHash = await currentOwnerHash();
  const budget = ownerHash ? await budgetStatus(ownerHash) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 page-pad py-10">
      <PageHeader title="AI provider" description="Use your own API key for analysis, pricing, plans, pitches and the agent, instead of the shared demo budget." actions={<NewProductButton />} />
      <AiKeySettings />
      {budget && (
        <section className="card card-pad flex flex-col gap-2">
          <h2 className="type-h3">Demo AI budget · this browser</h2>
          <p>
            <span className="type-price-lg">${budget.remainingUsd.toFixed(2)}</span> <span className="text-ink-2">of ${budget.limitUsd.toFixed(2)} left</span>
          </p>
          <p className="text-ink-2">Each browser gets ${budget.limitUsd.toFixed(0)} of demo AI, and a site-wide daily cap applies on top. With your own key, AI calls don&apos;t use it.</p>
        </section>
      )}
      <p className="type-small text-ink-2">
        How keys and project data are handled: <Link href="/privacy" className="font-medium text-blue-ink hover:underline">Privacy</Link>.
      </p>
    </div>
  );
}
