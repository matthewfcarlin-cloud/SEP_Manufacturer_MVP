"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import type { AiInputs } from "@/lib/types";
import { DetailsAccordion } from "@/components/ui/DetailsAccordion";

type Props = {
  projectId: string;
  version: number;
  inputs: AiInputs;
  /** The exact text the analysis sends, built on the server with the current settings. */
  briefText: string;
  photoUrls: string[];
  isOpen: boolean;
};

/** Shows exactly what the AI receives for this version, with switches to withhold photos or notes. */
export function AiInputsPanel({ projectId, version, inputs: saved, briefText, photoUrls, isOpen }: Props) {
  const router = useRouter();
  // Shown at once; reverted if the save fails. The brief text follows on refresh.
  const [inputs, setInputs] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const save = async (next: AiInputs) => {
    const previous = inputs;
    setInputs(next);
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/${version}/ai-inputs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = (await res.json()) as ApiResponse<AiInputs>;
      if (!json.success) throw new Error(json.error);
      router.refresh();
    } catch (err) {
      setInputs(previous);
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DetailsAccordion label="What the AI sees for this version" defaultOpen={isOpen} className="card card-pad text-[14px]">
      <div className="flex flex-col gap-4">
        <p className="text-ink-2">
          This is everything sent to the AI (Anthropic&apos;s API) when you analyze, price or pitch this version. Your CAD file
          itself is never sent, only the measurements below. <Link href="/privacy" className="font-medium text-blue-ink hover:underline">How your data is handled</Link>
        </p>
        <fieldset className="flex flex-wrap gap-4" disabled={isSaving}>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inputs.includePhotos} onChange={(e) => save({ ...inputs, includePhotos: e.target.checked })} />
            Send photos{photoUrls.length ? ` (${photoUrls.length})` : " (none uploaded)"}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inputs.includeNotes} onChange={(e) => save({ ...inputs, includeNotes: e.target.checked })} />
            Send my notes
          </label>
        </fieldset>
        {photoUrls.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own API route
              <img
                key={url}
                src={url}
                alt={`Photo ${i + 1}${inputs.includePhotos ? "" : " (not sent)"}`}
                className={`h-16 w-16 rounded-control object-cover ${inputs.includePhotos ? "" : "opacity-30 grayscale"}`}
              />
            ))}
          </div>
        )}
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-control bg-bg p-4 font-sans text-[13px] leading-relaxed">{briefText}</pre>
        <FormError message={error} />
      </div>
    </DetailsAccordion>
  );
}
