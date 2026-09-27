"use client";

import { useState } from "react";
import { DemoBadge, IdleBadge } from "@/components/Badges";
import { useBusy } from "@/components/sourcing/useSourcing";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { inputClass } from "@/components/upload/UploadPickers";
import type { OrderView } from "@/lib/orders/view";
import { PROCESS_LABELS } from "@/lib/processes";
import type { OrderLine, OrderMessage, OrderMessagePurpose, OrderRecipient, OrderSource } from "@/lib/types";
import { OrderMessageCard } from "./OrderMessageCard";
import { useOrder } from "./useOrder";

type Props = { projectId: string; version: number; initial: OrderView };

type Range = { low: number; high: number };
const whole = (n: number) => n.toLocaleString("en-US");
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const range = (r: Range, f: (n: number) => string = usd0) => (Math.abs(r.high - r.low) < 0.005 ? f(r.low) : `${f(r.low)}–${f(r.high)}`);
const days = (r: Range) => (r.low === r.high ? `${r.low} days` : `${r.low}–${r.high} days`);
const unitWord = (l: OrderLine) => (l.unit === "pc" ? "pcs" : l.unit);
const recipientKey = (to: OrderRecipient) => JSON.stringify(to);

const CATALOG_VALUE = "__catalog";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-t border-line pt-3">
      <p className="eyebrow text-muted">{label}</p>
      <p className="display-type text-[clamp(1.5rem,3vw,2.2rem)] tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

/**
 * The order plan for one version: a source per BOM line, the assembler,
 * landed cost and dates, the user's sign-off, and the emails that follow.
 * Nothing is ordered, paid for or sent from here.
 */
