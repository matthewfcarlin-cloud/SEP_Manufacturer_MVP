"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Fragment, useRef } from "react";

// WebGL only exists in the browser.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const HEADLINE = [["Design", "around"], ["the", "machines"], ["already", "idle."]];
const EASE = [0.2, 0.7, 0.1, 1] as const;

type Props = { shops: number; machines: number; idle: number; exampleHref: string | null };

export function Hero({ shops, machines, idle, exampleHref }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const sceneOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  let wordIndex = 0;
  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-night text-night-ink">
      {/* Engineering grid, faded toward the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(var(--night-ink)_1px,transparent_1px),linear-gradient(90deg,var(--night-ink)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_60%_40%,black,transparent_70%)]"
      />

      {/* Keeps the headline legible where it overlaps the part. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(90deg,var(--night)_20%,transparent_65%)]" />

      <motion.div
        style={reduce ? undefined : { y: sceneY, opacity: sceneOpacity }}
        // Hidden on phones: the part would sit behind the copy, and it spares their GPUs.
        className="absolute inset-y-0 -z-10 hidden sm:right-[-10%] sm:block sm:w-[90%] lg:right-0 lg:w-[58%]"
      >
        <HeroScene />
      </motion.div>

      <div className="mx-auto flex min-h-[calc(100svh-57px)] max-w-7xl flex-col justify-between gap-12 px-4 pb-8 pt-16 sm:px-6 sm:pt-24">
        <div className="flex flex-col gap-8">
          <motion.p
            className="eyebrow text-night-muted"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            For independent inventors & small hardware teams
          </motion.p>

          <h1 className="display-type text-[clamp(2.9rem,8.2vw,7.6rem)]">
            {HEADLINE.map((line, li) => (
              <span key={li} className="block">
                {line.map((word) => {
                  const i = wordIndex++;
                  return (
                    // Real spaces between words (not just margins) so screen readers and copy-paste see words.
                    <Fragment key={word}>
                    <span className="inline-block overflow-hidden pb-[0.04em] align-bottom">
                      <motion.span
                        className={`inline-block ${word === "idle." ? "text-night-accent" : ""}`}
                        initial={reduce ? false : { y: "105%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.08 }}
                      >
                        {word}
                      </motion.span>
                    </span>{" "}
                    </Fragment>
                  );
                })}
              </span>
            ))}
          </h1>

          <motion.div
            className="flex max-w-xl flex-col gap-8"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
          >
            <p className="text-lg leading-relaxed text-night-muted">
              A good design doesn&apos;t close the deal. Whether it can be made cheaply does. Upload a
              part and see how it gets made, what it costs, and which nearby shops have machines
              sitting open for it.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/new"
                className="group inline-flex items-center justify-between gap-6 rounded-md bg-night-ink px-5 py-4 font-medium text-night transition-colors hover:bg-white"
              >
                Start a project
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              {exampleHref && (
                <Link
                  href={exampleHref}
                  className="inline-flex items-center justify-center rounded-md border border-night-line px-5 py-4 font-medium text-night-ink transition-colors hover:border-night-muted"
                >
                  See a real analysis
                </Link>
              )}
            </div>
            <Link href="/privacy" className="eyebrow flex items-center gap-2 text-night-muted hover:text-night-ink">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-night-idle" />
              Private by default · your CAD file is never sent to the AI
            </Link>
          </motion.div>
        </div>

        <motion.dl
          className="eyebrow grid grid-cols-2 gap-x-8 gap-y-3 border-t border-night-line pt-5 text-night-muted sm:flex sm:flex-wrap"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="flex gap-2"><dt>Shops</dt><dd className="text-night-ink">{shops}</dd></div>
          <div className="flex gap-2"><dt>Machines</dt><dd className="text-night-ink">{machines}</dd></div>
          <div className="flex gap-2"><dt>Idle this month</dt><dd className="text-night-idle">{idle}</dd></div>
          <div className="flex gap-2"><dt>Region</dt><dd className="text-night-ink">Los Angeles</dd></div>
          <div className="col-span-2 sm:ml-auto">Demo data</div>
        </motion.dl>
      </div>
    </section>
  );
}
