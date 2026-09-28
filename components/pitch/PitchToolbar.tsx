"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { controlClasses } from "@/components/ui/Field";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import type { ApiResponse } from "@/lib/api";
import { AiCallError } from "@/lib/client/aiError";
import { MAX_PITCH_FIELD_CHARS } from "@/lib/schemas";
import type { PitchContent } from "@/lib/types";
import { RenderCapture } from "./RenderCapture";
import { buttonClasses } from "@/components/ui/classes";

type Props = {
  projectId: string;
  projectName: string;
  version: number;
  pitch?: PitchContent;
  cadFileUrl?: string;
  hasRenders: boolean;
};

const FIELDS: { key: keyof Omit<PitchContent, "editedByUser">; label: string; rows: number }[] = [
  { key: "oneLiner", label: "One-liner", rows: 2 },
  { key: "problem", label: "The problem", rows: 4 },
  { key: "product", label: "The product", rows: 4 },
  { key: "audience", label: "Who buys it", rows: 3 },
  { key: "ask", label: "The ask", rows: 3 },
];

const buttonClass = buttonClasses({ variant: "secondary", size: "sm", className: "disabled:cursor-wait" });

async function send(method: "POST" | "PUT", body: object): Promise<void> {
  const res = await fetch("/api/pitch", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as ApiResponse<PitchContent>;
  if (!json.success) throw new AiCallError(json.error, res.status);
}

function EditForm({ pitch, onSave, onCancel }: { pitch: PitchContent; onSave: (p: Omit<PitchContent, "editedByUser">) => Promise<void>; onCancel: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "");
    setIsSaving(true);
    await onSave({ oneLiner: text("oneLiner"), problem: text("problem"), product: text("product"), audience: text("audience"), ask: text("ask") });
    setIsSaving(false);
  };
  return (
    <form onSubmit={submit} className="grid gap-4 card card-pad @2xl:grid-cols-2">
      {FIELDS.map((f) => (
        <label key={f.key} className={`flex flex-col gap-1.5 text-sm font-medium ${f.key === "oneLiner" ? "@2xl:col-span-2" : ""}`}>
          {f.label}
          <textarea name={f.key} rows={f.rows} required maxLength={MAX_PITCH_FIELD_CHARS} defaultValue={pitch[f.key]} className={controlClasses()} />
        </label>
      ))}
      <div className="flex gap-2 @2xl:col-span-2">
        <button type="submit" disabled={isSaving} className={buttonClasses({ size: "sm" })}>
          {isSaving ? "Saving…" : "Save pitch text"}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass}>Cancel</button>
      </div>
    </form>
  );
}

/** Owner-only controls above the pitch. Hidden in print and absent from shared pages. */
export function PitchToolbar({ projectId, projectName, version, pitch, cadFileUrl, hasRenders }: Props) {
  const router = useRouter();
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRendering, setIsRendering] = useState(!hasRenders && Boolean(cadFileUrl));
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "Something went wrong.", status: err instanceof AiCallError ? err.status : 0 });
    }
  };

  const write = async () => {
    if (pitch?.editedByUser && !window.confirm("Rewrite the pitch with AI? Your edits to the text will be replaced.")) return;
    setIsWriting(true);
    await run(() => send("POST", { projectId, version }));
    setIsWriting(false);
  };

  const downloadPdf = () => {
    // Chrome names the PDF after the document title.
    const previous = document.title;
    document.title = `${projectName} – licensing pitch`;
    window.print();
    document.title = previous;
  };

  return (
    <div id="pitch-tools" className="flex scroll-mt-20 flex-col gap-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={write} disabled={isWriting} className={buttonClass}>
          {isWriting ? "Writing the pitch…" : pitch ? "Rewrite with AI" : "Write pitch with AI"}
        </button>
        {pitch && !isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} className={buttonClass}>Edit text</button>
        )}
        {cadFileUrl && hasRenders && !isRendering && (
          <button type="button" onClick={() => setIsRendering(true)} className={buttonClass}>Re-render shots</button>
        )}
        <button type="button" onClick={downloadPdf} className={buttonClasses({ size: "sm" })}>
          Download PDF
        </button>
        {pitch?.editedByUser && <span className="text-[13px] text-ink-2">Text edited by you</span>}
      </div>
      {error && <AiErrorBanner message={error.message} status={error.status} />}
      {isEditing && pitch && (
        <EditForm
          pitch={pitch}
          onCancel={() => setIsEditing(false)}
          onSave={(fields) =>
            run(async () => {
              await send("PUT", { projectId, version, pitch: fields });
              setIsEditing(false);
            })
          }
        />
      )}
      {isRendering && cadFileUrl && (
        <RenderCapture projectId={projectId} version={version} cadFileUrl={cadFileUrl} onDone={() => setIsRendering(false)} />
      )}
    </div>
  );
}
