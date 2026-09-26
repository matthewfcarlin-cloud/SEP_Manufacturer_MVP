"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

function Word({ word, index, total, progress, accent }: { word: string; index: number; total: number; progress: MotionValue<number>; accent: boolean }) {
  // Each word brightens over its own slice of the scroll range.
  const start = index / total;
  const opacity = useTransform(progress, [start, start + 1 / total], [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }} className={`inline-block ${accent ? "text-night-accent" : ""}`}>
        {word}
      </motion.span>{" "}
    </>
  );
}

type Props = { text: string; accentWords?: string[] };

/** Mobius-style statement: words light up one by one as you scroll through it. */
export function ScrollStatement({ text, accentWords = [] }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const words = text.split(" ");

  return (
    <section ref={ref} className="bg-night py-32 text-night-ink sm:py-48">
      <p className="display-type mx-auto max-w-7xl px-4 text-[clamp(1.5rem,7vw,7rem)] sm:px-6">
        {reduce
          ? text
          : words.map((w, i) => (
              <Word key={`${w}-${i}`} word={w} index={i} total={words.length} progress={scrollYProgress} accent={accentWords.includes(w)} />
            ))}
      </p>
    </section>
  );
}
