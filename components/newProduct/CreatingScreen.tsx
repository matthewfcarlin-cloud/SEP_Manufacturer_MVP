"use client";

import { Box } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/Logo";
import { ModelViewer } from "@/components/viewer";

/** How long each line stays up. */
const LINE_MS = 2400;
/** Slower than the card turntable: a calm, slow spin. */
const ROTATE_SPEED = 0.6;

/** The friendly wait after "Create my product": the model slowly spinning and one line at a time about what's happening. */
export function CreatingScreen({ modelUrl, lines, isLong }: { modelUrl?: string; lines: readonly string[]; /** True while the analysis runs (a minute or two). */ isLong: boolean }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % lines.length), LINE_MS);
    return () => window.clearInterval(timer);
  }, [lines.length]);

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <div className="px-6 py-5">
        <Logo className="h-5 w-auto" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16 text-center">
        <div className="relative h-[280px] w-[280px] max-w-full overflow-hidden rounded-pill bg-sidebar">
          {modelUrl ? (
            <ModelViewer url={modelUrl} autoRotate={!reduceMotion} rotateSpeed={ROTATE_SPEED} enableZoom={false} showLoading={false} className="h-full w-full !rounded-none !bg-transparent" />
          ) : (
            <div aria-hidden className="grid h-full w-full place-items-center text-accent-ink">
              <Box size={72} strokeWidth={1.25} className="motion-safe:animate-[spin_12s_linear_infinite]" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p role="status" aria-live="polite" className="type-h2 min-h-[1.3em]">
            <span key={index} className="inline-block motion-safe:animate-[line-rise_320ms_cubic-bezier(.2,.8,.2,1)]">
              {lines[index]}
            </span>
          </p>
          <p className="text-ink-2">{isLong ? "This can take a minute or two. Keep this tab open." : "Just a moment."}</p>
        </div>
      </div>
    </div>
  );
}
