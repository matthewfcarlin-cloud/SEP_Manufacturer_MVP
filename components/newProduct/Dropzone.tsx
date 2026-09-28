"use client";

import { Box, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { cx } from "@/components/ui/classes";
import { Select } from "@/components/ui/Field";
import { isStep, type LocalFile } from "@/components/upload/UploadPickers";
import { CAD_EXTENSIONS, MAX_IMAGES } from "@/lib/projectInput";
import { STL_UNITS, UNIT_LABELS, type StlUnit } from "@/lib/units";

const isCad = (file: File) => CAD_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
const isImage = (file: File) => file.type.startsWith("image/");

type Props = {
  cad: LocalFile | null;
  photos: readonly LocalFile[];
  units: StlUnit;
  onUnits: (units: StlUnit) => void;
  onCad: (file: File) => void;
  onPhotos: (files: File[]) => void;
  onRemoveCad: () => void;
  onRemovePhoto: (index: number) => void;
  onProblem: (message: string) => void;
};

/**
 * One 240px dropzone for everything: a 3D file (STL or STEP) and photos or
 * sketches. Files are sorted by type; what was added shows underneath.
 */
export function Dropzone({ cad, photos, units, onUnits, onCad, onPhotos, onRemoveCad, onRemovePhoto, onProblem }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const take = (files: File[]) => {
    const cads = files.filter(isCad);
    const images = files.filter((f) => !isCad(f) && isImage(f));
    const unknown = files.filter((f) => !isCad(f) && !isImage(f));
    if (cads.length > 0) onCad(cads[cads.length - 1]);
    if (images.length > 0) onPhotos(images);
    if (unknown.length > 0) onProblem(`${unknown[0].name} isn't a 3D file or a photo. Use STL, STEP, JPG, PNG or WebP.`);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    take(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={[...CAD_EXTENSIONS, "image/*"].join(",")}
        className="sr-only"
        aria-label="3D file, photos or a sketch"
        onChange={(e) => {
          take(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cx(
          "group flex h-[240px] w-full flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-6 text-center transition-colors",
          isDragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface hover:border-accent",
        )}
      >
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-pill bg-accent-soft text-accent-ink">
          <Upload size={22} strokeWidth={1.75} />
        </span>
        <span className="type-h3">Drop a 3D file, photos or a sketch</span>
        <span className="type-small text-ink-2">STL or STEP, and up to {MAX_IMAGES} photos. Or click to choose.</span>
      </button>

      {cad && (
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-sidebar text-ink-2">
              <Box size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{cad.file.name}</p>
              <p className="type-small text-muted">3D file</p>
            </div>
            <button type="button" onClick={onRemoveCad} aria-label="Remove the 3D file" className="grid h-9 w-9 place-items-center rounded-control text-ink-2 hover:bg-hover hover:text-ink">
              <X aria-hidden size={18} strokeWidth={1.75} />
            </button>
          </div>
          {isStep(cad.file) ? (
            <p className="type-small text-ink-2">STEP files carry their own units, so no conversion is needed.</p>
          ) : (
            <label className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
              Units in the file
              <Select value={units} onChange={(e) => onUnits(e.target.value as StlUnit)} className="w-auto">
                {STL_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </option>
                ))}
              </Select>
              <span className="type-small w-full font-normal text-muted">Most CAD tools export millimeters. Check this if your part looks tiny or huge.</span>
            </label>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <ul aria-label="Photos and sketches" className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <li key={p.previewUrl} className="relative h-20 w-20 overflow-hidden rounded-control shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={p.previewUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => onRemovePhoto(i)} aria-label={`Remove photo ${i + 1}`} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-pill bg-ink/80 text-white">
                <X aria-hidden size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
