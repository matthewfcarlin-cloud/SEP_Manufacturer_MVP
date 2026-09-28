"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUsage } from "@/lib/client/aiKey";

type Pill = { kind: "key" } | { kind: "budget"; remainingUsd: number } | null;

/** "Your key" or "Demo budget: $X left", linking to Settings. Re-checks on each navigation. */
export function HeaderAiPill() {
  const pathname = usePathname();
  const [pill, setPill] = useState<Pill>(null);

  useEffect(() => {
    let isLive = true;
    getUsage().then((r) => {
      if (!isLive || !r.ok) return;
      setPill(r.data.keySource === "user" ? { kind: "key" } : { kind: "budget", remainingUsd: r.data.demoBudgetRemainingUsd });
    });
    return () => {
      isLive = false;
    };
  }, [pathname]);

  const isLow = pill?.kind === "budget" && pill.remainingUsd < 0.6;
  return (
    <Link
      href="/settings"
      aria-label={pill?.kind === "key" ? "Using your own AI key. Open settings" : pill ? `Demo AI budget: $${pill.remainingUsd.toFixed(2)} left. Open settings` : "AI settings"}
      className={`flex h-9 min-w-[3.25rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-[13px] font-medium transition-colors sm:min-w-[11rem] ${
        isLow ? "bg-amber-soft text-amber-ink" : "bg-surface text-ink-2 shadow-card hover:text-ink"
      }`}
    >
      {pill === null ? (
        <span aria-hidden className="skeleton h-2 w-16" />
      ) : pill.kind === "key" ? (
        <>
          <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-green" />
          Your key
        </>
      ) : (
        <>
          <span className="hidden sm:inline">Demo budget:</span> ${pill.remainingUsd.toFixed(2)}
          <span className="hidden sm:inline"> left</span>
        </>
      )}
    </Link>
  );
}
