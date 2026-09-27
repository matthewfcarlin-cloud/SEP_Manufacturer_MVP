"use client";

import { motion } from "motion/react";
import { color, ease, fade } from "../motion";
import { CountUp, Display, Eyebrow, Show } from "../parts";
import { traction, type Beat } from "../script";

const SEGMENTS = [
  { tag: "Beachhead", who: "Etsy sellers who've outgrown print-on-demand", why: "Want a product that's really theirs; already pay for tools and know margins" },
  { tag: "Next", who: "Students and first-time founders", why: "Can sketch or model an idea, can't tell if it's makeable or profitable" },
  { tag: "Next", who: "Hobby makers with a 3D printer", why: "Don't know when to switch from printing to CNC or molding" },
  { tag: "Supply", who: "Small local shops", why: "Clear, ready-to-quote small-run requests, like Printify's print providers" },
];

const CHANNELS = [
  { where: "Where first-timers already are", how: "USC groups, Iovine & Young Slack, Discord, X: “Have a product idea but no clue how to make it? Try it free, 5 minutes.”" },
  { where: "Our own launch page", how: "Our waitlist runs on Moko's own landing-page feature (building today): every signup is also a demo" },
  { where: "Every creator brings the next", how: "Creators' launch pages and share cards will carry “Made with Moko”" },
  { where: "Shops follow orders", how: "The creator side works with zero shops; shops join as orders route through" },
];

export const segmentCard = { x: 120, y: 330, w: 400, h: 420, step: 425 };

export function Market({ beat }: { beat: Beat }) {
  const on = beat === "market" || beat === "distribution" || beat === "traction";
  return (
    <>
      <Show on={on} className="left-[120px] top-[96px]">
        <Eyebrow className="text-[#8f8b83]">Target market & distribution</Eyebrow>
      </Show>
      <Show on={beat === "market"} delay={0.1} className="left-[120px] top-[140px]">
        <Display size={62} className="text-[#efeeec]">
          People with an idea who&apos;ve never made one.
        </Display>
      </Show>
      {SEGMENTS.map((s, i) => {
        const lead = i === 0;
        return (
          <motion.div
            key={s.who}
            className="absolute flex flex-col border p-8"
            style={{ left: segmentCard.x + i * segmentCard.step, top: segmentCard.y, width: segmentCard.w, height: segmentCard.h }}
            initial={false}
            animate={{
              opacity: beat === "market" ? 1 : 0,
              y: beat === "market" ? 0 : 40,
              borderColor: lead ? color.orange : "#3a3936",
              backgroundColor: lead ? "#1f130c" : "#111110",
            }}
            transition={{ duration: 0.8, ease, delay: beat === "market" ? 0.25 + i * 0.12 : 0 }}
          >
            <span className="font-mono text-[20px] uppercase tracking-[0.14em]" style={{ color: lead ? color.orange : "#8f8b83" }}>
              {s.tag}
            </span>
            <span className="mt-5 text-[38px] font-semibold leading-tight text-[#efeeec]">{s.who}</span>
            <span className="mt-auto text-[26px] leading-snug text-[#b9b5ac]">{s.why}</span>
          </motion.div>
        );
      })}

      <Show on={beat === "distribution"} delay={0.1} className="left-[120px] top-[140px]">
        <Display size={72} className="text-[#efeeec]">
          Go where first-timers already are.
        </Display>
      </Show>
      {CHANNELS.map((c, i) => (
        <Show key={c.where} on={beat === "distribution"} delay={0.3 + i * 0.15} className="left-[120px] w-[1680px]" style={{ top: 300 + i * 150 }}>
          <div className="flex items-baseline gap-10 border-t border-[#262624] pt-6">
            <span className="w-14 shrink-0 font-mono text-[28px] text-[#ff4a00]">0{i + 1}</span>
            <span className="w-[520px] shrink-0 text-[36px] font-semibold text-[#efeeec]">{c.where}</span>
            <span className="text-[30px] leading-snug text-[#b9b5ac]">{c.how}</span>
          </div>
        </Show>
      ))}

      <Traction on={beat === "traction"} />
    </>
  );
}

function Traction({ on }: { on: boolean }) {
  const filled = traction.signups !== null;
  return (
    <>
      <Show on={on} delay={0.1} className="left-[120px] top-[140px]">
        <Display size={72} className="text-[#efeeec]">
          {filled ? "Traction, from today." : "Today's goal."}
        </Display>
      </Show>
      <Show on={on} delay={0.3} className="left-[120px] top-[330px] flex gap-40">
        <Stat value={traction.signups} goal="20–50" label="signups" />
        <Stat value={traction.ideasRun} goal="5+" label="ideas run end to end" />
      </Show>
      {traction.quote && (
        <Show on={on} delay={0.8} className="left-[120px] top-[720px] max-w-[1600px] border-l-4 border-[#ff4a00] pl-8">
          <p className="text-[40px] leading-snug text-[#efeeec]">“{traction.quote}”</p>
        </Show>
      )}
    </>
  );
}

function Stat({ value, goal, label }: { value: number | null; goal: string; label: string }) {
  return (
    <div>
      <p className="display-type text-[220px] text-[#efeeec]">{value === null ? goal : <CountUp value={value} />}</p>
      <motion.p className="mt-4 font-mono text-[26px] uppercase tracking-[0.14em] text-[#8f8b83]" transition={fade}>
        {label}
      </motion.p>
    </div>
  );
}
