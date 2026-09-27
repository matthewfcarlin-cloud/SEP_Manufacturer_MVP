"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/api";
import { getKeyState } from "@/lib/client/aiKey";

type Pill = { kind: "key" } | { kind: "budget"; remainingUsd: number } | null;

/** "Your key" or "Demo budget: $X left", linking to Settings. Re-checks on each navigation. */
export function HeaderAiPill() {
  const pathname = usePathname();
  const [pill, setPill] = useState<Pill>(null);

  useEffect(() => {
    let isLive = true;
    (async () => {
      const keyState = await getKeyState();
      if (keyState.available && keyState.saved) {
        if (isLive) setPill({ kind: "key" });
        return;
      }
      const res = await fetch("/api/usage/budget").catch(() => null);
      const json = (await res?.json().catch(() => null)) as ApiResponse<{ remainingUsd: number }> | null;
      if (isLive && json?.success) setPill({ kind: "budget", remainingUsd: json.data.remainingUsd });
    })();
    return () => {
      isLive = false;
    };
  }, [pathname]);

  const isLow = pill?.kind === "budget" && pill.remainingUsd < 0.6;
  return (
    <Link
      href="/settings"
      aria-label={pill?.kind === "key" ? "Using your own AI key. Open settings" : pill ? `Demo AI budget: $${pill.remainingUsd.toFixed(2)} left. Open settings` : "AI settings"}
      className={`eyebrow flex min-w-[3.75rem] items-center justify-center gap-1.5 whitespace-nowrap border px-1.5 py-1.5 text-[10px] sm:min-w-[11rem] sm:px-2 ${
        isLow ? "border-night-accent text-night-accent" : "border-night-line text-night-muted hover:text-night-ink"
      }`}
    >
      {pill === null ? (
        <span aria-hidden className="h-2 w-16 animate-pulse bg-night-line motion-reduce:animate-none" />
      ) : pill.kind === "key" ? (
        <>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-night-idle" />
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
