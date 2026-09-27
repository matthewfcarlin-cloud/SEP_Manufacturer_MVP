import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Privacy" };

// Every statement here is backed by the code (lib/access.ts, lib/aiInputs.ts,
// lib/shareStore.ts, lib/projectStore.ts). Change them together.
const POINTS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Your projects are private to your browser",
    body: "When you first visit, your browser gets a random key in a cookie. Projects you create are tied to it, and any other browser gets \"not found\". There are no accounts yet, so clearing cookies or switching browsers means losing access to your projects.",
  },
  {
    title: "What the AI sees, and what it doesn't",
    body: "Analysis, pricing and pitch writing send your project name, notes, quantity, budget, material ideas, photos and the measurements of your part to Anthropic's API. Your CAD file itself is never sent. Each project shows exactly what gets sent under \"What the AI sees\", where you can hold back your photos or notes.",
  },
  {
    title: "Sharing is off until you turn it on",
    body: "A pitch can be shared through an unguessable link. Anyone with the link sees the pitch (text, studio renders, cost estimates), never your CAD file, photos or notes. You can turn the link off, or revoke it and get a new one, at any time.",
  },
  {
    title: "Shops see a spec summary, not your design",
    body: "A quote request carries a spec summary: process, size, material, finish, quantities, a target price and a quote-by date. Renders and your notes are added only if you choose \"Share more\" (and notes only if the AI may see them). Every shop listed is fictional demo data, so nothing is sent to anyone and the quotes are simulated.",
  },
  {
    title: "Moko never contacts overseas suppliers",
    body: "Alibaba sourcing only plans your search and drafts messages. Drafting sends your part's spec, notes (unless you hold them back), the supplier details you enter and the conversation you paste in to Anthropic's API. Nothing goes to a supplier unless you copy it and send it yourself on Alibaba.",
  },
  {
    title: "Deleting is real, with one limit",
    body: "Deleting a project or a version removes its files and data from this server. It can't recall what was already sent to the AI for analysis, which Anthropic handles under its API terms and privacy policy.",
  },
  {
    title: "What this MVP doesn't do yet",
    body: "Data is stored as files on the server running this demo, without encryption at rest. There are no user accounts, NDAs, or audit logs. The example projects are shared demos that anyone can open and edit.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
      <PageHeader eyebrow="How your data is handled" title="Privacy" description="Private by default, in plain words, including what this early version can't do yet." />
      <ol className="flex flex-col gap-6">
        {POINTS.map((p, i) => (
          <li key={p.title} className="grid gap-2 border-b border-line pb-6 sm:grid-cols-[3rem_1fr]">
            <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-1 leading-relaxed text-muted">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted">
        Questions or a deletion request? <Link href="/studio" className="underline">Open your product</Link> and use Delete, or contact the team running this demo.
      </p>
    </div>
  );
}
