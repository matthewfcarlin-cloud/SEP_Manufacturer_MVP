"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DetailsAccordion } from "@/components/ui/DetailsAccordion";
import type { LocalFile } from "@/components/upload/UploadPickers";
import { quantityLabel, type Answers, type Step } from "@/lib/newProduct/flow";
import { UNIT_LABELS, type StlUnit } from "@/lib/units";
import { ACTION_ESTIMATE_USD } from "@/lib/usage/estimates";

export type AiChoice = { analyzeNow: boolean; sendPhotos: boolean; sendNotes: boolean };

type Props = {
  answers: Answers;
  cad: LocalFile | null;
  units: StlUnit;
  photoCount: number;
  ai: AiChoice;
  onAi: (next: AiChoice) => void;
  onEdit: (step: Step) => void;
};

function Row({ label, step, onEdit, children }: { label: string; step: Step; onEdit: (step: Step) => void; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <dt className="type-small text-muted">{label}</dt>
        <dd className="mt-0.5 text-[15px] text-ink [overflow-wrap:anywhere]">{children}</dd>
      </div>
      <button type="button" onClick={() => onEdit(step)} className="shrink-0 text-[14px] font-semibold text-accent-ink hover:underline">
        Edit<span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>
  );
}

const muted = (text: string) => <span className="text-muted">{text}</span>;

/** The review: every answer with an Edit link, and the privacy choices before anything reaches the AI. */
export function ReviewStep({ answers, cad, units, photoCount, ai, onAi, onEdit }: Props) {
  const files = [cad ? `${cad.file.name}${/\.stl$/i.test(cad.file.name) ? ` (${UNIT_LABELS[units].toLowerCase()})` : ""}` : null, photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : null].filter(Boolean);
  return (
    <div className="flex flex-col gap-5">
      <dl className="card px-5 py-1">
        <Row label="Name" step="what" onEdit={onEdit}>
          {answers.name}
        </Row>
        <Row label="Description" step="what" onEdit={onEdit}>
          {answers.notes.trim() ? <span className="line-clamp-3 whitespace-pre-line">{answers.notes}</span> : muted("None")}
        </Row>
        <Row label="Material ideas" step="what" onEdit={onEdit}>
          {answers.materialHints.trim() || muted("None")}
        </Row>
        <Row label="Files" step="look" onEdit={onEdit}>
          {files.length ? files.join(" · ") : muted("None yet, the description is enough")}
        </Row>
        <Row label="How many" step="howMany" onEdit={onEdit}>
          {quantityLabel(answers.quantity)}
        </Row>
        <Row label="Budget" step="budget" onEdit={onEdit}>
          {answers.budget.trim() ? <span className="font-mono">${Number(answers.budget).toLocaleString("en-US")}</span> : muted("Skipped")}
        </Row>
      </dl>

      <section aria-labelledby="ai-choice-heading" className="card card-pad flex flex-col gap-3">
        <h2 id="ai-choice-heading" className="type-h3">
          Before the AI sees it
        </h2>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={ai.analyzeNow} onChange={(e) => onAi({ ...ai, analyzeNow: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
          <span className="flex flex-col">
            <span className="text-[15px] font-medium">See how to make it right away</span>
            <span className="type-small text-ink-2">
              About 2 minutes. Uses up to about ${ACTION_ESTIMATE_USD.analysis.toFixed(2)} of your demo AI budget, or your own key. Leave this off to decide on the product page.
            </span>
          </span>
        </label>
        {ai.analyzeNow && (
          <fieldset className="ml-7 flex flex-col gap-2">
            <legend className="type-small mb-1 text-muted">What the AI may see</legend>
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={ai.sendNotes} onChange={(e) => onAi({ ...ai, sendNotes: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Send my description and notes
            </label>
            {photoCount > 0 && (
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" checked={ai.sendPhotos} onChange={(e) => onAi({ ...ai, sendPhotos: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
                Send my photos ({photoCount})
              </label>
            )}
          </fieldset>
        )}
        <DetailsAccordion label="Private by default: what happens to your files" className="text-[14px]">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-ink-2">
            <li>The product is private to this browser. Nobody else can open it unless you share a pitch link.</li>
            <li>
              When it&apos;s analyzed, the AI (Anthropic&apos;s API) receives the name, quantity, budget, material ideas and your part&apos;s
              measurements, plus your description and photos unless you hold them back. Never the 3D file itself.
            </li>
            <li>On the product page you can see exactly what gets sent, change these choices, and delete everything.</li>
          </ul>
          <Link href="/privacy" className="mt-3 inline-block font-medium text-blue-ink hover:underline">
            How your data is handled
          </Link>
        </DetailsAccordion>
      </section>
    </div>
  );
}
