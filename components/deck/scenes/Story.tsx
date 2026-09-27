"use client";

import { motion } from "motion/react";
import Image from "next/image";
import bracketRender from "@/demo/renders/bracket-v2-render-0.png";
import type { DeckFacts } from "@/lib/deckFacts";
import { color, ease, fade, move } from "../motion";
import { stageX } from "../layout";
import { CountUp, Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

export function Iterate({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const { bracket } = facts;
  const on = beat === "before" || beat === "after";
  const after = beat === "after";
  const drop = Number(bracket.unitChange.replace(/[^\d.]/g, "")) || 0;
  return (
    <>
      <Show on={on} className="left-[120px] top-[100px]">
        <Display size={66} className="text-[#efeeec]">
          Every change is a new version.
          <br />
          <span className="text-[#8f8b83]">Every version is re-priced.</span>
        </Display>
      </Show>
      <Show on={on} delay={0.2} className="left-[120px] top-[330px] h-[520px] w-[780px] overflow-hidden bg-[#f3f2ee]">
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: after ? 1 : 0.35, filter: after ? "grayscale(0)" : "grayscale(1)", scale: after ? 1 : 0.94 }}
          transition={move}
        >
          <Image src={bracketRender} alt="" fill sizes="780px" className="object-cover" />
        </motion.div>
        <span className="absolute left-5 top-4 font-mono text-[22px] uppercase tracking-[0.14em] text-[#5c5a55]">
          {bracket.name} · v{after ? 2 : 1}
        </span>
      </Show>

      <Show on={on} delay={0.3} className="left-[1000px] top-[330px] w-[800px]">
        <VersionRow label="v1" process={bracket.before.process} unit={bracket.before.unit} dim={after} />
      </Show>
      <Show on={after} delay={0.2} className="left-[1000px] top-[420px] w-[800px] border-l-4 border-[#ff4a00] pl-6">
        <Eyebrow className="text-[#8f8b83]">Applied the AI&apos;s tweak</Eyebrow>
        <p className="mt-2 text-[26px] leading-snug text-[#efeeec]">{bracket.change}</p>
      </Show>
      <Show on={after} delay={0.6} className="left-[1000px] top-[590px] w-[800px]">
        <VersionRow label="v2" process={bracket.after.process} unit={bracket.after.unit} />
      </Show>
      <Show on={after} delay={0.9} className="left-[1000px] top-[710px] flex flex-col items-start gap-8">
        <Display size={180} className="text-[#5fd39a]">
          <CountUp value={after ? drop : 0} prefix="−" suffix="%" duration={1.6} />
        </Display>
        <p className="pl-2 font-mono text-[24px] uppercase tracking-[0.14em] text-[#8f8b83]">unit cost, v1 → v2</p>
      </Show>
      <Show on={after} delay={1.3} className="left-[120px] top-[900px]">
        <p className="font-mono text-[24px] uppercase tracking-[0.12em] text-[#b9b5ac]">{bracket.summary}</p>
      </Show>
    </>
  );
}

function VersionRow({ label, process, unit, dim = false }: { label: string; process: string; unit: string; dim?: boolean }) {
  return (
    <motion.div
      className="flex items-baseline gap-6 border-b border-[#262624] pb-4"
      initial={false}
      animate={{ opacity: dim ? 0.45 : 1 }}
      transition={fade}
    >
      <span className="w-14 font-mono text-[28px] text-[#ff4a00]">{label}</span>
      <span className="flex-1 text-[36px] font-medium text-[#efeeec]">{process}</span>
      <span className="font-mono text-[28px] tabular-nums text-[#b9b5ac]">{unit} / part</span>
    </motion.div>
  );
}

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
          of manufacturers have reshored or are reshoring.
        </Display>
      </Show>
      <Show on={beat === "reshoring"} delay={0.6} className="left-[120px] top-[900px]">
        <Eyebrow className="text-[#5a5852]">Source: 2026 Reshoring Survey (up from 29%; 65% cite tariffs)</Eyebrow>
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

