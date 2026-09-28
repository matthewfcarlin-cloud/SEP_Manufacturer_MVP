"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsage } from "@/lib/client/aiKey";

export type AiUsage = { kind: "key"; maskedKey?: string } | { kind: "budget"; remainingUsd: number } | null;

/** What pays for AI calls in this browser: your own key, or the demo budget and what's left. Re-checks on each navigation; null while loading. */
export function useAiUsage(): AiUsage {
  const pathname = usePathname();
  const [usage, setUsage] = useState<AiUsage>(null);
  useEffect(() => {
    let isLive = true;
    getUsage().then((r) => {
      if (!isLive || !r.ok) return;
      setUsage(r.data.keySource === "user" ? { kind: "key", maskedKey: r.data.maskedKey } : { kind: "budget", remainingUsd: r.data.demoBudgetRemainingUsd });
    });
    return () => {
      isLive = false;
    };
  }, [pathname]);
  return usage;
}
