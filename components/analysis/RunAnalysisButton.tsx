"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import type { ApiResponse } from "@/lib/api";
import { AiCallError } from "@/lib/client/aiError";
import type { Analysis } from "@/lib/types";

// Shown in turn while the request runs. They describe what the analysis is
// doing in general; they are not live progress from the server.
const STAGES = [
  "Reading your photos and notes…",
  "Checking the geometry…",
  "Comparing manufacturing processes…",
  "Estimating costs at your quantity…",
  "Looking for design tweaks…",
  "Checking which local machines are idle…",
  "Writing the commercial storyboard…",
];
const STAGE_MS = 9000;

type Props = { projectId: string; version: number; variant?: "primary" | "secondary" };

export function RunAnalysisButton({ projectId, version, variant = "primary" }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), STAGE_MS);
    return () => clearInterval(timer);
  }, [running]);

  const run = async () => {
    setRunning(true);
    setStage(0);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version }),
      });
      const json = (await res.json()) as ApiResponse<Analysis>;
      if (!json.success) throw new AiCallError(json.error, res.status);
      router.refresh();
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : "The analysis failed. Please try again.", status: err instanceof AiCallError ? err.status : 0 });
    } finally {
      setRunning(false);
    }
  };

  const base = "rounded-lg px-5 py-3 font-medium disabled:cursor-wait disabled:opacity-70";
  const look =
    variant === "primary"
      ? "bg-accent text-accent-ink hover:opacity-90"
      : "border border-line bg-surface hover:border-ink";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={running} className={`${base} ${look}`}>
          {running ? "Analyzing…" : variant === "primary" ? "Analyze manufacturing" : "Re-run analysis"}
        </button>
        {running && (
          <p className="text-sm text-muted" aria-live="polite">
            {STAGES[stage]} <span className="whitespace-nowrap">This usually takes 1–2 minutes.</span>
          </p>
        )}
      </div>
      {error && <AiErrorBanner message={error.message} status={error.status} />}
    </div>
  );
}
