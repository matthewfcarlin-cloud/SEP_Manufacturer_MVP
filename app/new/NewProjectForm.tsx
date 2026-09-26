"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormError, inputClass, PhotoPicker, StlPicker, UnitsSelect, useUploadFiles } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import { MAX_IMAGES } from "@/lib/projectInput";

export function NewProjectForm() {
  const router = useRouter();
  const { stl, photos, error, setError, pickStl, addPhotos, removePhoto, appendFiles } = useUploadFiles();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stl) {
      setError("Add an STL or STEP file of your part.");
      return;
    }
    const body = new FormData(e.currentTarget);
    appendFiles(body);

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", { method: "POST", body });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.success) throw new Error(json.error);
      router.push(`/project/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_1fr]" noValidate>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          CAD file <span className="text-muted">(STL or STEP)</span>
        </h2>
        <StlPicker stl={stl} onPick={pickStl} />
          <UnitsSelect stl={stl} />
      </section>

      <section className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Project name
          <input name="name" required maxLength={120} className={inputClass} placeholder="Fuzz pedal enclosure" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What is it?
          <textarea
            name="notes"
            rows={4}
            maxLength={4000}
            className={inputClass}
            placeholder="What it does, who it's for, what matters most (finish, strength, cost, weight)…"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Target quantity
            <input name="targetQuantity" type="number" min={1} step={1} required defaultValue={100} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span>
              Budget <span className="font-normal text-muted">(USD, optional)</span>
            </span>
            <input name="budgetUsd" type="number" min={0} step={1} className={inputClass} placeholder="5000" />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span>
            Material ideas <span className="font-normal text-muted">(optional, comma-separated)</span>
          </span>
          <input name="materialHints" className={inputClass} placeholder="aluminum, ABS" />
        </label>

        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <span>
            Photos or sketches <span className="font-normal text-muted">(up to {MAX_IMAGES})</span>
          </span>
          <PhotoPicker photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
        </div>

        <details className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Private by default: what happens to your files</summary>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 leading-relaxed text-muted">
            <li>The project is private to this browser. Nobody else can open it unless you share a pitch link.</li>
            <li>
              When you ask for analysis, the AI (Anthropic&apos;s API) receives the name, notes, quantity, budget, material ideas,
              photos and your part&apos;s measurements, never the CAD file itself.
            </li>
            <li>On the next page you can see exactly what gets sent, hold back photos or notes, and delete everything.</li>
          </ul>
          <Link href="/privacy" className="mt-3 inline-block underline">
            How your data is handled
          </Link>
        </details>

        <FormError message={error} />

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent px-5 py-3 font-medium text-accent-ink hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Uploading and measuring your part…" : "Create project"}
        </button>
      </section>
    </form>
  );
}
