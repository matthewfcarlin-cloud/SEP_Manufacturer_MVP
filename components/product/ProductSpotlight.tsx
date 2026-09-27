"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useState } from "react";
import { ModelViewer } from "@/components/viewer";

export type Callout = { label: string; value: string; note?: string; href: string; cta: string };

type Props = { url?: string; name: string; left: readonly Callout[]; right: readonly Callout[] };

function CalloutCard({ c, align, delay }: { c: Callout; align: "left" | "right"; delay: number }) {
  return (
    <a
      href={c.href}
      className={`group/callout relative flex flex-col gap-1 border border-night-line bg-night-surface/90 p-3 backdrop-blur-sm transition-colors hover:border-night-accent motion-reduce:transition-none ${
        align === "right" ? "@5xl:text-left" : "@5xl:text-right"
      }`}
    >
      {/* The arrow toward the model: wide screens only, drawn across the column gap. */}
      <span
        aria-hidden
        style={{ animationDelay: `${delay}s` }}
        className={`spotlight-connector pointer-events-none absolute top-1/2 hidden h-px w-14 bg-night-accent @5xl:block ${
          align === "left" ? "left-full origin-left" : "right-full origin-right"
        }`}
      >
        <span className={`absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-night-accent ${align === "left" ? "right-0" : "left-0"}`} />
      </span>
      <span className="eyebrow text-[10px] text-night-muted">{c.label}</span>
      <span className="font-mono text-sm font-semibold text-night-ink">{c.value}</span>
      {c.note && <span className="text-xs text-night-muted">{c.note}</span>}
      <span className="eyebrow mt-1 flex items-center gap-1.5 text-[10px] text-night-accent @5xl:justify-[inherit]">
        {c.cta}
        <span aria-hidden className="transition-transform group-hover/callout:translate-x-1 motion-reduce:transition-none">→</span>
      </span>
    </a>
  );
}

/**
 * The product on a dark stage: its 3D model pops in and turns, with callout
 * arrows to the facts an everyday person asks first (size, material, how it's
 * made, cost, who makes it). Each callout jumps to its details below.
 */
export function ProductSpotlight({ url, name, left, right }: Props) {
  const reduceMotion = useReducedMotion();
  const [isReady, setIsReady] = useState(false);
  const markReady = useCallback(() => setIsReady(true), []);

  return (
    <section aria-label={`${name} at a glance`} className="@container relative isolate overflow-hidden border border-night-line bg-night text-night-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(var(--night-ink)_1px,transparent_1px),linear-gradient(90deg,var(--night-ink)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <p className="eyebrow absolute left-4 top-4 text-[10px] text-night-muted">At a glance · tap a fact for the details</p>

      <div className="relative grid gap-4 p-4 pt-12 @5xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] @5xl:gap-x-14 @5xl:p-8 @5xl:pt-12">

        <div className="order-2 grid grid-cols-2 gap-3 @5xl:order-1 @5xl:flex @5xl:flex-col @5xl:justify-around @5xl:gap-6">
          {left.map((c, i) => (
            <CalloutCard key={c.label} c={c} align="left" delay={0.5 + i * 0.15} />
          ))}
        </div>

        <div className="order-1 flex items-center justify-center @5xl:order-2">
          <div className={`spotlight-pop relative aspect-[4/3] w-full max-w-lg @5xl:aspect-square ${reduceMotion ? "" : "spotlight-animate"}`}>
            {/* A soft spotlight so the model pops off the dark stage. */}
            <div aria-hidden className="absolute inset-[8%] rounded-full bg-[radial-gradient(closest-side,rgba(239,238,236,0.22),transparent)]" />
            {!isReady && <div aria-hidden className="absolute inset-[25%] animate-pulse bg-night-line/60 motion-reduce:animate-none" />}
            {url && (
              <div className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${isReady ? "opacity-100" : "opacity-0"}`}>
                <ModelViewer
                  url={url}
                  autoRotate={!reduceMotion}
                  rotateSpeed={0.8}
                  enableZoom={false}
                  showLoading={false}
                  onReady={markReady}
                  className="h-full w-full !rounded-none !border-0 !bg-transparent !bg-none"
                />
              </div>
            )}
            <span className="sr-only">3D model of {name}. Drag to turn it.</span>
          </div>
        </div>

        <div className="order-3 grid grid-cols-2 gap-3 @xl:grid-cols-3 @5xl:flex @5xl:flex-col @5xl:justify-around @5xl:gap-6">
          {right.map((c, i) => (
            <CalloutCard key={c.label} c={c} align="right" delay={0.6 + i * 0.15} />
          ))}
        </div>
      </div>
    </section>
  );
}
