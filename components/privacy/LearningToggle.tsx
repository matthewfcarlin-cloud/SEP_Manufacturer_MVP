"use client";

import Link from "next/link";
import { useState } from "react";
import { FormError } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";
import type { LearningConsent } from "@/lib/types";

/**
 * Owner opt-in for "help improve estimates" (BACKEND.md B2). Off by default.
 * The switch only moves once the server has saved the choice.
 */
export function LearningToggle({ projectId, learning }: { projectId: string; learning?: LearningConsent }) {
  const [isOn, setIsOn] = useState(Boolean(learning?.contribute));
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/learning`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contribute: !isOn }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{ learning: LearningConsent }> | null;
      if (!json?.success) throw new Error(json?.error ?? "Couldn't save the setting. Please try again.");
      setIsOn(json.data.learning.contribute);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the setting. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section aria-labelledby="learning-heading" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-2xl">
          <p id="learning-heading" className="font-semibold">Help improve estimates</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Off by default. When on, this product&apos;s category, process, material family, size, quantity, cost estimate and
            real-quote summary can be shown to the AI as a &ldquo;similar product&rdquo; when other creators get estimates. Never
            your CAD file, photos, notes or name. Turn it off any time and it stops right away.{" "}
            <Link href="/privacy" className="underline hover:text-ink">How this works</Link>
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby="learning-heading"
          disabled={isBusy}
          onClick={toggle}
          className={`relative h-6 w-11 shrink-0 border transition-colors motion-reduce:transition-none disabled:opacity-60 ${
            isOn ? "border-accent bg-accent" : "border-line bg-bg"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-0.5 h-[18px] w-[18px] transition-[left] motion-reduce:transition-none ${
              isOn ? "left-[22px] bg-accent-ink" : "left-0.5 bg-muted"
            }`}
          />
        </button>
      </div>
      <p aria-live="polite" className="eyebrow text-[10px] text-muted">
        {isBusy ? "Saving…" : isOn ? "Contributing" : "Not contributing"}
      </p>
      <FormError message={error} />
    </section>
  );
}
