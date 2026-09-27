import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/PageHeader";
import { AiKeySettings } from "@/components/settings/AiKeySettings";
import { currentOwnerHash } from "@/lib/access";
import { budgetStatus } from "@/lib/usage/budget";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const ownerHash = await currentOwnerHash();
  const budget = ownerHash ? await budgetStatus(ownerHash) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader eyebrow="Settings" title="AI provider" description="Use your own API key for analysis, pricing, plans, pitches and the agent, instead of the shared demo budget." />
      <AiKeySettings />
      {budget && (
        <section className="flex flex-col gap-2 border border-line p-5 text-sm">
          <p className="eyebrow text-[10px] text-muted">Demo AI budget · this browser</p>
          <p className="font-mono text-lg">
            ${budget.remainingUsd.toFixed(2)} <span className="text-sm text-muted">of ${budget.limitUsd.toFixed(2)} left</span>
          </p>
          <p className="text-muted">Each browser gets ${budget.limitUsd.toFixed(0)} of demo AI, and a site-wide daily cap applies on top. With your own key, AI calls don&apos;t use it.</p>
        </section>
      )}
      <p className="text-sm text-muted">
        How keys and project data are handled: <Link href="/privacy" className="underline">Privacy</Link>.
      </p>
    </div>
  );
}
