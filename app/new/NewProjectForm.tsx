"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { ModelViewer } from "@/components/viewer";
import type { ApiResponse } from "@/lib/api";
import { resizeImageToJpeg } from "@/lib/client/resizeImage";
import { CAD_EXTENSIONS, MAX_IMAGES, MAX_STL_BYTES } from "@/lib/projectInput";

// Object URLs are created and revoked in event handlers only. Revoking in an
// unmount effect would break under StrictMode's simulated unmount; the few
// left alive when the page is left are freed with the document.
type LocalFile = { file: File; previewUrl: string };

const toLocalFile = (file: File): LocalFile => ({ file, previewUrl: URL.createObjectURL(file) });

const MB = 1024 * 1024;

function formatBytes(bytes: number): string {
  return bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / MB).toFixed(1)} MB`;
}
const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink";

const isStep = (file: File) => /\.(step|stp)$/i.test(file.name);

function validateCad(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!CAD_EXTENSIONS.some((ext) => name.endsWith(ext))) return "Upload an STL or STEP (.step, .stp) file.";
  if (file.size > MAX_STL_BYTES) return `CAD files must be under ${MAX_STL_BYTES / MB} MB.`;
  return null;
}

function StlPicker({ stl, onPick }: { stl: LocalFile | null; onPick: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onPick(dropped);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={CAD_EXTENSIONS.join(",")}
        className="sr-only"
        aria-label="CAD file (STL or STEP)"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) onPick(picked);
          e.target.value = "";
        }}
      />
      {stl ? (
        <>
          {isStep(stl.file) ? (
            // The browser viewer reads STL only; STEP is converted on upload.
            <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-line bg-surface p-6 text-center">
              <span className="flex flex-col gap-1">
                <span className="font-medium">STEP file ready</span>
                <span className="text-sm text-muted">It&apos;s converted to a 3D mesh when you create the project; the preview appears on the next page.</span>
              </span>
            </div>
          ) : (
            <ModelViewer url={stl.previewUrl} className="aspect-[4/3] w-full" />
          )}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted">
              {stl.file.name} · {formatBytes(stl.file.size)}
            </span>
            <button type="button" className="underline" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`grid aspect-[4/3] w-full place-items-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-ink"
          }`}
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">Drop your STL or STEP file here</span>
            <span className="text-sm text-muted">or click to browse · up to {MAX_STL_BYTES / MB} MB</span>
          </span>
        </button>
      )}
    </div>
  );
}

function PhotoPicker({
  photos,
  onAdd,
  onRemove,
}: {
  photos: LocalFile[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.previewUrl} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={p.previewUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-xs text-bg"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-20 w-20 place-items-center rounded-lg border-2 border-dashed border-line text-2xl text-muted hover:border-ink hover:text-ink"
            aria-label="Add photos"
          >
            +
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Photos or sketches"
        onChange={(e) => {
          onAdd(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function NewProjectForm() {
  const router = useRouter();
  const [stl, setStl] = useState<LocalFile | null>(null);
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickStl = (file: File) => {
    const problem = validateCad(file);
    setError(problem);
    if (problem) return;
    if (stl) URL.revokeObjectURL(stl.previewUrl);
    setStl(toLocalFile(file));
  };

  const addPhotos = async (files: File[]) => {
    const room = MAX_IMAGES - photos.length;
    if (files.length > room) setError(`You can add up to ${MAX_IMAGES} photos.`);
    try {
      const resized = await Promise.all(files.slice(0, room).map(resizeImageToJpeg));
      setPhotos((prev) => [...prev, ...resized.map(toLocalFile)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that image.");
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].previewUrl);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stl) {
      setError("Add an STL or STEP file of your part.");
      return;
    }
    const body = new FormData(e.currentTarget);
    body.set("stl", stl.file);
    photos.forEach((p) => body.append("images", p.file));

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

        {error && (
          <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}

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
