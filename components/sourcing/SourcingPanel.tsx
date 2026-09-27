"use client";

import { useMemo, useState } from "react";
import { FormError } from "@/components/upload/UploadPickers";
import { PROCESS_LABELS, processInSentence } from "@/lib/processes";
import { alibabaSearchUrl, negotiationTargets, type NegotiationTargets } from "@/lib/sourcing/targets";
import type { Process, ProjectVersion } from "@/lib/types";
import { CopyButton } from "./CopyButton";
import { SupplierCard } from "./SupplierCard";
import { EMPTY_FIELDS, SupplierFields, parseSupplierFields } from "./SupplierFields";
import { useBusy, useSourcing } from "./useSourcing";

type Props = { projectId: string; version: ProjectVersion };

const usd = (n: number) => `$${n.toFixed(2)}`;

function TargetsCard({ targets }: { targets: NegotiationTargets }) {
  const walkAwayNote = {
    estimate: "the high end of the AI's estimate",
    margin: "the most you can pay and still keep a 30% margin at your retail price",
    "no-margin": "",
  }[targets.walkAwayReason];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <p className="eyebrow text-muted">Your negotiation numbers · per part at {targets.quantity.toLocaleString("en-US")} units · est.</p>
      <dl className="grid grid-cols-3 gap-4">
        <div>
          <dt className="text-xs text-muted">Open at</dt>
          <dd className="font-mono text-2xl tabular-nums">{usd(targets.openingAsk)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Aim for</dt>
          <dd className="font-mono text-2xl tabular-nums">{usd(targets.target)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Walk away above</dt>
          <dd className="font-mono text-2xl tabular-nums">{targets.walkAway === null ? "—" : usd(targets.walkAway)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">
        From the AI analysis for {processInSentence(targets.process)} (tooling excluded; the AI estimated tooling at $
        {targets.tooling.low.toLocaleString("en-US")}–${targets.tooling.high.toLocaleString("en-US")}). Overseas quotes often come in lower.{" "}
        {targets.walkAway === null
          ? "At your current retail price no per-part price leaves a healthy margin, so the AI will push on terms and ask what brings the price down."
          : `Walk-away is ${walkAwayNote}. It stays private: the AI is told never to reveal it${targets.walkAway > targets.target ? ", and drafts that state it are rejected" : ""}.`}
      </p>
    </div>
  );
}

export function SourcingPanel({ projectId, version }: Props) {
  const { sourcing, edit, plan: requestPlan, draft } = useSourcing(projectId, version.number, version.sourcing);
  const { busy, error, run } = useBusy();
  const paths = version.analysis?.paths ?? [];
  const [process, setProcess] = useState<Process>(sourcing.plan?.process ?? paths[0]?.process);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [addError, setAddError] = useState<string | null>(null);
  const plan = sourcing.plan;
  const targets = useMemo(() => negotiationTargets(version, plan?.process ?? process), [version, plan?.process, process]);

  const addSupplier = () => {
    const parsed = parseSupplierFields(fields);
    if ("error" in parsed) return setAddError(parsed.error);
    setAddError(null);
    void run("add", async () => {
      await edit({ op: "addSupplier", supplier: parsed.supplier });
      setFields(EMPTY_FIELDS);
    });
  };

  return (
    <section aria-labelledby="sourcing-heading" className="flex flex-col gap-6 border-t border-line pt-8">
      <div>
        <p className="eyebrow text-muted">Alibaba sourcing · beta</p>
        <h2 id="sourcing-heading" className="display-type text-[clamp(2rem,4vw,3.25rem)]">Overseas suppliers</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Find factories on Alibaba for larger runs. The AI plans your search, writes the quote request, and drafts every message and
          counter-offer from your cost targets. You send each message yourself.
        </p>
      </div>

      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
        <span className="font-semibold text-ink">Idlefit never contacts suppliers.</span> Alibaba has no public API for buyers to message
        suppliers and its terms don&apos;t allow automated access, so you search and chat on alibaba.com and paste replies back here.
        Drafts carry only spec-level facts (size, material, process, quantity), never your product name, notes, budget or price.
      </p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="sourcing-process">
            Process to source
            <select id="sourcing-process" value={process} onChange={(e) => setProcess(e.target.value as Process)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              {paths.map((p) => <option key={p.process} value={p.process}>{PROCESS_LABELS[p.process]}</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("plan", () => requestPlan(process))}
            className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {busy === "plan" ? "Planning the search…" : plan ? "Re-plan the search" : "Plan my Alibaba search"}
          </button>
        </div>
        <FormError message={error} />
        {targets && <TargetsCard targets={targets} />}
      </div>

      {plan && (
        <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
            <div>
              <h3 className="font-semibold">1. Search Alibaba</h3>
              <p className="text-xs text-muted">Opens alibaba.com in a new tab. Filter for Verified suppliers and Trade Assurance.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {plan.searchTerms.map((term) => (
                  <li key={term}>
                    <a href={alibabaSearchUrl(term)} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-line px-3 py-1 text-sm hover:border-ink">
                      {term} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">2. Check before you shortlist</h3>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
                {plan.supplierChecks.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">3. Send the quote request</h3>
                <p className="text-xs text-muted">Paste into a supplier&apos;s chat or Alibaba&apos;s RFQ form.</p>
              </div>
              <CopyButton text={plan.rfq} label="Copy RFQ" />
            </div>
            <p className="whitespace-pre-line rounded-lg bg-bg p-4 text-sm">{plan.rfq}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold">Your shortlist</h3>
        {sourcing.suppliers.length > 0 && (
          <ol className="grid gap-4 xl:grid-cols-2">
            {sourcing.suppliers.map((s) => <SupplierCard key={s.id} supplier={s} targets={targets} edit={edit} draft={draft} />)}
          </ol>
        )}
        <details className="rounded-xl border border-dashed border-line p-5" open={sourcing.suppliers.length === 0}>
          <summary className="cursor-pointer font-medium">Add a supplier you found</summary>
          <div className="mt-4 flex flex-col gap-3">
            <SupplierFields value={fields} onChange={setFields} idPrefix="new-supplier" />
            <FormError message={addError} />
            <button type="button" onClick={addSupplier} disabled={busy !== null} className="self-start rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-60">
              Add to shortlist
            </button>
          </div>
        </details>
      </div>
      <p className="text-xs text-muted">
        All prices are estimates from the AI analysis. Supplier names, links and quotes are what you enter; Idlefit doesn&apos;t check them.
      </p>
    </section>
  );
}
