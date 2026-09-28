"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AiErrorBanner } from "@/components/AiErrorBanner";
import type { ApiResponse } from "@/lib/api";
import type { EtsyListing } from "@/lib/types";
import { buttonClasses } from "@/components/ui/classes";

/** Writes (or rewrites) the Etsy listing, with a skeleton while it works. */
export function WriteListingButton({ projectId, version, hasListing }: { projectId: string; version: number; hasListing: boolean }) {
  const router = useRouter();
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);

  const write = async () => {
    if (hasListing && !window.confirm("Rewrite the listing with AI? The current copy is replaced.")) return;
    setIsWriting(true);
    setError(null);
    try {
      const res = await fetch("/api/listing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, version }) });
      const json = (await res.json()) as ApiResponse<EtsyListing>;
      if (!json.success) setError({ message: json.error, status: res.status });
      else router.refresh();
    } catch {
      setError({ message: "Couldn't reach the server. Check your connection and try again.", status: 0 });
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={write}
        disabled={isWriting}
        className={buttonClasses({ variant: hasListing ? "secondary" : "primary", className: "disabled:cursor-wait" })}
      >
        {isWriting ? "Writing your listing…" : hasListing ? "Rewrite with AI" : "Write my Etsy listing"}
      </button>
      {isWriting && !hasListing && (
        <div aria-hidden className="flex flex-col gap-2">
          <div className="skeleton h-10" />
          <div className="skeleton h-40" />
        </div>
      )}
      {error && <AiErrorBanner message={error.message} status={error.status} />}
    </div>
  );
}
