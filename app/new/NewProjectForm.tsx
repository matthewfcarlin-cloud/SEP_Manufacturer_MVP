"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormError, inputClass, PhotoPicker, StlPicker, useUploadFiles } from "@/components/upload/UploadPickers";
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
          CAD file <span className="text-muted">(STL in millimeters, or STEP)</span>
        </h2>
        <StlPicker stl={stl} onPick={pickStl} />
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
          <summary className="cursor-pointer font-medium">How your project data is used</summary>
          <p className="mt-3 leading-relaxed text-muted">
            Your files are stored with this project. When you ask for AI analysis, the project details,
            geometry, notes, and selected photos are sent to this app&apos;s configured AI provider.
            The demo shop directory does not receive your files. This MVP does not include NDA or
            manufacturer file-sharing workflows.
          </p>
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