const RIVALS: Rival[] = [
  { name: "Backflip", note: "ends at the model", from: 0, to: 1 },
  { name: "Xometry · Protolabs", note: "needs finished CAD", from: 2, to: 2 },
  { name: "Pietra", note: "existing goods only", from: 2, to: 5 },
  { name: "Alibaba Accio", note: "overseas, high volume", from: 2, to: 5 },
  { name: "Printify", note: "catalog products only", from: 2, to: 5 },
  { name: "Etsy · Shopify", note: "selling only", from: 5, to: 5 },
];

const barSpan = (from: number, to: number) => ({ left: stageX(from) - 140, width: stageX(to) - stageX(from) + 280 });

export function Field({ beat }: { beat: Beat }) {
  const on = beat === "field" || beat === "whole";
  const whole = beat === "whole";
  return (
    <>
      {RIVALS.map((r, i) => (
        <motion.div
          key={r.name}
          className="absolute flex h-[64px] flex-col justify-center border border-[#3a3936] bg-[#141413] px-5"
          style={{ top: 280 + i * 88, ...barSpan(r.from, r.to) }}
          initial={false}
          animate={{ opacity: on ? (whole ? 0.3 : 1) : 0, x: on ? 0 : -30 }}
          transition={{ ...fade, delay: on && !whole ? 0.2 + i * 0.12 : 0 }}
        >
          <span className="text-[24px] font-medium leading-tight text-[#efeeec]">{r.name}</span>
          <span className="font-mono text-[16px] uppercase tracking-[0.1em] text-[#8f8b83]">{r.note}</span>
        </motion.div>
      ))}
      <motion.div
        className="absolute flex h-[72px] origin-left items-center justify-center gap-10 bg-[#ff4a00]"
        style={{ top: 860, ...barSpan(0, 5) }}
        initial={false}
        animate={{ scaleX: whole ? 1 : 0, opacity: whole ? 1 : 0 }}
        transition={{ duration: 1.1, ease, delay: whole ? 0.2 : 0 }}
      >
        <span className="display-type text-[40px] text-[#0a0a0a]">Moko</span>
        <span className="font-mono text-[20px] uppercase tracking-[0.14em] text-[#0a0a0a]">One product record · idea to first sale</span>
      </motion.div>
    </>
  );
}

const TIERS = [
  { name: "Free", text: "Upload, analysis and one product. Enough to find out if an idea can be made." },
  { name: "Pro", text: "Unlimited products and versions, outreach, launch plans, listings and the agent." },
  { name: "Order fee", text: "A small percentage on production orders placed through Moko." },
];

export function Model({ beat }: { beat: Beat }) {
  const on = beat === "model";
  return (
    <>
      <Show on={on} className="left-[120px] top-[140px]">
        <Display size={96} className="text-[#efeeec]">
          How Moko makes money.
        </Display>
      </Show>
      {TIERS.map((t, i) => (
        <Show key={t.name} on={on} delay={0.3 + i * 0.2} className="top-[400px] w-[500px]" style={{ left: 120 + i * 580 }}>
          <motion.div
            className="h-1 origin-left bg-[#ff4a00]"
            initial={false}
            animate={{ scaleX: on ? 1 : 0 }}
            transition={{ duration: 0.9, ease, delay: on ? 0.4 + i * 0.2 : 0 }}
          />
          <Display size={72} className="mt-8 text-[#efeeec]">
            {t.name}
          </Display>
          <p className="mt-6 text-[32px] leading-snug text-[#b9b5ac]">{t.text}</p>
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
        <Eyebrow className="text-[#8f8b83]">Switch to the app</Eyebrow>
      </Show>
    </>
  );
}

export function Close({ beat }: { beat: Beat }) {
  return (
    <>
      <Show on={beat === "ask"} delay={0.4} className="inset-x-0 top-[540px] text-center">
        <Eyebrow className="text-[#8f8b83]">What&apos;s next</Eyebrow>
        <Display size={76} className="mt-8 text-[#efeeec]">
          Sign 10 real LA shops.
          <br />
          <span style={{ color: color.orange }}>Get real creators to their first run.</span>
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
