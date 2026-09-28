"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormError, PhotoPicker, StlPicker, UnitsSelect, useUploadFiles } from "@/components/upload/UploadPickers";
import { controlClasses } from "@/components/ui/Field";
import type { ApiResponse } from "@/lib/api";
import { MAX_CHANGE_NOTE, MAX_IMAGES } from "@/lib/projectInput";
import { buttonClasses } from "@/components/ui/classes";

export type TweakChoice = { key: string; processLabel: string; change: string; impact: string };

type BaseVersion = {
  number: number;
  notes: string;
  targetQuantity: number;
  budgetUsd?: number;
  materialHints: string[];
  photoCount: number;
};

type Props = { projectId: string; base: BaseVersion; tweaks: TweakChoice[]; preselectedTweak: string | null };

const tweakNote = (t: TweakChoice) => `Applied the ${t.processLabel.toLowerCase()} tweak: ${t.change}`;

function TweakPicker({ tweaks, selected, onSelect }: { tweaks: TweakChoice[]; selected: string | null; onSelect: (key: string | null) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">
        Reason for the change <span className="font-normal text-muted">(optional: pick one of the AI&apos;s tweaks)</span>
      </legend>
      <label className="flex items-center gap-2 card px-3 py-2 text-sm has-[:checked]:border-accent">
        <input type="radio" name="tweak" value="" checked={selected === null} onChange={() => onSelect(null)} />
        My own change
      </label>
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {tweaks.map((t) => (
          <label key={t.key} className="flex gap-3 card px-3 py-2 text-sm has-[:checked]:border-accent">
            <input type="radio" name="tweak" value={t.key} checked={selected === t.key} onChange={() => onSelect(t.key)} className="mt-1" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium text-ink-2">{t.processLabel}</span>
              <span>{t.change}</span>
              <span className="text-[13px] text-green-ink">{t.impact}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NewVersionForm({ projectId, base, tweaks, preselectedTweak }: Props) {
  const router = useRouter();
  const { stl, photos, error, setError, pickStl, addPhotos, removePhoto, appendFiles } = useUploadFiles();
  const [submitting, setSubmitting] = useState(false);
  const [tweak, setTweak] = useState<string | null>(preselectedTweak);
  const initialTweak = tweaks.find((t) => t.key === preselectedTweak);
  const [changeNote, setChangeNote] = useState(initialTweak ? tweakNote(initialTweak) : "");

  // Picking a tweak fills in the change note unless the user has written their own.
  const selectTweak = (key: string | null) => {
    const isAutoNote = changeNote === "" || tweaks.some((t) => changeNote === tweakNote(t));
    setTweak(key);
    const picked = tweaks.find((t) => t.key === key);
    if (isAutoNote) setChangeNote(picked ? tweakNote(picked) : "");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stl) {
      setError("Add the revised STL or STEP file.");
      return;
    }
    if (!changeNote.trim()) {
      setError("Say what changed in this version.");
      return;
    }
    const body = new FormData(e.currentTarget);
    appendFiles(body);

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, { method: "POST", body });
      const json = (await res.json()) as ApiResponse<{ id: string; version: number }>;
      if (!json.success) throw new Error(json.error);
      router.push(`/project/${projectId}/idea?v=${json.data.version}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_1fr]" noValidate>
      <input type="hidden" name="basedOn" value={base.number} />
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">
            Revised CAD file <span className="text-ink-2">(STL or STEP)</span>
          </h2>
          <StlPicker stl={stl} onPick={pickStl} />
          <UnitsSelect stl={stl} />
        </div>
        {tweaks.length > 0 && <TweakPicker tweaks={tweaks} selected={tweak} onSelect={selectTweak} />}
      </section>

      <section className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What changed?
          <textarea
            name="changeNote"
            rows={3}
            required
            maxLength={MAX_CHANGE_NOTE}
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            className={controlClasses()}
            placeholder="Re-drew the bracket as one bent aluminum sheet instead of a molded part…"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What is it?
          <textarea name="notes" rows={4} maxLength={4000} defaultValue={base.notes} className={controlClasses()} />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Target quantity
            <input name="targetQuantity" type="number" min={1} step={1} required defaultValue={base.targetQuantity} className={controlClasses()} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            <span>
              Budget <span className="font-normal text-muted">(USD, optional)</span>
            </span>
            <input name="budgetUsd" type="number" min={0} step={1} defaultValue={base.budgetUsd} className={controlClasses()} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span>
            Material ideas <span className="font-normal text-muted">(optional, comma-separated)</span>
          </span>
          <input name="materialHints" defaultValue={base.materialHints.join(", ")} className={controlClasses()} />
        </label>

        <div className="flex flex-col gap-1.5 text-sm font-medium">
          <span>
            New photos or sketches <span className="font-normal text-muted">(up to {MAX_IMAGES})</span>
          </span>
          <PhotoPicker photos={photos} onAdd={addPhotos} onRemove={removePhoto} />
          {base.photoCount > 0 && (
            <label className="mt-1 flex items-center gap-2 font-medium text-ink-2">
              <input type="checkbox" name="keepPhotos" defaultChecked disabled={photos.length > 0} />
              {photos.length > 0
                ? `Using your new photos instead of v${base.number}'s`
                : `Keep the ${base.photoCount} photo${base.photoCount === 1 ? "" : "s"} from v${base.number}`}
            </label>
          )}
        </div>

        <FormError message={error} />

        <button
          type="submit"
          disabled={submitting}
          className={buttonClasses()}
        >
          {submitting ? "Uploading and measuring…" : "Create version"}
        </button>
      </section>
    </form>
  );
}
