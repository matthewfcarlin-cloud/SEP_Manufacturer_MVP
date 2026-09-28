"use client";

import { motion } from "motion/react";
import { color, ease, fade } from "../motion";
import { stageX } from "../layout";
import { CountUp, Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

const REASONS = ["AI can read 3D.", "Making went mainstream.", "Manufacturing is coming home."];

export function WhyNow({ beat }: { beat: Beat }) {
  return (
    <>
      <Show on={beat === "reshoring"} className="left-[120px] top-[110px]">
        <Eyebrow className="text-[#8f8b83]">Why now</Eyebrow>
      </Show>
      <Show on={beat === "reshoring"} className="left-[120px] top-[290px] flex items-center gap-36">
        <Display size={300} className="text-[#efeeec]">
          <CountUp value={beat === "reshoring" ? 36 : 0} suffix="%" />
        </Display>
        <Display size={58} className="max-w-[900px] text-[#efeeec]">
          of manufacturers are moving production back to the US.
        </Display>
      </Show>
      <Show on={beat === "reshoring"} delay={0.6} className="left-[120px] top-[900px]">
        <Eyebrow className="text-[#5a5852]">Source: 2026 Reshoring Survey (up from 29%; tariffs the top reason)</Eyebrow>
      </Show>

      {REASONS.map((reason, i) => (
        <Show key={reason} on={beat === "inflection"} delay={0.15 + i * 0.25} className="left-[120px]" style={{ top: 150 + i * 150 }}>
          <div className="flex items-baseline gap-8">
            <span className="font-mono text-[28px] text-[#ff4a00]">0{i + 1}</span>
            <Display size={96} className="text-[#efeeec]">
              {reason}
            </Display>
          </div>
        </Show>
      ))}
      <Show on={beat === "inflection"} delay={1} className="left-[120px] top-[700px] max-w-[1600px]">
        <Display size={52} className="leading-[1.05] text-[#ff4a00]">
          For the first time, anyone can go from an idea to a makeable design, a price and a supplier in one sitting.
        </Display>
      </Show>
    </>
  );
}

type Rival = { name: string; note: string; from: number; to: number };

// Stages on the rail: 0 Idea, 1 Design, 2 Make, 3 Money, 4 Launch, 5 Sell.
const RIVALS: Rival[] = [
  { name: "AdamCAD · Zoo · Fusion", note: "design only", from: 0, to: 1 },
  { name: "MakerWorld", note: "assumes you own a printer", from: 1, to: 2 },
  { name: "Xometry, Craftcloud", note: "needs finished CAD", from: 2, to: 2 },
  { name: "Printify", note: "catalog products only", from: 2, to: 5 },
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
        <span className="font-mono text-[20px] uppercase tracking-[0.14em] text-[#0a0a0a]">Design → make → sell · manufacturability from day one</span>
      </motion.div>
    </>
  );
}

const TIERS = [
  { name: "Free", text: "Upload, analysis and one product. Enough to find out if an idea can be made." },
  { name: "Pro", text: "A subscription: unlimited products and versions, quotes, launch plans, listings and the agent." },
  { name: "Order fee", text: "A small fee on production orders we route to shops, plus shop referral fees." },
];

const MARGINS = [
  { k: "Bring your own key", v: "Creators can plug in their own AI key, so heavy users don't cost us per call" },
  { k: "Capped house budget", v: "Free usage runs on a budget capped per browser and per day, metered per call" },
  { k: "Our own bet", v: "Printify earns from subscriptions, not per-order fees; the order fee is our choice, not a copy" },
];

export function Business({ beat }: { beat: Beat }) {
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
            className="mt-6 text-[32px] leading-snug text-[#b9b5ac]"
            initial={false}
            animate={{ opacity: margins ? 0 : 1, height: margins ? 0 : "auto" }}
            transition={fade}
          >
            {t.text}
          </motion.p>
        </motion.div>
      ))}
      {MARGINS.map((m, i) => (
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

export function Demo({ beat }: { beat: Beat }) {
  const on = beat === "demo";
  return (
    <>
      <Show on={on} delay={0.2} className="inset-x-0 top-[430px] text-center">
        <Display size={200} className="text-[#efeeec]">
          Live demo
        </Display>
      </Show>
      <Show on={on} delay={0.8} className="inset-x-0 top-[860px] text-center">
        <Eyebrow className="text-[#8f8b83]">One product · idea → launch page · 2 minutes</Eyebrow>
      </Show>
    </>
  );
}

const ROADMAP = ["Text-to-CAD design generation", "Real launch video generation", "Checkout and payments", "Direct Etsy publishing", "First real LA shops"];

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
          <span style={{ color: color.orange }}>Send us anyone with a product they&apos;ve never made.</span>
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
  { q: "Are the quotes real?", a: "Not yet. They're simulated inside the analysis cost range and labeled “Demo quote”. Next step: sign 10 real LA shops." },
  { q: "Can you post to Etsy?", a: "An Etsy app can post drafts to its own shop quickly; other sellers' shops need Etsy's commercial review. Today the listing is copy-and-paste." },
  { q: "How accurate are costs?", a: "Ranges for early decisions, not final prices. The point is killing bad ideas before a $10K tooling bill." },
  { q: "Why can't Xometry add this?", a: "Their buyer is an engineer with finished CAD. Ours is a first-timer with an idea and an Etsy shop." },
  { q: "What about IP?", a: "Private by default. The CAD file never goes to the AI, and shops see only a spec summary." },
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
        <Show key={h.q} on={on} delay={0.2 + i * 0.1} className="left-[120px] w-[1680px]" style={{ top: 270 + i * 150 }}>
          <div className="flex gap-10 border-t border-[#262624] pt-5">
            <span className="w-[520px] shrink-0 text-[34px] font-semibold text-[#efeeec]">{h.q}</span>
            <span className="text-[28px] leading-snug text-[#b9b5ac]">{h.a}</span>
          </div>
        </Show>
      ))}
    </>
  );
}
