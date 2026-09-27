"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import type { DeckFacts } from "@/lib/deckFacts";
import { color, ease, fade, move, pick } from "../motion";
import { rail, STAGES, stageX } from "../layout";
import { DemoTag, Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

// The landing page's anodized pedal, turning live. WebGL only exists in the browser.
const HeroScene = dynamic(() => import("@/components/home/HeroScene"), { ssr: false });

/** Which stage of the creator journey each beat is on; -1 shows the rail with no stage active. */
const activeStage: Partial<Record<Beat, number>> = {
  idea: 0,
  design: 1,
  make: 2,
  outreach: 2,
  money: 3,
  sell: 5,
  field: -1,
  whole: -1,
};

/** The six-stage rail, shared by the product walkthrough and the competition slide. */
export function Rail({ beat }: { beat: Beat }) {
  const active = activeStage[beat];
  const on = active !== undefined;
  const width = stageX(STAGES.length - 1) - stageX(0);
  return (
    <motion.div className="pointer-events-none absolute inset-0" initial={false} animate={{ opacity: on ? 1 : 0 }} transition={fade}>
      <motion.div
        className="absolute h-[2px] origin-left bg-[#3a3936]"
        style={{ left: stageX(0), top: rail.y - 1, width }}
        initial={false}
        animate={{ scaleX: on ? 1 : 0 }}
        transition={{ duration: 1.1, ease }}
      />
      <motion.div
        className="absolute h-[2px] origin-left bg-[#ff4a00]"
        style={{ left: stageX(0), top: rail.y - 1, width }}
        initial={false}
        animate={{ scaleX: on && active !== undefined && active > 0 ? active / (STAGES.length - 1) : 0 }}
        transition={move}
      />
      {STAGES.map((stage, i) => {
        const current = i === active;
        const passed = active !== undefined && (active === -1 || i < active);
        return (
          <div key={stage} className="absolute" style={{ left: stageX(i), top: 0 }}>
            <motion.p
              className="absolute -translate-x-1/2 font-mono text-[26px] font-medium uppercase tracking-[0.16em]"
              style={{ top: rail.labelY }}
              initial={false}
              animate={{ color: current ? color.ink : passed ? "#b9b5ac" : "#5a5852" }}
              transition={fade}
            >
              {stage}
            </motion.p>
            <motion.span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{ top: rail.y }}
              initial={false}
              animate={{
                backgroundColor: current ? color.orange : passed ? color.ink : color.stage,
                borderColor: current ? color.orange : passed ? color.ink : "#5a5852",
                scale: current ? 1.4 : 1,
              }}
              transition={fade}
            />
          </div>
        );
      })}
    </motion.div>
  );
}

type Spot = { x: number; y: number; scale: number; opacity: number };

const left: Spot = { x: 20, y: 330, scale: 0.8, opacity: 1 };
const pedalSpots: Partial<Record<Beat, Spot>> = {
  idea: { x: 940, y: 250, scale: 1.05, opacity: 1 },
  design: left,
  make: left,
  money: left,
  sell: left,
};

/** One live 3D pedal for the whole walkthrough; it moves and scales, and its canvas never resizes. */
export function Pedal({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const spot = pick(pedalSpots, beat, { ...left, opacity: 0 });
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 h-[700px] w-[900px] origin-top-left"
      initial={false}
      animate={spot}
      transition={move}
    >
      <HeroScene offset={[0, -0.05, 0]} distance={6} />
      <p className="absolute inset-x-0 bottom-2 text-center font-mono text-[20px] uppercase tracking-[0.14em] text-[#8f8b83]">
        pedal-enclosure.stl · {facts.pedal.dims}
      </p>
    </motion.div>
  );
}

const headlines: Partial<Record<Beat, string>> = {
  design: "Every way to make it, priced.",
  make: "Who can make it.",
  outreach: "Reach out. Compare quotes.",
  money: "Does it make money?",
  sell: "Then launch and sell.",
};

/** What's live in the app today for each stage, said out loud rather than implied. */
const status: Partial<Record<Beat, { label: string }>> = {
  idea: { label: "Built" },
  design: { label: "Built" },
  make: { label: "Built · demo shops" },
  outreach: { label: "Built · simulated quotes" },
  money: { label: "Built" },
  sell: { label: "Built · copy-paste to Etsy" },
};

