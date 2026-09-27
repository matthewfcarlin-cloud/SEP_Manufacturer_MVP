"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError, inputClass } from "@/components/upload/UploadPickers";
import type { ApiResponse } from "@/lib/api";

type Props = { projectId: string; projectName: string; version: number; versionCount: number };

async function remove(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  const json = (await res.json()) as ApiResponse<unknown>;
  if (!json.success) throw new Error(json.error);
}

/** Real deletes: files and data leave this server. Typed-name confirmation for the whole project. */
export function DangerZone({ projectId, projectName, version, versionCount }: Props) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
    } finally {
      // Deleting a version stays on this page, so the panel must become usable again.
      setIsBusy(false);
    }
  };

  const deleteVersion = () =>
    window.confirm(`Delete v${version}? Its file, photos, analysis and renders are removed from this server. This can't be undone.`) &&
    run(async () => {
      await remove(`/api/projects/${projectId}/versions/${version}`);
      router.push(`/project/${projectId}`);
      router.refresh();
    });

  const deleteProject = () =>
    run(async () => {
      await remove(`/api/projects/${projectId}`);
      router.push("/studio");
      router.refresh();
    });

  return (
    <details className="rounded-xl border border-accent/40 p-5 text-sm">
      <summary className="cursor-pointer font-semibold text-accent">Delete</summary>
      <div className="mt-4 flex flex-col gap-5">
        <p className="text-muted">
          Deleting removes the files and data from this server for good. It can&apos;t recall what was already sent to the AI for analysis.
        </p>
        {versionCount > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={isBusy} onClick={deleteVersion} className="rounded-lg border border-accent px-3 py-2 font-medium text-accent hover:bg-accent/10 disabled:opacity-60">
              Delete v{version}
            </button>
            <span className="text-xs text-muted">Other versions stay.</span>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 font-medium">
            Type the project name to delete everything
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={`${inputClass} w-72`} placeholder={projectName} />
          </label>
          <button
            type="button"
            disabled={isBusy || typed.trim() !== projectName}
            onClick={deleteProject}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-ink hover:opacity-90 disabled:opacity-40"
          >
            Delete project
          </button>
        </div>
        <FormError message={error} />
      </div>
    </details>
  );
}
