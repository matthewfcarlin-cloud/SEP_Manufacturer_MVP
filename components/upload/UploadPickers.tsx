"use client";

import { useRef, useState, type DragEvent } from "react";
import { ModelViewer } from "@/components/viewer";
import { resizeImageToJpeg } from "@/lib/client/resizeImage";
import { CAD_EXTENSIONS, MAX_IMAGES, MAX_STL_BYTES } from "@/lib/projectInput";
import { STL_UNITS, UNIT_LABELS } from "@/lib/units";

// Object URLs are created and revoked in event handlers only. Revoking in an
// unmount effect would break under StrictMode's simulated unmount; the few
// left alive when the page is left are freed with the document.
export type LocalFile = { file: File; previewUrl: string };

const toLocalFile = (file: File): LocalFile => ({ file, previewUrl: URL.createObjectURL(file) });

const MB = 1024 * 1024;

function formatBytes(bytes: number): string {
  return bytes < MB ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / MB).toFixed(1)} MB`;
}
export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink";

export const isStep = (file: File) => /\.(step|stp)$/i.test(file.name);

function validateCad(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!CAD_EXTENSIONS.some((ext) => name.endsWith(ext))) return "Upload an STL or STEP (.step, .stp) file.";
  if (file.size > MAX_STL_BYTES) return `CAD files must be under ${MAX_STL_BYTES / MB} MB.`;
  return null;
}

export function StlPicker({ stl, onPick }: { stl: LocalFile | null; onPick: (f: File) => void }) {
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

export function PhotoPicker({
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

/** CAD file + photo state shared by the new-project and new-version forms. */
export function useUploadFiles() {
  const [stl, setStl] = useState<LocalFile | null>(null);
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  /** Adds the CAD file and photos to a form body. */
  const appendFiles = (body: FormData) => {
    if (stl) body.set("stl", stl.file);
    photos.forEach((p) => body.append("images", p.file));
  };

  return { stl, photos, error, setError, pickStl, addPhotos, removePhoto, appendFiles };
}

/** The form-level error banner. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
      {message}
    </p>
  );
}

/**
 * STL files carry no units, so ask which one the file was exported in; the
 * server scales it to millimeters. STEP files record their own.
 */
export function UnitsSelect({ stl }: { stl: LocalFile | null }) {
  if (stl && isStep(stl.file)) {
    return <p className="text-xs text-muted">STEP files carry their own units, so no conversion is needed.</p>;
  }
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
      Units in the file
      <select name="units" defaultValue="mm" className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm">
        {STL_UNITS.map((u) => (
          <option key={u} value={u}>
            {UNIT_LABELS[u]}
          </option>
        ))}
      </select>
      <span className="text-xs font-normal text-muted">Most CAD tools export millimeters. Check this if your part looks tiny or huge.</span>
    </label>
  );
}
