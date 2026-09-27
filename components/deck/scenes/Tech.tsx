"use client";

import { motion } from "motion/react";
import { color, ease } from "../motion";
import { Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

const FEATURES = ["Analysis", "Agent", "Price", "BOM", "Sourcing", "Supplier emails", "Orders", "Pitch", "Plan", "Listing"];

const GATEWAY = [
  "Key: the creator's own (AES-256-GCM, never logged) or our capped house budget",
  "Routes each task to a model and effort level",
  "Validates structured output against a schema; one retry",
  "Meters tokens and cost, never prompt content",
];

const LOOP = [
  { step: "Creators act", detail: "apply a tweak, choose a quote, enter a real quote", status: "Built" },
  { step: "Events + outcomes", detail: "real, opted-in data only; never files or notes", status: "Built" },
  { step: "Similar products", detail: "nearest past products fed into analysis and agent prompts", status: "Built" },
  { step: "Calibrated costs", detail: "cost ranges corrected by real quotes; tweaks ranked by what worked", status: "Built" },
];

export function Tech({ beat }: { beat: Beat }) {
  const on = beat === "gateway" || beat === "learning";
  const titles: Partial<Record<Beat, string>> = {
    gateway: "One gateway for every AI call.",
    learning: "It gets better with every real quote.",
  };
  return (
    <>
      <Show on={on} className="left-[120px] top-[96px]">
        <Eyebrow className="text-[#8f8b83]">Tech stack & details</Eyebrow>
      </Show>
      {Object.entries(titles).map(([b, text]) => (
        <Show key={b} on={beat === b} delay={0.1} className="left-[120px] top-[140px]">
          <Display size={72} className="text-[#efeeec]">
            {text}
          </Display>
        </Show>
      ))}

      <Show on={beat === "gateway"} delay={0.2} className="left-[120px] top-[340px] w-[430px]">
        <Eyebrow className="mb-5 text-[#8f8b83]">Every AI feature</Eyebrow>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map((f) => (
            <span key={f} className="border border-[#3a3936] bg-[#111110] px-4 py-2.5 text-[24px] text-[#efeeec]">
              {f}
            </span>
          ))}
        </div>
      </Show>
      <Show on={beat === "gateway"} delay={0.45} className="left-[610px] top-[360px] w-[810px] border-2 border-[#ff4a00] bg-[#1f130c] p-10">
        <span className="display-type text-[48px] text-[#efeeec]">Gateway</span>
        <ul className="mt-6 flex flex-col gap-4">
          {GATEWAY.map((g, i) => (
            <motion.li
              key={g}
              className="flex gap-4 text-[29px] leading-snug text-[#efeeec]"
              initial={false}
              animate={{ opacity: beat === "gateway" ? 1 : 0, x: beat === "gateway" ? 0 : -12 }}
              transition={{ duration: 0.5, ease, delay: beat === "gateway" ? 0.8 + i * 0.15 : 0 }}
            >
              <span className="text-[#ff4a00]">→</span>
              {g}
            </motion.li>
          ))}
        </ul>
      </Show>
      <Show on={beat === "gateway"} delay={0.7} className="left-[1540px] top-[520px] w-[260px] border border-[#3a3936] bg-[#111110] p-8 text-center">
        <span className="display-type text-[44px] text-[#efeeec]">Claude</span>
        <p className="mt-2 font-mono text-[18px] uppercase tracking-[0.12em] text-[#8f8b83]">Anthropic API</p>
      </Show>
      <Pulse on={beat === "gateway"} from={560} to={600} y={600} />
      <Pulse on={beat === "gateway"} from={1430} to={1530} y={600} />

      {LOOP.map((l, i) => (
        <Show key={l.step} on={beat === "learning"} delay={0.25 + i * 0.2} className="w-[380px]" style={{ left: 120 + i * 430, top: 340 }}>
          <div className="flex h-[330px] flex-col border border-[#3a3936] bg-[#111110] p-8">
            <span
              className="self-start px-3 py-1 font-mono text-[18px] uppercase tracking-[0.12em]"
              style={l.status === "Built" ? { background: "#12291d", color: color.idle } : { background: "#262624", color: "#b9b5ac" }}
            >
              {l.status}
            </span>
            <span className="display-type mt-6 text-[40px] text-[#efeeec]">{l.step}</span>
            <span className="mt-4 text-[27px] leading-snug text-[#b9b5ac]">{l.detail}</span>
          </div>
        </Show>
      ))}
      <Show on={beat === "learning"} delay={1.2} className="left-[120px] top-[740px] w-[1670px]">
        <svg width={1670} height={70} className="overflow-visible">
          <motion.path
            d="M 1480 0 L 1480 40 L 190 40 L 190 0"
            fill="none"
            stroke={color.orange}
            strokeWidth={3}
            initial={false}
            animate={{ pathLength: beat === "learning" ? 1 : 0 }}
            transition={{ duration: 1.2, ease, delay: beat === "learning" ? 1.3 : 0 }}
          />
        </svg>
        <p className="mt-2 text-center font-mono text-[22px] uppercase tracking-[0.12em] text-[#8f8b83]">
          Retrieval + calibration, not model training · every prompt change scored on 12 golden parts
        </p>
      </Show>
    </>
  );
}

/** A dot running along a connector, to show calls flowing through. */
function Pulse({ on, from, to, y }: { on: boolean; from: number; to: number; y: number }) {
  return (
    <motion.div className="absolute" style={{ left: from, top: y, width: to - from }} initial={false} animate={{ opacity: on ? 1 : 0 }}>
      <div className="h-[2px] w-full bg-[#3a3936]" />
      {on && (
        <motion.span
          className="absolute -top-[7px] size-4 rounded-full"
          style={{ backgroundColor: color.orange }}
          initial={{ x: 0 }}
          animate={{ x: to - from - 16 }}
          transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.3 }}
        />
      )}
    </motion.div>
  );
}
