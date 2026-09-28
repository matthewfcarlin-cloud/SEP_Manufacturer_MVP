"use client";

import { useState } from "react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import { FormError } from "@/components/upload/UploadPickers";
import { controlClasses } from "@/components/ui/Field";
import { SUPPLIER_STATUSES } from "@/lib/schemas";
import { draftOf } from "@/lib/sourcing/ops";
import type { SourcingOp } from "@/lib/sourcing/schemas";
import { emailText, mailtoLink } from "@/lib/sourcing/email";
import { quoteStanding, type NegotiationTargets, type QuoteStanding } from "@/lib/sourcing/targets";
import type { Supplier, SupplierStatus } from "@/lib/types";
import { CopyButton } from "./CopyButton";
import { SupplierFields, fieldsFromSupplier, parseSupplierFields } from "./SupplierFields";
import { useBusy } from "./useSourcing";
import { buttonClasses } from "@/components/ui/classes";

const STATUS_LABELS: Record<SupplierStatus, string> = {
  shortlisted: "Shortlisted",
  contacted: "Contacted",
  negotiating: "Negotiating",
  agreed: "Agreed",
  dropped: "Dropped",
};

const STANDING: Record<QuoteStanding, { text: string; className: string }> = {
  "at-target": { text: "At or under your target", className: "border-green/50 bg-green/10" },
  negotiable: { text: "Above target, under your walk-away", className: "border-border bg-bg" },
  "over-walk-away": { text: "Above your walk-away", className: "bg-red-soft" },
};

type Props = {
  supplier: Supplier;
  targets: NegotiationTargets | null;
  edit: (op: SourcingOp) => Promise<void>;
  draft: (supplierId: string) => Promise<string>;
  /** Shown as a "Best pick" badge when the comparison picks this supplier. */
  isBest?: boolean;
};

