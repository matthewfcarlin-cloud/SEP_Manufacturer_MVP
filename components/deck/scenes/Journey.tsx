"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import render0 from "@/demo/renders/pedal-render-0.png";
import render1 from "@/demo/renders/pedal-render-1.png";
import render2 from "@/demo/renders/pedal-render-2.png";
import render3 from "@/demo/renders/pedal-render-3.png";
import type { DeckFacts } from "@/lib/deckFacts";
import { color, ease, fade, move, pick } from "../motion";
import { rail, STAGES, stageX } from "../layout";
import { DemoTag, Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

// The landing page's anodized pedal, turning live. WebGL only exists in the browser.
const HeroScene = dynamic(() => import("@/components/home/HeroScene"), { ssr: false });

const RENDERS = [render0, render1, render2, render3];

/** Which stage of the creator journey each beat is on; -1 shows the rail with no stage active. */
const activeStage: Partial<Record<Beat, number>> = {
  upload: 0,
  design: 1,
  make: 2,
  money: 3,
  launch: 4,
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
  upload: { x: 940, y: 250, scale: 1.05, opacity: 1 },
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
  make: "Matched to a machine that's free.",
  money: "Does it make money?",
  launch: "A plan and a pitch.",
  sell: "Ready to sell.",
};

export function Journey({ beat, facts }: { beat: Beat; facts: DeckFacts }) {
  const { pedal } = facts;
  return (
    <>
      <Show on={beat === "upload"} delay={0.3} className="left-[120px] top-[330px] w-[800px]">
        <Display size={120} className="text-[#efeeec]">
          Bring an idea.
        </Display>
        <p className="mt-8 font-mono text-[26px] uppercase tracking-[0.14em] text-[#8f8b83]">CAD · photos · a sketch · notes</p>
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

      <Paths on={beat === "design"} facts={facts} />
      <Match on={beat === "make"} facts={facts} />
      <Money on={beat === "money"} facts={facts} />
      <Launch on={beat === "launch"} facts={facts} />
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
          <Eyebrow className="text-[#8f8b83]">Top shop match</Eyebrow>
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
              Idle this month
            </motion.span>
          )}
        </div>
        <ul className="mt-7 flex flex-col gap-3">
          {m.reasons.map((r, i) => (
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

function Launch({ on, facts }: { on: boolean; facts: DeckFacts }) {
  const plan = facts.pedal.plan;
  return (
    <>
      {RENDERS.map((src, i) => (
        <motion.div
          key={src.src}
          className="absolute overflow-hidden bg-[#f3f2ee]"
          style={{ left: 120 + i * 430, top: 350, width: 400, height: 300 }}
          initial={false}
          animate={{ opacity: on ? 1 : 0, y: on ? 0 : 40, rotate: on ? 0 : (i - 1.5) * 4, scale: on ? 1 : 0.9 }}
          transition={{ duration: 0.9, ease, delay: on ? 0.2 + i * 0.12 : 0 }}
        >
          <Image src={src} alt="" fill sizes="400px" className="object-cover" />
        </motion.div>
      ))}
      <Show on={on} delay={0.3} className="left-[120px] top-[676px]">
        <Eyebrow className="text-[#8f8b83]">Studio renders · licensing pitch · 30-second storyboard · PDF · private share link</Eyebrow>
      </Show>
      {plan && (
        <Show on={on} delay={0.5} className="left-[120px] top-[760px] w-[1690px]">
          <div className="relative h-[150px]">
            {plan.milestones.map((m, i) => (
              <motion.div
                key={m.title}
                className="absolute top-0 h-11 origin-left"
                style={{
                  left: `${(m.from / plan.totalDays) * 100}%`,
                  width: `${(Math.max(m.days, 1) / plan.totalDays) * 100}%`,
                  backgroundColor: i % 2 ? "#3a3936" : "#5a5852",
                }}
                initial={false}
                animate={{ scaleX: on ? 1 : 0 }}
                transition={{ duration: 0.5, ease, delay: on ? 0.8 + i * 0.12 : 0 }}
              />
            ))}
            <div className="absolute right-0 top-0 flex h-11 items-center gap-3 translate-x-full pl-4">
              <span className="size-4 rotate-45 bg-[#ff4a00]" />
            </div>
            <div className="absolute inset-x-0 top-16 flex justify-between font-mono text-[22px] uppercase tracking-[0.12em]">
              <span className="text-[#8f8b83]">Today · {plan.milestones.length} milestones</span>
              <span className="text-[#ff4a00]">Launch {plan.launchDate}</span>
            </div>
          </div>
        </Show>
      )}
    </>
  );
}

function Listing({ on, facts }: { on: boolean; facts: DeckFacts }) {
  const l = facts.pedal.listing;
  if (!l) return null;
  return (
    <Show on={on} delay={0.25} className={panel}>
      <div className="border border-[#3a3936] bg-[#111110] p-10">
        <div className="flex items-center justify-between">
          <Eyebrow className="text-[#8f8b83]">Etsy listing · copy-ready</Eyebrow>
          <span className="font-mono text-[20px] uppercase tracking-[0.12em] text-[#5a5852]">Direct publish: coming soon</span>
        </div>
        <p className="mt-6 text-[32px] font-medium leading-snug text-[#efeeec]">{l.title}</p>
        <div className="mt-7 flex items-baseline gap-5">
          <span className="display-type text-[72px] text-[#efeeec]">{l.price}</span>
          <span className="font-mono text-[22px] text-[#8f8b83]">{l.afterFees} after Etsy fees</span>
        </div>
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
