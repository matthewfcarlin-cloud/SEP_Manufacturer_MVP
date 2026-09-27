"use client";

import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import Image, { type StaticImageData } from "next/image";
import { useRef, useState, type ReactNode } from "react";

// Mobius-style pinned story: the section is several screens tall, the
// content sticks, and scroll progress picks the active step.

export type StoryData = {
  fileName: string;
  fileKb: number;
  dims: string;
  wallMm?: number;
  volumeCm3: number;
  watertight: boolean;
  paths: { label: string; fit: number; cost: string }[];
  shops: { name: string; neighborhood: string; machine: string; idle: boolean }[];
  frames: { seconds: number; visual: string; voiceover: string }[];
  /** The part's saved studio renders (front ¾, side, rear ¾, top), used as storyboard stills. */
  renders: StaticImageData[];
};

/**
 * One "camera move" per storyboard frame: which studio render, how far in,
 * and where to aim. Six frames from four renders read as six shots, not repeats.
 */
const SHOTS: { render: number; zoom: number; focus: string }[] = [
  { render: 0, zoom: 1.05, focus: "50% 55%" }, // wide establishing
  { render: 3, zoom: 1.45, focus: "50% 45%" }, // overhead, top face
  { render: 1, zoom: 1.3, focus: "50% 55%" }, // side profile
  { render: 2, zoom: 1.15, focus: "50% 50%" }, // rear three-quarter
  { render: 0, zoom: 2.1, focus: "45% 40%" }, // detail: finish close-up
  { render: 0, zoom: 1, focus: "50% 50%" }, // hero end card, bookending frame 1
];

const STEPS = [
  { title: "Upload", body: "Drop in an STL or STEP file, a few photos, and what you know: quantity, budget, materials." },
  { title: "Measure", body: "Real dimensions, volume, and wall thickness, measured from the mesh itself." },
  { title: "Choose a path", body: "Two to four ways to make it, each with cost ranges, lead time, and the tweaks that make it cheaper." },
  { title: "Match", body: "Local shops and overseas suppliers that can make it, a request written for you, and their quotes side by side." },
  { title: "Launch", body: "Studio renders, a pitch page and a 30-second storyboard, then a dated plan and an Etsy-ready listing." },
];

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-lg rounded-lg border border-night-line bg-night-surface p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
      {children}
    </div>
  );
}

