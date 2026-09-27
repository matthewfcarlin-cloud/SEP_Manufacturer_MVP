"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import type { ApiResponse } from "@/lib/api";
import type { LaunchPlan } from "@/lib/types";

/** Asks the AI to draft (or redraft) the launch plan, with a skeleton while it works. */
export function DraftPlanButton({ projectId, version, hasPlan }: { projectId: string; version: number; hasPlan: boolean }) {
  const router = useRouter();
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  const draft = async () => {
    if (hasPlan && !window.confirm("Redraft the plan with AI? The current milestones are replaced.")) return;
    setIsDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, version }) });
      const json = (await res.json()) as ApiResponse<LaunchPlan>;
      if (!json.success) {
        setError({ message: json.error, status: res.status });
        return;
      }
      router.refresh();
    } catch {
      setError({ message: "Couldn't reach the server. Check your connection and try again.", status: 0 });
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={draft}
        disabled={isDrafting}
        className={`self-start px-5 py-3 font-medium disabled:cursor-wait disabled:opacity-60 ${hasPlan ? "border border-line bg-surface hover:border-ink" : "bg-accent text-accent-ink hover:opacity-90"}`}
      >
        {isDrafting ? "Drafting your plan…" : hasPlan ? "Redraft with AI" : "Draft my launch plan"}
      </button>
      {isDrafting && !hasPlan && (
        <div aria-hidden className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-6 animate-pulse bg-line/50 motion-reduce:animate-none" style={{ width: `${40 + ((i * 13) % 55)}%` }} />
          ))}
        </div>
      )}
      {error && <AiErrorBanner message={error.message} status={error.status} />}
    </div>
  );
}