export function Journey({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const { pedal } = facts;
  return (
    <>
      <Show on={beat === "idea"} delay={0.3} className="left-[120px] top-[330px] w-[800px]">
        <Display size={120} className="text-[#efeeec]">
          Bring an idea.
        </Display>
        <p className="mt-8 font-mono text-[26px] uppercase tracking-[0.14em] text-[#8f8b83]">CAD · photos · a sketch · notes</p>
        <p className="mt-3 text-[28px] text-[#b9b5ac]">Private by default: the CAD file itself never goes to the AI</p>
        <div className="mt-14 inline-flex flex-col gap-2 border border-[#3a3936] bg-[#111110] px-7 py-5">
          <span className="font-mono text-[20px] uppercase tracking-[0.14em] text-[#8f8b83]">Real example</span>
          <span className="text-[34px] font-medium text-[#efeeec]">{pedal.name}</span>
          <span className="font-mono text-[22px] text-[#b9b5ac]">
            {pedal.dims} · {pedal.quantity.toLocaleString("en-US")} units
          </span>
        </div>
      </Show>

      {Object.entries(headlines).map(([b, text]) => (
        <Show key={b} on={beat === b} delay={0.15} className="left-[120px] top-[236px]">
          <Display size={66} className="text-[#efeeec]">
            {text}
          </Display>
        </Show>
      ))}
      {Object.entries(status).map(([b, st]) => (
        <Show key={b} on={beat === b} delay={0.35} from={10} className="right-[120px] top-[248px]">
          <span className="bg-[#12291d] px-4 py-2 font-mono text-[20px] uppercase tracking-[0.12em] text-[#5fd39a]">{st.label}</span>
        </Show>
      ))}

      <Paths on={beat === "design"} facts={facts} />
      <Match on={beat === "make"} facts={facts} />
      <Outreach on={beat === "outreach"} facts={facts} />
      <Money on={beat === "money"} facts={facts} />
      <Listing on={beat === "sell"} facts={facts} />
    </>
  );
}

const panel = "left-[860px] top-[360px] w-[940px]";

function Paths({ on, facts }: { on: boolean; facts: DeckFacts }) {
  return (
    <Show on={on} delay={0.25} className={panel}>
      <Eyebrow className="mb-6 text-[#8f8b83]">
        AI analysis at {facts.pedal.quantity} units · fit score · per part · tooling · est.
      </Eyebrow>
      <div className="flex flex-col gap-7">
        {facts.pedal.paths.map((p, i) => (
          <div key={p.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[34px] font-medium text-[#efeeec]">{p.label}</span>
              <span className="font-mono text-[24px] tabular-nums text-[#b9b5ac]">
                {p.unit} · {p.tooling}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-5">
              <div className="h-3 flex-1 bg-[#1c1c1a]">
                <motion.div
                  className="h-full origin-left"
                  style={{ backgroundColor: i === 0 ? color.orange : "#5a5852", width: `${p.fit}%` }}
                  initial={false}
                  animate={{ scaleX: on ? 1 : 0 }}
                  transition={{ duration: 1, ease, delay: on ? 0.4 + i * 0.15 : 0 }}
                />
              </div>
              <span className="w-14 text-right font-mono text-[24px] tabular-nums text-[#efeeec]">{p.fit}</span>
            </div>
          </div>
        ))}
      </div>
    </Show>
  );
}

function Match({ on, facts }: { on: boolean; facts: DeckFacts }) {
  const m = facts.pedal.match;
  if (!m) return null;
  return (
    <Show on={on} delay={0.25} className={panel}>
      <div className="border border-[#3a3936] bg-[#111110] p-10">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-[#8f8b83]">Top local match</Eyebrow>
          <DemoTag>Demo data</DemoTag>
        </div>
        <p className="mt-6 text-[56px] font-semibold leading-tight text-[#efeeec]">{m.shop}</p>
        <p className="mt-1 font-mono text-[24px] uppercase tracking-[0.12em] text-[#8f8b83]">{m.neighborhood}</p>
        <div className="mt-8 flex items-center gap-5 border-t border-[#262624] pt-8">
          <span className="text-[30px] text-[#efeeec]">{m.machine}</span>
          {m.idle && (
            <motion.span
              className="inline-flex items-center gap-2 bg-[#12291d] px-3 py-1 font-mono text-[20px] uppercase tracking-[0.12em] text-[#5fd39a]"
              initial={false}
              animate={{ scale: on ? [0.6, 1.12, 1] : 0.6, opacity: on ? 1 : 0 }}
              transition={{ duration: 0.7, delay: on ? 0.8 : 0 }}
            >
              <span className="size-2.5 rounded-full bg-[#5fd39a]" />
              Can start this week
            </motion.span>
          )}
        </div>
        <ul className="mt-7 flex flex-col gap-3">
          {[...m.reasons.slice(0, 2), "Overseas too: an AI-planned Alibaba search and supplier shortlist"].map((r, i) => (
            <motion.li
              key={r}
              className="flex gap-4 text-[26px] text-[#b9b5ac]"
              initial={false}
              animate={{ opacity: on ? 1 : 0, x: on ? 0 : -16 }}
              transition={{ ...fade, delay: on ? 1 + i * 0.15 : 0 }}
            >
              <span className="text-[#5fd39a]">✓</span>
              {r}
            </motion.li>
          ))}
        </ul>
      </div>
    </Show>
  );
}

// Cost chart geometry, inside the right-hand panel.
const chart = { w: 940, h: 420, qMin: 10, qMax: 10_000, yMax: 80 };
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"];
const xAt = (q: number) => (Math.log10(q / chart.qMin) / Math.log10(chart.qMax / chart.qMin)) * chart.w;
const yAt = (usd: number) => chart.h - (Math.min(usd, chart.yMax * 1.5) / chart.yMax) * chart.h;

function Money({ on, facts }: { on: boolean; facts: DeckFacts }) {
  const { pedal } = facts;
  const revenueY = yAt(pedal.revenuePerUnit);
  const targetX = xAt(pedal.quantity);
  return (
    <Show on={on} delay={0.25} className={panel}>
      <Eyebrow className="mb-4 text-[#8f8b83]">All-in cost per part (tooling spread over the run) · est.</Eyebrow>
      <svg width={chart.w} height={chart.h + 50} className="overflow-visible">
        <defs>
          <clipPath id="deck-chart">
            <rect x={0} y={0} width={chart.w} height={chart.h} />
          </clipPath>
        </defs>
        {[10, 100, 1000, 10_000].map((q) => (
          <g key={q}>
            <line x1={xAt(q)} x2={xAt(q)} y1={0} y2={chart.h} stroke="#1c1c1a" strokeWidth={2} />
            <text x={xAt(q)} y={chart.h + 36} fill="#8f8b83" fontSize={20} textAnchor="middle" className="font-mono">
              {q.toLocaleString("en-US")}
            </text>
          </g>
        ))}
        <line x1={0} x2={chart.w} y1={chart.h} y2={chart.h} stroke="#3a3936" strokeWidth={2} />
        <g clipPath="url(#deck-chart)">
          {pedal.curves.map((c, i) => (
            <motion.path
              key={c.label}
              d={c.points.map((p, j) => `${j ? "L" : "M"}${xAt(p.quantity)},${yAt(p.mid)}`).join(" ")}
              fill="none"
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={5}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: on ? 1 : 0 }}
              transition={{ duration: 1.3, ease, delay: on ? 0.4 + i * 0.2 : 0 }}
            />
          ))}
        </g>
        <motion.line
          x1={0}
          x2={chart.w}
          y1={revenueY}
          y2={revenueY}
          stroke={color.ink}
          strokeWidth={2}
          strokeDasharray="10 8"
          initial={false}
          animate={{ opacity: on ? 1 : 0 }}
          transition={{ ...fade, delay: on ? 1.3 : 0 }}
        />
        <text x={chart.w} y={revenueY - 14} fill={color.ink} fontSize={22} textAnchor="end" className="font-mono">
          you receive ${pedal.revenuePerUnit.toFixed(0)} / unit
        </text>
        <line x1={targetX} x2={targetX} y1={0} y2={chart.h} stroke={color.orange} strokeWidth={2} />
        <text x={targetX + 10} y={24} fill={color.orange} fontSize={20} className="font-mono">
          {pedal.quantity} UNITS
        </text>
      </svg>
      <div className="mt-6 flex flex-wrap gap-x-7 gap-y-2">
        {pedal.curves.map((c, i) => (
          <span key={c.label} className="flex items-center gap-2 font-mono text-[20px] text-[#b9b5ac]">
            <span className="h-1 w-6" style={{ backgroundColor: SERIES[i % SERIES.length] }} />
            {c.label}
          </span>
        ))}
      </div>
      <motion.p
        className="mt-7 text-[30px] leading-snug text-[#efeeec]"
        initial={false}
        animate={{ opacity: on ? 1 : 0 }}
        transition={{ ...fade, delay: on ? 1.6 : 0 }}
      >
        {pedal.verdict}
      </motion.p>
    </Show>
  );
}

function Outreach({ on, facts }: { on: boolean; facts: DeckFacts }) {
  const o = facts.pedal.outreach;
  if (!o) return null;
  const spec = [
    ["Process", o.spec.process],
    ["Size", o.spec.dims],
    ["Material", o.spec.material],
    ["Quantities", o.spec.tiers],
    ...(o.spec.target ? [["Target price", `${o.spec.target} / unit`]] : []),
    ["Quote by", o.spec.quoteBy],
  ];
  return (
    <>
      <Show on={on} delay={0.25} className="left-[120px] top-[340px] w-[600px]">
        <div className="border border-[#3a3936] bg-[#111110] p-8">
          <Eyebrow className="text-[#8f8b83]">Spec sheet · what shops see</Eyebrow>
          <dl className="mt-5 flex flex-col">
            {spec.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 border-t border-[#262624] py-3">
                <dt className="shrink-0 font-mono text-[17px] uppercase tracking-[0.12em] text-[#8f8b83]">{k}</dt>
                <dd className="text-right text-[25px] leading-snug text-[#efeeec]">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[22px] leading-snug text-[#8f8b83]">No name, notes or CAD file until you choose to share more.</p>
        </div>
      </Show>
      <Show on={on} delay={0.45} className="left-[780px] top-[340px] w-[1020px]">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-[#8f8b83]">{o.quotes.length} quotes · all-in per unit · tooling · lead</Eyebrow>
          <DemoTag>Demo quotes</DemoTag>
        </div>
        <div className="mt-6 flex flex-col">
          {o.quotes.map((q, i) => (
            <motion.div
              key={q.shop}
              className="grid grid-cols-[1fr_170px_150px_120px] items-baseline gap-4 border-t px-5 py-4"
              initial={false}
              animate={{
                opacity: on ? 1 : 0,
                x: on ? 0 : 24,
                borderColor: q.best ? color.orange : "#262624",
                backgroundColor: q.best ? "#1f130c" : "rgba(0,0,0,0)",
              }}
              transition={{ ...fade, delay: on ? 0.7 + i * 0.12 : 0 }}
            >
              <span className="flex flex-col">
                <span className="text-[28px] font-medium text-[#efeeec]">{q.shop}</span>
                <span className="font-mono text-[17px] uppercase tracking-[0.1em] text-[#8f8b83]">
                  {q.process} · MOQ {q.moq}
                  {q.best && <span className="text-[#ff4a00]"> · best value</span>}
                  {q.fastest && <span className="text-[#5fd39a]"> · fastest</span>}
                </span>
              </span>
              <span className="text-right font-mono text-[26px] tabular-nums text-[#efeeec]">{q.allIn}</span>
              <span className="text-right font-mono text-[22px] tabular-nums text-[#b9b5ac]">{q.tooling}</span>
              <span className="text-right font-mono text-[22px] tabular-nums text-[#b9b5ac]">{q.lead} days</span>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-[26px] leading-snug text-[#b9b5ac]">
          Overseas, Moko drafts each supplier email with negotiation targets. You send it; the app never contacts anyone for you.
        </p>
      </Show>
    </>
  );
}

function Listing({ on, facts }: { on: boolean; facts: DeckFacts }) {
  const l = facts.pedal.listing;
  const plan = facts.pedal.plan;
  if (!l) return null;
  return (
    <Show on={on} delay={0.25} className={panel}>
      <div className="border border-[#3a3936] bg-[#111110] p-10">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-[#8f8b83]">Etsy listing · copy-ready</Eyebrow>
          <span className="font-mono text-[20px] uppercase tracking-[0.12em] text-[#5a5852]">Copy-and-paste today</span>
        </div>
        <p className="mt-6 text-[32px] font-medium leading-snug text-[#efeeec]">{l.title}</p>
        <div className="mt-7 flex items-baseline gap-5">
          <span className="display-type text-[72px] text-[#efeeec]">{l.price}</span>
          <span className="font-mono text-[22px] text-[#8f8b83]">{l.afterFees} after Etsy fees</span>
        </div>
        {plan && (
          <p className="mt-4 font-mono text-[22px] uppercase tracking-[0.12em] text-[#ff4a00]">
            Launch plan · {plan.milestones} dated milestones · launch {plan.launchDate}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-2.5">
          {l.tags.map((tag, i) => (
            <motion.span
              key={tag}
              className="border border-[#3a3936] px-3 py-1 font-mono text-[18px] text-[#b9b5ac]"
              initial={false}
              animate={{ opacity: on ? 1 : 0, y: on ? 0 : 10 }}
              transition={{ ...fade, delay: on ? 0.6 + i * 0.05 : 0 }}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>
    </Show>
  );
}