function Visual({ step, data }: { step: number; data: StoryData }) {
  switch (step) {
    case 0:
      return (
        <Frame>
          <p className="eyebrow text-night-muted">Uploading</p>
          <p className="mt-3 font-mono text-night-ink">{data.fileName}</p>
          <p className="eyebrow mt-1 text-night-muted">{data.fileKb} KB · STL · millimeters</p>
          <div className="mt-6 h-1 overflow-hidden rounded-full bg-night-line">
            <motion.div className="h-full bg-night-accent" initial={{ width: "8%" }} animate={{ width: "100%" }} transition={{ duration: 1.4, ease: "easeInOut" }} />
          </div>
        </Frame>
      );
    case 1:
      return (
        <Frame>
          <p className="eyebrow text-night-muted">Measured from the mesh</p>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-night-line">
            {[
              ["Bounding box", data.dims],
              ["Volume", `${data.volumeCm3.toFixed(1)} cm³`],
              ["Typical wall", data.wallMm ? `${data.wallMm} mm` : "n/a"],
              ["Mesh", data.watertight ? "Watertight" : "Has gaps"],
            ].map(([k, v]) => (
              <div key={k} className="bg-night-surface p-4">
                <dt className="eyebrow text-night-muted">{k}</dt>
                <dd className="mt-1 font-mono text-night-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Frame>
      );
    case 2:
      return (
        <Frame>
          <p className="eyebrow text-night-muted">Ways to make it · fit score</p>
          <ul className="mt-5 flex flex-col gap-4">
            {data.paths.map((p, i) => (
              <li key={p.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-night-ink">{p.label}</span>
                  <span className="font-mono text-sm text-night-muted">{p.cost}/part est.</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night-line">
                  <motion.div
                    className={`h-full ${i === 0 ? "bg-night-accent" : "bg-night-muted"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.fit}%` }}
                    transition={{ duration: 0.9, delay: i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Frame>
      );
    case 3:
      return (
        <Frame>
          <p className="eyebrow text-night-muted">Best local matches · demo data</p>
          <ul className="mt-4 flex flex-col divide-y divide-night-line">
            {data.shops.map((s, i) => (
              <motion.li
                key={s.name}
                className="flex items-center justify-between gap-3 py-3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
              >
                <div>
                  <p className="text-night-ink">{s.name}</p>
                  <p className="eyebrow text-night-muted">{s.neighborhood} · {s.machine}</p>
                </div>
                {s.idle && <span className="eyebrow shrink-0 text-night-idle">● Can start this week</span>}
              </motion.li>
            ))}
          </ul>
        </Frame>
      );
    default:
      return (
        <div className="grid w-full max-w-lg grid-cols-3 gap-2">
          {data.frames.map((f, i) => (
            <StoryboardFrame key={i} index={i} frame={f} render={data.renders[SHOTS[i % SHOTS.length].render]} />
          ))}
        </div>
      );
  }
}

function StoryboardFrame({ index, frame, render }: { index: number; frame: StoryData["frames"][number]; render?: StaticImageData }) {
  const shot = SHOTS[index % SHOTS.length];
  return (
    <motion.figure
      className="flex aspect-[4/5] flex-col overflow-hidden rounded-md border border-night-line bg-night-surface"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="relative h-[52%] shrink-0 overflow-hidden">
        {render && (
          <Image
            src={render}
            alt=""
            fill
            // Frames zoom in up to ~2x, so request enough pixels to stay sharp.
            sizes="(min-width: 1024px) 400px, 60vw"
            className="object-cover brightness-[0.82] contrast-[1.08] grayscale-[0.25]"
            style={{ transform: `scale(${shot.zoom})`, transformOrigin: shot.focus, objectPosition: shot.focus }}
          />
        )}
        {/* Fade the light studio backdrop into the dark card. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-night/10 via-transparent to-night-surface" />
        <span className="eyebrow absolute left-2 top-2 rounded-sm bg-night/80 px-1.5 py-0.5 text-night-accent">
          {String(index + 1).padStart(2, "0")} · {frame.seconds}s
        </span>
      </div>
      <figcaption className="flex flex-1 flex-col justify-between gap-1 p-2.5 pt-1">
        <span className="line-clamp-2 text-[10px] uppercase leading-snug tracking-wide text-night-muted/80">{frame.visual}</span>
        <span className="line-clamp-3 text-xs italic leading-snug text-night-ink/90">“{frame.voiceover}”</span>
      </figcaption>
    </motion.figure>
  );
}

export function ProcessStory({ data }: { data: StoryData }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const scaled = Math.min(0.9999, Math.max(0, v)) * STEPS.length;
    setActive(Math.floor(scaled));
    setProgress(scaled - Math.floor(scaled));
  });

  // Reduced motion: no pinning, just the steps in order.
  if (reduce) {
    return (
      <section ref={ref} aria-labelledby="story-heading" className="bg-night px-4 py-24 text-night-ink sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-16">
          <h2 id="story-heading" className="display-type text-5xl sm:text-7xl">How one product gets there</h2>
          {STEPS.map((s, i) => (
            <div key={s.title} className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="eyebrow text-night-accent">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="display-type mt-2 text-4xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-night-muted">{s.body}</p>
              </div>
              <Visual step={i} data={data} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} aria-labelledby="story-heading" className="relative bg-night text-night-ink" style={{ height: `${STEPS.length * 90}svh` }}>
      <div className="sticky top-[57px] flex h-[calc(100svh-57px)] flex-col overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-6">
            <h2 id="story-heading" className="eyebrow text-night-muted">How one product gets there</h2>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.35 }}
              >
                <p className="font-mono text-sm text-night-accent">{String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}</p>
                <h3 className="display-type mt-3 text-[clamp(3rem,7vw,6.5rem)]">{STEPS[active].title}</h3>
                <p className="mt-5 max-w-md text-lg text-night-muted">{STEPS[active].body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex min-h-[320px] items-center justify-center lg:justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="flex w-full justify-center lg:justify-end"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35 }}
              >
                <Visual step={active} data={data} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Step rail, Mobius-style: all steps visible, the active one filling. */}
        <ol className="mx-auto grid w-full max-w-7xl grid-cols-5 gap-3 px-4 pb-8 sm:px-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2">
              <div className="h-px overflow-hidden bg-night-line">
                <div
                  className="h-full bg-night-ink transition-[width] duration-150"
                  style={{ width: i < active ? "100%" : i === active ? `${Math.round(progress * 100)}%` : "0%" }}
                />
              </div>
              <span className={`eyebrow hidden transition-colors sm:block ${i === active ? "text-night-ink" : "text-night-muted"}`}>
                {s.title}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
