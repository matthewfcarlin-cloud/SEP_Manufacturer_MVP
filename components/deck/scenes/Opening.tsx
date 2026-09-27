"use client";

import { AnimatePresence, motion } from "motion/react";
import { ease, fade } from "../motion";
import { CountUp, Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

export function Title({ beat }: { beat: Beat }) {
  const on = beat === "title";
  return (
    <>
      <Show on={on} delay={0.5} className="inset-x-0 top-[660px] text-center">
        <Display size={80} className="text-[#efeeec]">
          From idea to your first sale.
        </Display>
      </Show>
      <Show on={on} delay={0.9} className="inset-x-0 top-[790px] text-center">
        <p className="text-[36px] text-[#8f8b83]">The all-in-one studio for first-time product creators.</p>
      </Show>
    </>
  );
}

const problemLabel: Partial<Record<Beat, string>> = {
  pitched: "ideas pitched a year.",
  landed: "landed.",
};

export function Problem({ beat }: { beat: Beat }) {
  const counting = beat === "pitched" || beat === "landed";
  const label = problemLabel[beat];
  return (
    <>
      <Show on={beat === "pitched" || beat === "landed" || beat === "died"} className="left-[120px] top-[96px]">
        <Eyebrow className="text-[#8f8b83]">How we got here · discovery call with Kendall, model maker for Lucasfilm, Mattel and Sega</Eyebrow>
      </Show>
      <Show on={counting} className="left-[120px] top-[150px] flex items-end gap-10">
        <Display size={210} className={beat === "landed" ? "text-[#ff4a00]" : "text-[#efeeec]"}>
          <CountUp value={beat === "landed" ? 2 : 250} duration={beat === "landed" ? 1 : 1.6} />
        </Display>
        <AnimatePresence mode="wait" initial={false}>
          {label && (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={fade}
              className="pb-5"
            >
              <Display size={76} className="text-[#efeeec]">
                {label}
              </Display>
            </motion.div>
          )}
        </AnimatePresence>
      </Show>
      <Show on={beat === "died"} delay={0.3} className="left-[120px] top-[170px]">
        <Display size={92} className="text-[#efeeec]">
          They died on manufacturing cost.
          <br />
          <span className="text-[#ff4a00]">Not design.</span>
        </Display>
      </Show>
    </>
  );
}

const QUESTIONS = ["Can this be made?", "What will it cost?", "Who makes it?", "Will it make money?", "How do I sell it?"];

// Scattered on purpose: the tools a first-timer ends up juggling, none connected.
const TOOLS = [
  { name: "AdamCAD", x: 1330, y: 130, r: -6 },
  { name: "Fusion", x: 1600, y: 190, r: 5 },
  { name: "Zoo", x: 1420, y: 270, r: 3 },
  { name: "MakerWorld", x: 1300, y: 380, r: 4 },
  { name: "Xometry", x: 1590, y: 360, r: -5 },
  { name: "Craftcloud", x: 1440, y: 480, r: -3 },
  { name: "Shopify", x: 1310, y: 600, r: 6 },
  { name: "Etsy", x: 1640, y: 560, r: -7 },
  { name: "Kickstarter", x: 1500, y: 680, r: 2 },
];

export function Questions({ beat }: { beat: Beat }) {
  const on = beat === "questions" || beat === "tools";
  const tools = beat === "tools";
  return (
    <>
      {QUESTIONS.map((q, i) => (
        <Show key={q} on={on} delay={0.15 + i * 0.22} className="left-[120px]" style={{ top: 110 + i * 124 }}>
          <motion.div className="flex items-baseline gap-8" initial={false} animate={{ opacity: tools ? 0.3 : 1 }} transition={fade}>
            <span className="font-mono text-[28px] text-[#ff4a00]">0{i + 1}</span>
            <Display size={76} className="text-[#efeeec]">
              {q}
            </Display>
          </motion.div>
        </Show>
      ))}
      {TOOLS.map((t, i) => (
        <motion.span
          key={t.name}
          className="absolute border border-[#3a3936] bg-[#141413] px-6 py-3 text-[32px] font-medium text-[#efeeec]"
          style={{ left: t.x, top: t.y }}
          initial={false}
          animate={{ opacity: tools ? 1 : 0, scale: tools ? 1 : 0.6, rotate: tools ? t.r : 0, y: tools ? 0 : 30 }}
          transition={{ duration: 0.6, ease, delay: tools ? 0.2 + i * 0.09 : 0 }}
        >
          {t.name}
        </motion.span>
      ))}
      <Show on={tools} delay={1.1} className="left-[120px] top-[800px] max-w-[1700px]">
        <Display size={56} className="leading-[1.05] text-[#efeeec]">
          First-timers juggle 6+ tools{" "}
          <span className="text-[#ff4a00]">and still don&apos;t know if the idea is makeable or profitable.</span>
        </Display>
      </Show>
    </>
  );
}