const time = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function SupplierCard({ supplier, targets, edit, draft: askForDraft, isBest = false }: Props) {
  const { busy, error, errorStatus, run } = useBusy();
  const current = draftOf(supplier);
  const sent = supplier.messages.filter((m) => m.state === "sent");
  const [draftText, setDraftText] = useState(current?.text ?? "");
  const [draftSubject, setDraftSubject] = useState(current?.subject ?? "");
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
    setDraftSubject(current?.subject ?? "");
  }

  const id = supplier.id;
  const standing = targets && supplier.quote?.unitUsd !== undefined ? STANDING[quoteStanding(supplier.quote.unitUsd, targets)] : null;
  const draftChanged = draftText.trim() !== (current?.text ?? "").trim() || draftSubject.trim() !== (current?.subject ?? "").trim();

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
    <li className="flex flex-col gap-4 card card-pad">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-lg font-semibold">
            {supplier.name}
            {isBest && <span className="ml-2 align-middle rounded-pill bg-accent-soft px-2 py-0.5 text-[13px] font-normal text-accent-ink">Best pick</span>}
          </h4>
          {supplier.email && <p className="truncate text-[13px] text-ink-2">{supplier.email}</p>}
          {supplier.listingUrl && (
            <a href={supplier.listingUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-accent-ink hover:underline">
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
            className={`${controlClasses()} w-auto`}
          >
            {SUPPLIER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button type="button" onClick={() => setIsEditing((v) => !v)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-3 rounded-card bg-bg p-4">
          <SupplierFields value={fields} onChange={setFields} idPrefix={`edit-${id}`} />
          <FormError message={fieldError} />
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" onClick={saveFields} disabled={busy !== null} className={buttonClasses({ size: "sm" })}>
              Save supplier
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove ${supplier.name} and its messages from this list?`)) void run("remove", () => edit({ op: "removeSupplier", supplierId: id }));
              }}
              className="text-sm text-ink-2 hover:text-ink"
            >
              Remove supplier
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-3 rounded-card bg-bg p-4 text-sm @lg:grid-cols-4">
          {(
            [
              ["Quoted, each", supplier.quote?.unitUsd !== undefined ? `$${supplier.quote.unitUsd.toFixed(2)}` : "—"],
              ["Smallest order", supplier.quote?.moq?.toLocaleString("en-US") ?? "—"],
              ["One-time setup", supplier.quote?.toolingUsd !== undefined ? `$${supplier.quote.toolingUsd.toLocaleString("en-US")}` : "—"],
              ["How long it takes", supplier.quote?.leadDays !== undefined ? `${supplier.quote.leadDays} days` : "—"],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] font-medium text-ink-2">{k}</dt>
              <dd className="font-mono">{v}</dd>
            </div>
          ))}
          {standing && <p className={`col-span-full rounded-control border px-3 py-1.5 text-[13px] ${standing.className}`}>{standing.text} (est.)</p>}
          {supplier.notes && <p className="col-span-full whitespace-pre-line text-ink-2">{supplier.notes}</p>}
        </dl>
      )}

      <div className="flex flex-col gap-3">
        <h5 className="text-sm font-semibold">Conversation</h5>
        {sent.length === 0 && <p className="text-sm text-ink-2">Nothing sent yet. Draft a first message, send it on Alibaba, then mark it sent here.</p>}
        <ol className="flex flex-col gap-2">
          {sent.map((m) => (
            <li key={m.id} className={`max-w-[92%] rounded-card p-3 text-[14px] ${m.from === "me" ? "self-end rounded-br-[4px] bg-ink text-bg" : "self-start rounded-bl-[4px] bg-bg"}`}>
              <p className="text-[13px] font-medium mb-1 text-ink-2">
                {m.from === "me" ? "You (sent)" : supplier.name} ·{" "}
                {/* Server and browser can be in different time zones; the browser's reading wins. */}
                <time dateTime={m.at} suppressHydrationWarning>
                  {time(m.at)}
                </time>
              </p>
              {m.subject && <p className="mb-1 font-medium">{m.subject}</p>}
              <p className="whitespace-pre-line">{m.text}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2 rounded-card bg-bg p-4">
          <label htmlFor={`subject-${id}`} className="text-sm font-medium">
            Your next email {current?.aiDrafted && !draftChanged && <span className="font-medium text-ink-2">· drafted by AI, not sent</span>}
          </label>
          <input
            id={`subject-${id}`}
            value={draftSubject}
            onChange={(e) => setDraftSubject(e.target.value)}
            placeholder="Subject"
            aria-label="Subject"
            className={controlClasses()}
          />
          <textarea
            id={`draft-${id}`}
            aria-label="Email body"
            rows={draftText ? 8 : 3}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Write an email, or let the AI draft one from your quote request, targets and the conversation."
            className={controlClasses()}
          />
          {rationale && <p className="text-[13px] text-ink-2"><span className="font-medium text-ink">Why this message (for you only): </span>{rationale}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("ai", async () => setRationale(await askForDraft(id)))}
              className={buttonClasses({ size: "sm" })}
            >
              {busy === "ai" ? "Drafting…" : current || sent.length ? "Draft next email with AI" : "Draft first email with AI"}
            </button>
            {draftText.trim() && draftChanged && (
              <button type="button" disabled={busy !== null} onClick={() => run("save", () => edit({ op: "saveDraft", supplierId: id, text: draftText, subject: draftSubject }))} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Save draft
              </button>
            )}
            {draftText.trim() && (
              <a
                href={mailtoLink(supplier.email, draftSubject, draftText)}
                className="card px-3 py-1.5 text-sm"
                title={supplier.email ? `Opens a new email to ${supplier.email} in your email app` : "Opens a new email in your email app; add the supplier's address there"}
              >
                Open in email
              </a>
            )}
            {draftText.trim() && <CopyButton text={emailText(draftSubject, draftText)} />}
            {current && !draftChanged && (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run("sent", async () => { await edit({ op: "markSent", supplierId: id, messageId: current.id }); setRationale(null); })}
                  className={buttonClasses({ size: "sm" })}
                >
                  I sent this
                </button>
                <button type="button" disabled={busy !== null} onClick={() => run("discard", async () => { await edit({ op: "discardDraft", supplierId: id }); setRationale(null); })} className="text-sm text-ink-2 hover:text-ink">
                  Discard
                </button>
              </>
            )}
          </div>
          <p className="text-[13px] text-ink-2">Moko doesn&apos;t send anything. &ldquo;Open in email&rdquo; starts the email in your own email app (or copy it into Alibaba chat). Send it there, then mark it sent.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`reply-${id}`} className="text-sm font-medium">Paste their reply</label>
          <textarea id={`reply-${id}`} rows={3} value={reply} onChange={(e) => setReply(e.target.value)} className={controlClasses()} placeholder="Paste the supplier's latest reply from your email or Alibaba." />
          <button
            type="button"
            disabled={busy !== null || !reply.trim()}
            onClick={() => run("reply", async () => { await edit({ op: "addReply", supplierId: id, text: reply }); setReply(""); })}
            className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start" })}
          >
            Add their reply
          </button>
          <p className="text-[13px] text-ink-2">Update the quoted numbers with Edit when they change, so the AI negotiates from the latest offer.</p>
        </div>
      </div>
      {error && <AiErrorBanner message={error} status={errorStatus} />}
    </li>
  );
}
