"use client";

import { useState } from "react";
import { FormError, inputClass } from "@/components/upload/UploadPickers";
import { SUPPLIER_STATUSES } from "@/lib/schemas";
import { draftOf } from "@/lib/sourcing/ops";
import type { SourcingOp } from "@/lib/sourcing/schemas";
import { quoteStanding, type NegotiationTargets, type QuoteStanding } from "@/lib/sourcing/targets";
import type { Supplier, SupplierStatus } from "@/lib/types";
import { CopyButton } from "./CopyButton";
import { SupplierFields, fieldsFromSupplier, parseSupplierFields } from "./SupplierFields";
import { useBusy } from "./useSourcing";

const STATUS_LABELS: Record<SupplierStatus, string> = {
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  negotiating: "Negotiating",
  agreed: "Agreed",
  dropped: "Dropped",
};

const STANDING: Record<QuoteStanding, { text: string; className: string }> = {
  "at-target": { text: "At or under your target", className: "border-idle/50 bg-idle/10" },
  negotiable: { text: "Above target, under your walk-away", className: "border-line bg-bg" },
  "over-walk-away": { text: "Above your walk-away", className: "border-accent/50 bg-accent/10" },
};

type Props = {
  supplier: Supplier;
  targets: NegotiationTargets | null;
  edit: (op: SourcingOp) => Promise<void>;
  draft: (supplierId: string) => Promise<string>;
};