export function OrderPanel({ projectId, version, initial }: Props) {
  const { view, edit, draft } = useOrder(projectId, version, initial);
  const { busy, error, errorStatus, run } = useBusy();
  const { plan, options, assemblers, order } = view;
  const { gaps } = view;
  const gapNote = [
    gaps.unpricedLines > 0 && `${gaps.unpricedLines} of ${gaps.totalLines} parts not priced yet`,
    gaps.missingAssembly && "assembly not chosen",
  ].filter(Boolean).join(" · ");
  const [runQty, setRunQty] = useState(String(order.runQuantity));
  const [catalogFor, setCatalogFor] = useState<string | null>(null);
  const isBusy = busy !== null;

  const saveRun = () => {
    const n = Number(runQty);
    if (!Number.isInteger(n) || n <= 0) return setRunQty(String(order.runQuantity));
    if (n !== order.runQuantity) void run("run", () => edit({ op: "setRun", runQuantity: n }));
  };

  const messagesFor = (to: OrderRecipient, purpose: OrderMessagePurpose) => {
    const mine = order.messages.filter((m) => m.purpose === purpose && recipientKey(m.to) === recipientKey(to));
    return { draft: mine.find((m) => m.state === "draft"), sent: mine.filter((m) => m.state === "sent") };
  };
  const messageCard = (to: OrderRecipient, purpose: OrderMessagePurpose, label: string, isDemo: boolean, email?: string) => {
    const { draft: d, sent } = messagesFor(to, purpose);
    return (
      <OrderMessageCard
        key={`${purpose}:${recipientKey(to)}`}
        to={to}
        purpose={purpose}
        label={label}
        isDemo={isDemo}
        email={email}
        draft={d as OrderMessage | undefined}
        sent={sent}
        busy={busy}
        run={run}
        edit={edit}
        askAi={draft}
      />
    );
  };

  return (
    <section aria-labelledby="order-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id="order-heading" className="display-type text-[clamp(1.8rem,3.5vw,2.6rem)]">
          Order plan
        </h2>
        <p className="max-w-3xl text-sm text-muted">
          Who supplies each part, how many to buy, where it all ships, who puts it together, and what the run costs landed. You approve the plan here;
          Moko never places an order, pays or sends anything.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={gaps.isComplete ? "Landed cost · est." : "Landed cost so far · est."}
          value={range(plan.totals.landedUsd)}
          note={gaps.isComplete ? `Parts, tooling, freight${plan.needsAssembly ? " and assembly" : ""}` : gapNote}
        />
        <Stat label={gaps.isComplete ? "Per unit · est." : "Per unit so far · est."} value={range(plan.totals.perUnitUsd, usd)} note={`${whole(plan.runQuantity)} units`} />
        <Stat label="Ready in · est." value={plan.timeline.readyInDays.high ? days(plan.timeline.readyInDays) : "—"} note="From placing the orders" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="run-qty" className="text-sm font-medium">Units in this run</label>
          <input
            id="run-qty"
            inputMode="numeric"
            value={runQty}
            onChange={(e) => setRunQty(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={saveRun}
            onKeyDown={(e) => e.key === "Enter" && saveRun()}
            className={`${inputClass} w-36 font-mono`}
          />
        </div>
        <p className="pb-2 text-xs text-muted">{plan.needsAssembly ? "Parts that go into the assembly get 3% spares for breakage. " : ""}Minimum orders can push quantities up.</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="eyebrow text-accent">Parts</h3>
        <ul className="flex flex-col gap-3">
          {plan.lines.map((p) => {
            const lineOptions = options[p.line.id] ?? [];
            const selected = p.source ? lineOptions.findIndex((o) => JSON.stringify(o.source) === JSON.stringify(p.source)) : -1;
            const canSource = lineOptions.length > 0 || p.line.kind !== "custom_part";
            return (
              <li key={p.line.id} className="grid min-w-0 gap-4 border border-line bg-surface p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.line.name}
                    {plan.timeline.criticalLineId === p.line.id && plan.lines.length > 1 && (
                      <span className="eyebrow ml-2 border border-line px-1.5 py-0.5 text-[10px] text-muted">Slowest</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {p.line.quantityPerUnit} {p.line.unit === "pc" ? "per unit" : `${p.line.unit} per unit`}
                    {p.line.process && ` · ${PROCESS_LABELS[p.line.process]}`}
                    {p.line.spec && ` · ${p.line.spec}`}
                  </p>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <label className="sr-only" htmlFor={`src-${p.line.id}`}>Source for {p.line.name}</label>
                  {canSource ? (
                    <select
                      id={`src-${p.line.id}`}
                      disabled={isBusy}
                      value={catalogFor === p.line.id ? CATALOG_VALUE : selected >= 0 ? String(selected) : ""}
                      onChange={(e) => {
                        if (e.target.value === CATALOG_VALUE) return setCatalogFor(p.line.id);
                        setCatalogFor(null);
                        const option = lineOptions[Number(e.target.value)];
                        if (option) void run(`src:${p.line.id}`, () => edit({ op: "assign", lineId: p.line.id, source: option.source }));
                      }}
                      className={`${inputClass} min-w-0`}
                    >
                      {selected < 0 && <option value="">Pick a source…</option>}
                      {lineOptions.map((o, i) => (
                        <option key={i} value={i}>{o.label}</option>
                      ))}
                      <option value={CATALOG_VALUE}>Another vendor (type in a price)…</option>
                    </select>
                  ) : (
                    <p className="text-sm text-muted">Request local quotes or agree terms with an Alibaba supplier below to source this part.</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {p.suggested && <span className="eyebrow border border-accent px-1.5 py-0.5 text-[10px] text-accent">Suggested</span>}
                    {p.terms?.isDemo && <DemoBadge label="Demo quote" title="Simulated by Moko from a fictional demo shop" />}
                  </div>
                  {catalogFor === p.line.id && <CatalogForm onCancel={() => setCatalogFor(null)} onSave={(source) => run(`src:${p.line.id}`, async () => { await edit({ op: "assign", lineId: p.line.id, source }); setCatalogFor(null); })} />}
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">Order</dt>
                  <dd className="font-mono tabular-nums">{whole(p.orderQty)} {unitWord(p.line)}</dd>
                  <dt className="text-muted">Parts</dt>
                  <dd className="font-mono tabular-nums">{p.goodsUsd === null ? "—" : usd0(p.goodsUsd)}</dd>
                  {p.toolingUsd > 0 && (
                    <>
                      <dt className="text-muted">Tooling</dt>
                      <dd className="font-mono tabular-nums">{usd0(p.toolingUsd)}</dd>
                    </>
                  )}
                  <dt className="text-muted">Freight est.</dt>
                  <dd className="font-mono tabular-nums">{p.shippingUsd ? range(p.shippingUsd) : "—"}</dd>
                  <dt className="text-muted">Arrives</dt>
                  <dd className="font-mono tabular-nums">{p.arrivesInDays ? days(p.arrivesInDays) : "—"}</dd>
                </dl>
              </li>
            );
          })}
        </ul>
      </div>

      {plan.needsAssembly && (
        <div className="flex flex-col gap-3">
          <h3 className="eyebrow text-accent">Assembly partner · demo</h3>
          <p className="text-sm text-muted">
            Contract assemblers for small runs that can do everything this product needs. They receive every part, build and pack it. Demo partners are fictional and receive nothing.
          </p>
          {assemblers.length === 0 ? (
            <p className="border border-dashed border-line p-6 text-sm text-muted">No demo assembler covers everything this product needs.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {assemblers.map((m) => {
                const chosen = plan.assembler?.id === m.assembler.id;
                return (
                  <li key={m.assembler.id} className={`flex min-w-0 flex-col gap-3 border bg-surface p-5 ${chosen ? "border-ink ring-1 ring-ink" : "border-line"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {chosen && <span className="eyebrow bg-ink px-1.5 py-0.5 text-[10px] text-bg">Chosen</span>}
                        <h4 className="mt-1 truncate font-semibold">{m.assembler.name}</h4>
                        <p className="text-xs text-muted">{m.assembler.neighborhood} · {m.assembler.leadDays} days once parts arrive</p>
                      </div>
                      <DemoBadge />
                    </div>
                    {m.assembler.idleThisMonth && <IdleBadge />}
                    <p className="text-sm">{m.assembler.description}</p>
                    <p className="text-sm">
                      <span className="font-mono tabular-nums">{range(m.costUsd)}</span> <span className="text-muted">for the run · {range(m.perUnitUsd, usd)} per unit (est.)</span>
                    </p>
                    <ul className="list-disc pl-5 text-sm text-muted">
                      {m.reasons.map((r) => <li key={r}>{r}</li>)}
                      {m.cautions.map((c) => <li key={c} className="text-ink">{c}</li>)}
                    </ul>
                    <div className="mt-auto flex flex-wrap gap-2">
                      {chosen ? (
                        <button type="button" disabled={isBusy} onClick={() => run("asm", () => edit({ op: "chooseAssembler", assemblerId: null }))} className="border border-line px-3 py-2 text-sm hover:border-ink disabled:opacity-60">
                          Unchoose
                        </button>
                      ) : (
                        <button type="button" disabled={isBusy} onClick={() => run("asm", () => edit({ op: "chooseAssembler", assemblerId: m.assembler.id }))} className="bg-ink px-3 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-60">
                          Choose this partner
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <details className="border border-line p-4">
            <summary className="cursor-pointer text-sm font-medium">Ask assemblers for a quote</summary>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {assemblers.map((m) => messageCard({ kind: "assembler", assemblerId: m.assembler.id }, "assembly_rfq", m.assembler.name, true))}
            </ul>
          </details>
        </div>
      )}

      {(plan.blockers.length > 0 || plan.warnings.length > 0) && (
        <ul className="flex flex-col gap-2 text-sm">
          {plan.blockers.map((b, i) => (
            <li key={`b${i}`} className="border border-accent/50 bg-accent/10 px-3 py-2">{b.message}</li>
          ))}
          {plan.warnings.map((w, i) => (
            <li key={`w${i}`} className="border border-line bg-bg px-3 py-2 text-muted">{w.message}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border border-ink p-5">
        {plan.signedOff ? (
          <>
            <p className="font-semibold">You approved this plan at {range(order.signOff!.landedTotalUsd)} landed (est.).</p>
            <p className="text-sm text-muted">Draft the orders below and send each one yourself. If anything changes, the approval clears and you approve again.</p>
            <div>
              <button type="button" disabled={isBusy} onClick={() => run("signoff", () => edit({ op: "withdrawSignOff" }))} className="text-sm text-muted underline hover:text-ink">
                Withdraw approval
              </button>
            </div>
          </>
        ) : (
          <>
            {plan.signOffStale && <p className="text-sm font-medium">The plan changed after you approved it. Review it and approve again.</p>}
            <p className="text-sm text-muted">
              Approving doesn&apos;t order or pay for anything. It confirms the sources above and unlocks drafting purchase orders, which you send from your own email.
            </p>
            <div>
              <button
                type="button"
                disabled={isBusy || plan.blockers.length > 0}
                onClick={() => run("signoff", () => edit({ op: "signOff" }))}
                className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "signoff" ? "Approving…" : gaps.isComplete ? `Approve plan at ${range(plan.totals.landedUsd)} (est.)` : "Approve plan"}
              </button>
            </div>
          </>
        )}
      </div>

      {plan.signedOff && (
        <div className="flex flex-col gap-3">
          <h3 className="eyebrow text-accent">Purchase orders</h3>
          {view.poRecipients.length === 0 ? (
            <p className="text-sm text-muted">Every part comes from a catalog vendor: order those on their sites.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">{view.poRecipients.map((r) => messageCard(r.to, "purchase_order", r.label, r.isDemo, r.email))}</ul>
          )}
        </div>
      )}

      {error && <AiErrorBanner message={error} status={errorStatus} />}
      <p className="text-xs text-muted">
        Estimates: freight is a share of the parts&apos; value (overseas includes duty and brokerage), and assembly time is estimated from the parts list. Quoted prices are the suppliers&apos;
        figures; demo quotes and demo partners are fictional.
      </p>
    </section>
  );
}

function CatalogForm({ onSave, onCancel }: { onSave: (s: OrderSource) => void; onCancel: () => void }) {
  const [vendor, setVendor] = useState("");
  const [price, setPrice] = useState("");
  const [lead, setLead] = useState("");
  const [moq, setMoq] = useState("");
  const [overseas, setOverseas] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const save = () => {
    const unitUsd = Number(price);
    const leadDays = Number(lead);
    const minimum = moq ? Number(moq) : undefined;
    if (!vendor.trim()) return setProblem("Name the vendor.");
    if (!(unitUsd > 0)) return setProblem("Enter the price per piece.");
    if (!Number.isInteger(leadDays) || leadDays < 0) return setProblem("Enter the lead time in whole days.");
    if (minimum !== undefined && !(Number.isInteger(minimum) && minimum > 0)) return setProblem("The minimum order is a whole number.");
    onSave({ kind: "catalog", vendor: vendor.trim(), unitUsd, leadDays, overseas, ...(minimum && { moq: minimum }) });
  };
  return (
    <div className="flex flex-col gap-2 border border-dashed border-line p-3">
      <input aria-label="Vendor" placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} className={inputClass} />
      <div className="grid grid-cols-3 gap-2">
        <input aria-label="Price per piece, USD" placeholder="$ / pc" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        <input aria-label="Lead time, days" placeholder="Days" inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value)} className={inputClass} />
        <input aria-label="Minimum order" placeholder="MOQ" inputMode="numeric" value={moq} onChange={(e) => setMoq(e.target.value)} className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={overseas} onChange={(e) => setOverseas(e.target.checked)} /> Ships from overseas
      </label>
      {problem && <p className="text-xs text-accent">{problem}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} className="bg-ink px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90">Use this vendor</button>
        <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}
