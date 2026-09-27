"use client";

import { useState } from "react";
import { DemoBadge } from "@/components/Badges";
import { CopyButton } from "@/components/sourcing/CopyButton";
import { inputClass } from "@/components/upload/UploadPickers";
import type { OrderOp } from "@/lib/orders/schemas";
import type { OrderMessage, OrderMessagePurpose, OrderRecipient } from "@/lib/types";

type Props = {
  to: OrderRecipient;
  purpose: OrderMessagePurpose;
  label: string;
  isDemo: boolean;
  draft?: OrderMessage;
  sent: OrderMessage[];
  busy: string | null;
  run: (key: string, fn: () => Promise<unknown>) => Promise<unknown>;
  edit: (op: OrderOp) => Promise<void>;
  askAi: (to: OrderRecipient, purpose: OrderMessagePurpose) => Promise<string>;
};

const PURPOSE: Record<OrderMessagePurpose, string> = { purchase_order: "Purchase order", assembly_rfq: "Assembly quote request" };
const time = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** One recipient's email: AI draft, edit, copy or open in the user's email app, then mark sent. Moko sends nothing. */
export function OrderMessageCard({ to, purpose, label, isDemo, draft, sent, busy, run, edit, askAi }: Props) {
  const key = `${purpose}:${JSON.stringify(to)}`;
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [text, setText] = useState(draft?.text ?? "");
  const [seen, setSeen] = useState(draft ? draft.id + draft.at : "");
  const [rationale, setRationale] = useState<string | null>(null);

  // A new draft from the server (the AI, or another tab) replaces the fields.
  const serverKey = draft ? draft.id + draft.at : "";
  if (serverKey !== seen) {
    setSeen(serverKey);
    setSubject(draft?.subject ?? "");
    setText(draft?.text ?? "");
  }
  const changed = subject.trim() !== (draft?.subject ?? "").trim() || text.trim() !== (draft?.text ?? "").trim();
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const isBusy = busy !== null;

  return (
    <li className="flex flex-col gap-3 border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow text-muted">{PURPOSE[purpose]}</p>
          <h4 className="truncate font-semibold">{label}</h4>
        </div>
        {isDemo && <DemoBadge label="Demo shop" title="Fictional shop: it receives nothing" />}
      </div>

      {sent.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {sent.map((m) => (
            <li key={m.id}>
              Sent {time(m.at)}: <span className="text-ink">{m.subject}</span>
            </li>
          ))}
        </ul>
      )}

      <label className="sr-only" htmlFor={`subject-${key}`}>Subject</label>
      <input id={`subject-${key}`} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className={inputClass} />
      <label className="sr-only" htmlFor={`body-${key}`}>Email</label>
      <textarea
        id={`body-${key}`}
        rows={text ? 10 : 3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write the email, or let the AI draft it from the plan."
        className={inputClass}
      />
      {draft?.aiDrafted && !changed && <p className="text-xs text-muted">Drafted by AI from the plan. Check every number before you send it.</p>}
      {rationale && (
        <p className="text-xs text-muted">
          <span className="font-medium text-ink">Why this email (for you only): </span>
          {rationale}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => run(`ai:${key}`, async () => setRationale(await askAi(to, purpose)))}
          className="bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {busy === `ai:${key}` ? "Drafting…" : draft ? "Redraft with AI" : "Draft with AI"}
        </button>
        {subject.trim() && text.trim() && changed && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => run(`save:${key}`, () => edit({ op: "saveDraft", to, purpose, subject, text }))}
            className="border border-line px-3 py-2 text-sm hover:border-ink disabled:opacity-60"
          >
            Save draft
          </button>
        )}
        {text.trim() && <CopyButton text={`Subject: ${subject}\n\n${text}`} />}
        {text.trim() && (
          <a href={mailto} className="border border-line px-3 py-1.5 text-sm hover:border-ink">
            Open in email
          </a>
        )}
        {draft && !changed && (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => run(`sent:${key}`, async () => { await edit({ op: "markSent", messageId: draft.id }); setRationale(null); })}
              className="bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-60"
            >
              I sent this
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => run(`discard:${key}`, async () => { await edit({ op: "discardDraft", messageId: draft.id }); setRationale(null); })}
              className="text-sm text-muted hover:text-ink"
            >
              Discard
            </button>
          </>
        )}
      </div>
    </li>
  );
}
