"use client";

import { motion } from "motion/react";
import { color, ease, fade } from "../motion";
import { stageX } from "../layout";
import type { DeckFacts } from "@/lib/deckFacts";
import { Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

type Rival = { name: string; note: string; from: number; to: number };

// Stages on the rail: 0 Idea, 1 Design, 2 Make, 3 Money, 4 Launch, 5 Sell.
const RIVALS: Rival[] = [
  { name: "AdamCAD · Zoo · Fusion", note: "design only", from: 0, to: 1 },
  { name: "Alibaba · Thomasnet", note: "directories: you find, vet and write", from: 2, to: 2 },
  { name: "Xometry · Craftcloud", note: "needs finished CAD", from: 2, to: 2 },
  { name: "Shopify · Etsy · Kickstarter", note: "selling only", from: 4, to: 5 },
];

const barSpan = (from: number, to: number) => ({ left: stageX(from) - 150, width: stageX(to) - stageX(from) + 300 });

export function Field({ beat }: { beat: Beat }) {
  const on = beat === "field" || beat === "whole";
  const whole = beat === "whole";
  return (
    <>
      {RIVALS.map((r, i) => (
        <motion.div
          key={r.name}
          className="absolute flex h-[76px] flex-col justify-center border border-[#3a3936] bg-[#141413] px-5"
          style={{ top: 280 + i * 104, ...barSpan(r.from, r.to) }}
          initial={false}
          animate={{ opacity: on ? (whole ? 0.3 : 1) : 0, x: on ? 0 : -30 }}
          transition={{ ...fade, delay: on && !whole ? 0.2 + i * 0.12 : 0 }}
        >
          <span className="text-[26px] font-medium leading-tight text-[#efeeec]">{r.name}</span>
          <span className="font-mono text-[17px] uppercase tracking-[0.1em] text-[#8f8b83]">{r.note}</span>
        </motion.div>
      ))}
      <motion.div
        className="absolute flex h-[72px] origin-left items-center justify-center gap-10 bg-[#ff4a00]"
        style={{ top: 860, ...barSpan(0, 5) }}
        initial={false}
        animate={{ scaleX: whole ? 1 : 0, opacity: whole ? 1 : 0 }}
        transition={{ duration: 1.1, ease, delay: whole ? 0.2 : 0 }}
      >
        <span className="deck-display text-[40px] text-[#0a0a0a]">Moko</span>
        <span className="font-mono text-[20px] uppercase tracking-[0.14em] text-[#0a0a0a]">Idea → the right manufacturer → first sale</span>
      </motion.div>
    </>
  );
}

const TIERS = [
  { name: "Free", text: "Upload an idea: how it can be made, what it costs, and who can make it. The hook." },
  { name: "Pro", text: "A subscription for the outreach: spec sheets, quote requests and comparison, supplier emails, plans, listings, the agent." },
  { name: "Order fee", text: "Once real shops are connected, a small fee on production orders routed through Moko. Printify's model, for original products." },
];

const marginRows = (facts: DeckFacts) => [
  {
    k: `$${facts.aiCostToOutreach.toFixed(2)} of AI, est.`,
    v: "per product, idea to first supplier email: a conservative ceiling from our budget gate. AI is the only real variable cost.",
  },
  { k: "Bring your own key", v: "Heavy users plug in their own AI key, so they never cost us per call" },
  { k: "Capped free tier", v: "Free usage runs on a budget capped per browser and per day, metered on every call" },
];

export function Business({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const on = beat === "model" || beat === "margins";
  const margins = beat === "margins";
  return (
    <>
      <Show on={on} className="left-[120px] top-[96px]">
        <Eyebrow className="text-[#8f8b83]">Business plan</Eyebrow>
      </Show>
      <Show on={beat === "model"} delay={0.1} className="left-[120px] top-[140px]">
        <Display size={80} className="text-[#efeeec]">
          How Moko makes money.
        </Display>
      </Show>
      <Show on={margins} delay={0.1} className="left-[120px] top-[140px]">
        <Display size={80} className="text-[#efeeec]">
          Why the margins hold.
        </Display>
      </Show>
      {TIERS.map((t, i) => (
        <motion.div
          key={t.name}
          className="absolute w-[500px]"
          style={{ left: 120 + i * 580 }}
          initial={false}
          animate={{ opacity: on ? (margins ? 0.35 : 1) : 0, y: margins ? -40 : on ? 0 : 30, top: margins ? 300 : 360 }}
          transition={{ duration: 0.8, ease, delay: on && !margins ? 0.3 + i * 0.2 : 0 }}
        >
          <motion.div
            className="h-1 origin-left bg-[#ff4a00]"
            initial={false}
            animate={{ scaleX: on ? 1 : 0 }}
            transition={{ duration: 0.9, ease, delay: on ? 0.4 + i * 0.2 : 0 }}
          />
          <Display size={72} className="mt-8 text-[#efeeec]">
            {t.name}
          </Display>
          <motion.p
            className="mt-6 text-[30px] leading-snug text-[#b9b5ac]"
            initial={false}
            animate={{ opacity: margins ? 0 : 1, height: margins ? 0 : "auto" }}
            transition={fade}
          >
            {t.text}
          </motion.p>
        </motion.div>
      ))}
      {marginRows(facts).map((m, i) => (
        <Show key={m.k} on={margins} delay={0.4 + i * 0.18} className="left-[120px] w-[1680px]" style={{ top: 520 + i * 140 }}>
          <div className="flex items-baseline gap-10 border-t border-[#262624] pt-6">
            <span className="w-[520px] shrink-0 text-[38px] font-semibold text-[#efeeec]">{m.k}</span>
            <span className="text-[30px] leading-snug text-[#b9b5ac]">{m.v}</span>
          </div>
        </Show>
      ))}
    </>
  );
}

const ROADMAP = [
  "Sign our first 10 real LA shops",
  "Send quote requests from Moko, with the creator's approval on each",
  "Real quotes feed cost calibration",
  "Checkout, payments and direct Etsy publishing",
];

export function Close({ beat }: { beat: Beat }) {
  return (
    <>
      <Show on={beat === "roadmap"} className="left-[120px] top-[110px]">
        <Eyebrow className="text-[#8f8b83]">Roadmap</Eyebrow>
        <Display size={80} className="mt-5 text-[#efeeec]">
          What&apos;s next.
        </Display>
      </Show>
      {ROADMAP.map((r, i) => (
        <Show key={r} on={beat === "roadmap"} delay={0.3 + i * 0.15} className="left-[120px] w-[1680px]" style={{ top: 330 + i * 118 }}>
          <div className="flex items-baseline gap-10 border-t border-[#262624] pt-5">
            <span className="w-14 font-mono text-[28px] text-[#ff4a00]">0{i + 1}</span>
            <span className="text-[44px] font-medium text-[#efeeec]">{r}</span>
          </div>
        </Show>
      ))}
      <Show on={beat === "ask"} delay={0.4} className="inset-x-0 top-[540px] text-center">
        <Eyebrow className="text-[#8f8b83]">Our ask</Eyebrow>
        <Display size={76} className="mt-8 text-[#efeeec]">
          Try it with your idea.
          <br />
          <span style={{ color: color.orange }}>Send us anyone with a product they&apos;ve never made,</span>
          <br />
          <span style={{ color: color.orange }}>or a shop that wants small-run work.</span>
        </Display>
      </Show>
      <Show on={beat === "thanks"} delay={0.5} className="inset-x-0 top-[760px] text-center">
        <Display size={84} className="text-[#efeeec]">
          Thank you.
        </Display>
      </Show>
    </>
  );
}

const HARD = [
  { q: "Are the shops and quotes real?", a: "Not yet. Local shops are fictional, and quotes are simulated inside the analysis cost range, labeled “Demo quote”. Next: sign 10 real LA shops." },
  { q: "Do you contact Alibaba?", a: "No. Alibaba has no buyer API and its terms forbid automation. Moko plans the search and writes each email; the creator sends it." },
  { q: "How accurate are costs?", a: "Ranges for early decisions, not final prices, calibrated by real quotes as they come in. The point is killing bad ideas before a $10K tooling bill." },
  { q: "Why can't Xometry add this?", a: "Their buyer is an engineer with finished CAD. Ours is a first-timer with an idea and no idea who to call." },
  { q: "What about IP?", a: "Private by default. The CAD file never goes to the AI, and shops see only a spec summary." },
  { q: "Why now?", a: "AI can finally read 3D, and 36% of manufacturers are moving production back to the US (2026 Reshoring Survey)." },
];

export function Appendix({ beat }: { beat: Beat }) {
  const on = beat === "hard";
  return (
    <>
      <Show on={on} className="left-[120px] top-[90px]">
        <Eyebrow className="text-[#8f8b83]">Appendix · for Q&A</Eyebrow>
        <Display size={64} className="mt-4 text-[#efeeec]">
          Hard questions.
        </Display>
      </Show>
      {HARD.map((h, i) => (
        <Show key={h.q} on={on} delay={0.2 + i * 0.1} className="left-[120px] w-[1680px]" style={{ top: 250 + i * 130 }}>
          <div className="flex gap-10 border-t border-[#262624] pt-5">
            <span className="w-[520px] shrink-0 text-[34px] font-semibold text-[#efeeec]">{h.q}</span>
            <span className="text-[28px] leading-snug text-[#b9b5ac]">{h.a}</span>
          </div>
        </Show>
      ))}
    </>
  );
}
