"use client";

import { AnimatePresence, motion } from "motion/react";
import type { DeckFacts } from "@/lib/deckFacts";
import { color, fade } from "../motion";
import { machineGrid } from "../layout";
import { CountUp, DemoTag, Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

export function Title({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const on = beat === "title";
  return (
    <>
      <Show on={on} delay={0.5} className="inset-x-0 top-[660px] text-center">
        <Display size={72} className="text-[#efeeec]">
          From idea to first sale.
        </Display>
      </Show>
      <Show on={on} delay={0.9} className="inset-x-0 bottom-[110px] flex justify-center">
        <p className="flex items-center gap-4 font-mono text-[22px] uppercase tracking-[0.14em] text-[#8f8b83]">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5fd39a] opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-3 rounded-full bg-[#5fd39a]" />
          </span>
          {facts.idle} of {facts.machines} machines idle in LA this month · demo data
        </p>
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
        <Eyebrow className="text-[#8f8b83]">Customer discovery · a veteran model maker for Lucasfilm, Mattel and Sega</Eyebrow>
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
          They died on tooling cost.
          <br />
          <span className="text-[#ff4a00]">Not design.</span>
        </Display>
      </Show>
    </>
  );
}

const QUESTIONS = ["Can this be made?", "What will it cost?", "Who makes it?", "Will it make money?", "How do I sell it?"];

export function Questions({ beat }: { beat: Beat }) {
  const on = beat === "questions" || beat === "noYears";
  const dim = beat === "noYears";
  return (
    <>
      {QUESTIONS.map((q, i) => (
        <Show key={q} on={on} delay={0.15 + i * 0.22} className="left-[120px]" style={{ top: 110 + i * 128 }}>
          <motion.div
            className="flex items-baseline gap-8"
            initial={false}
            animate={{ opacity: dim ? 0.28 : 1 }}
            transition={fade}
          >
            <span className="font-mono text-[28px] text-[#ff4a00]">0{i + 1}</span>
            <Display size={84} className="text-[#efeeec]">
              {q}
            </Display>
          </motion.div>
        </Show>
      ))}
      <Show on={dim} delay={0.2} className="left-[120px] top-[800px] max-w-[1600px]">
        <Display size={54} className="leading-[1.05] text-[#efeeec]">
          He learned the answers over decades on factory floors.{" "}
          <span className="text-[#ff4a00]">First-timers juggle five or six tools and still can&apos;t answer them.</span>
        </Display>
      </Show>
    </>
  );
}

export function Idle({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const on = beat === "machines" || beat === "idle";
  const idle = beat === "idle";
  return (
    <>
      <Show on={on} className="left-[120px] top-[110px] flex items-end gap-20">
        <motion.div initial={false} animate={{ color: idle ? color.idle : color.ink }} transition={fade}>
          <Display size={200}>
            <CountUp value={idle ? facts.idle : facts.machines} />
          </Display>
        </motion.div>
        <div className="pb-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={idle ? "idle" : "all"}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={fade}
            >
              <Display size={60} className="text-[#efeeec]">
                {idle ? (
                  <>
                    machines idle
                    <br />
                    this month.
                  </>
                ) : (
                  <>
                    machines across
                    <br />
                    {facts.shops} LA shops.
                  </>
                )}
              </Display>
            </motion.div>
          </AnimatePresence>
        </div>
      </Show>
      <Show on={on} delay={0.4} className="right-[120px] top-[128px]">
        <DemoTag />
      </Show>
      <Show on={idle} delay={0.5} className="left-[120px] top-[372px]">
        <Display size={58} className="text-[#efeeec]">
          Design around the machines <span className="text-[#5fd39a]">already running.</span>
        </Display>
      </Show>
      {facts.machineColumns.map((column, c) => (
        <Show
          key={column.label}
          on={on}
          delay={0.3 + c * 0.05}
          from={10}
          className="text-center"
          style={{
            left: machineGrid.x + c * machineGrid.columnStep - 18,
            top: machineGrid.floor + 22,
            width: machineGrid.across * (machineGrid.cell + machineGrid.gap) - machineGrid.gap + 36,
          }}
        >
          <p className="font-mono text-[17px] uppercase leading-tight tracking-[0.1em] text-[#8f8b83]">{column.label}</p>
          <p className="mt-1 font-mono text-[17px] tabular-nums text-[#5a5852]">
            {idle ? `${column.idle.filter(Boolean).length}/${column.idle.length}` : column.idle.length}
          </p>
        </Show>
      ))}
    </>
  );
}