const time = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function SupplierCard({ supplier, targets, edit, draft: askForDraft }: Props) {
  const { busy, error, run } = useBusy();
  const current = draftOf(supplier);
  const sent = supplier.messages.filter((m) => m.state === "sent");
  const [draftText, setDraftText] = useState(current?.text ?? "");
  const [draftSeen, setDraftSeen] = useState(current?.id + (current?.at ?? ""));
  const [rationale, setRationale] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState(fieldsFromSupplier(supplier));
  const [fieldError, setFieldError] = useState<string | null>(null);

  // A new draft from the server (the AI, or another tab) replaces the text box.
  const serverDraftKey = current?.id + (current?.at ?? "");
  if (serverDraftKey !== draftSeen) {
    setDraftSeen(serverDraftKey);
    setDraftText(current?.text ?? "");
  }

  const id = supplier.id;
  const standing = targets && supplier.quote?.unitUsd !== undefined ? STANDING[quoteStanding(supplier.quote.unitUsd, targets)] : null;
  const draftChanged = draftText.trim() !== (current?.text ?? "").trim();

  const saveFields = () => {
    const parsed = parseSupplierFields(fields);
    if ("error" in parsed) return setFieldError(parsed.error);
    setFieldError(null);
    void run("fields", async () => {
      await edit({ op: "updateSupplier", supplierId: id, supplier: parsed.supplier });
      setIsEditing(false);
    });
  };

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold">{supplier.name}</h4>
          {supplier.listingUrl && (
            <a href={supplier.listingUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-accent hover:underline">
              Open listing
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`status-${id}`}>Status</label>
          <select
            id={`status-${id}`}
            value={supplier.status}
            disabled={busy !== null}
            onChange={(e) => run("status", () => edit({ op: "updateSupplier", supplierId: id, status: e.target.value as SupplierStatus }))}
            className={`${inputClass} w-auto`}
          >
            {SUPPLIER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button type="button" onClick={() => setIsEditing((v) => !v)} className="rounded-lg border border-line px-3 py-2 text-sm hover:border-ink">
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3 rounded-xl bg-bg p-4">
          <SupplierFields value={fields} onChange={setFields} idPrefix={`edit-${id}`} />
          <FormError message={fieldError} />
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" onClick={saveFields} disabled={busy !== null} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-60">
              Save supplier
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove ${supplier.name} and its messages from this list?`)) void run("remove", () => edit({ op: "removeSupplier", supplierId: id }));
              }}
              className="text-sm text-muted hover:text-ink"
            >
              Remove supplier
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-bg p-4 text-sm sm:grid-cols-4">
          {(
            [
              ["Quoted per part", supplier.quote?.unitUsd !== undefined ? `$${supplier.quote.unitUsd.toFixed(2)}` : "—"],
              ["MOQ", supplier.quote?.moq?.toLocaleString("en-US") ?? "—"],
              ["Tooling", supplier.quote?.toolingUsd !== undefined ? `$${supplier.quote.toolingUsd.toLocaleString("en-US")}` : "—"],
              ["Lead time", supplier.quote?.leadDays !== undefined ? `${supplier.quote.leadDays} days` : "—"],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="eyebrow text-muted">{k}</dt>
              <dd className="font-mono">{v}</dd>
            </div>
          ))}
          {standing && <p className={`col-span-full rounded-lg border px-3 py-1.5 text-xs ${standing.className}`}>{standing.text} (est.)</p>}
          {supplier.notes && <p className="col-span-full whitespace-pre-line text-muted">{supplier.notes}</p>}
        </dl>
      )}

      <div className="flex flex-col gap-3">
        <h5 className="text-sm font-semibold">Conversation</h5>
        {sent.length === 0 && <p className="text-sm text-muted">Nothing sent yet. Draft a first message, send it on Alibaba, then mark it sent here.</p>}
        <ol className="flex flex-col gap-2">
          {sent.map((m) => (
            <li key={m.id} className={`max-w-[92%] rounded-lg border border-line p-3 text-sm ${m.from === "me" ? "self-end bg-bg" : "self-start bg-surface"}`}>
              <p className="eyebrow mb-1 text-muted">
                {m.from === "me" ? "You (sent on Alibaba)" : supplier.name} ·{" "}
                {/* Server and browser can be in different time zones; the browser's reading wins. */}
                <time dateTime={m.at} suppressHydrationWarning>
                  {time(m.at)}
                </time>
              </p>
              <p className="whitespace-pre-line">{m.text}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-4">
          <label htmlFor={`draft-${id}`} className="text-sm font-medium">
            Your next message {current?.aiDrafted && !draftChanged && <span className="font-normal text-muted">· drafted by AI, not sent</span>}
          </label>
          <textarea
            id={`draft-${id}`}
            rows={draftText ? 8 : 3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Write a message, or let the AI draft one from your RFQ, targets and the conversation."
            className={inputClass}
          />
          {rationale && <p className="text-xs text-muted"><span className="font-medium text-ink">Why this message (for you only): </span>{rationale}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("ai", async () => setRationale(await askForDraft(id)))}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {busy === "ai" ? "Drafting…" : current || sent.length ? "Draft next message with AI" : "Draft first message with AI"}
            </button>
            {draftText.trim() && draftChanged && (
              <button type="button" disabled={busy !== null} onClick={() => run("save", () => edit({ op: "saveDraft", supplierId: id, text: draftText }))} className="rounded-lg border border-line px-3 py-2 text-sm hover:border-ink">
                Save draft
              </button>
            )}
            {draftText.trim() && <CopyButton text={draftText} />}
            {current && !draftChanged && (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run("sent", async () => { await edit({ op: "markSent", supplierId: id, messageId: current.id }); setRationale(null); })}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-60"
                >
                  I sent this on Alibaba
                </button>
                <button type="button" disabled={busy !== null} onClick={() => run("discard", async () => { await edit({ op: "discardDraft", supplierId: id }); setRationale(null); })} className="text-sm text-muted hover:text-ink">
                  Discard
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-muted">Idlefit doesn&apos;t send anything. Copy the message into Alibaba&apos;s chat with this supplier, send it there, then mark it sent.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`reply-${id}`} className="text-sm font-medium">Paste their reply</label>
          <textarea id={`reply-${id}`} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} className={inputClass} placeholder="Paste the supplier's latest message from Alibaba." />
          <button
            type="button"
            disabled={busy !== null || !reply.trim()}
            onClick={() => run("reply", async () => { await edit({ op: "addReply", supplierId: id, text: reply }); setReply(""); })}
            className="self-start rounded-lg border border-line px-3 py-2 text-sm hover:border-ink disabled:opacity-50"
          >
            Add their reply
          </button>
          <p className="text-xs text-muted">Update the quoted numbers with Edit when they change, so the AI negotiates from the latest offer.</p>
        </div>
      </div>
      <FormError message={error} />
    </li>
  );
}
