"use client";

import { PartyPopper } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StageStatus } from "@/lib/studio/stage";
import type { Stage } from "@/lib/types";
import { celebrationMessage, newlyDone } from "./celebrationText";
import { useToast } from "./Toast";
import { CONFETTI, prefersReducedMotion } from "./tokens";

/** A small confetti burst in accent and green. Skipped when motion is reduced. */
export async function burstConfetti(): Promise<void> {
  if (prefersReducedMotion()) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    await confetti({ ...CONFETTI, colors: [...CONFETTI.colors], origin: { y: 0.7 }, disableForReducedMotion: true });
  } catch (error) {
    // Decoration only: the toast still says the stage is done.
    console.warn("Confetti failed to load", error);
  }
}

/**
 * Celebration (§3): when a stage becomes done while the page is open, burst
 * confetti and toast "Nice, Make is done. Next: …". Returns the stages that
 * just completed so the stepper can animate their circles.
 */
export function useStageCelebration(statuses: Readonly<Record<Stage, StageStatus>>, isEnabled = true): readonly Stage[] {
  const toast = useToast();
  const previous = useRef<Readonly<Record<Stage, StageStatus>> | undefined>(undefined);
  const [justDone, setJustDone] = useState<readonly Stage[]>([]);
  const key = JSON.stringify(statuses);

  useEffect(() => {
    const done = isEnabled ? newlyDone(previous.current, statuses) : [];
    previous.current = statuses;
    if (done.length === 0) return;
    setJustDone(done);
    toast({ message: celebrationMessage(done[done.length - 1], statuses), icon: PartyPopper });
    void burstConfetti();
    // statuses is compared by value through `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isEnabled, toast]);

  return justDone;
}

