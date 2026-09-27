"use client";

import { AnimatePresence, motion } from "motion/react";
import { color, ease, fade } from "../motion";
import { Display, Eyebrow, Show } from "../parts";
import type { Beat } from "../script";

type Card = { who: string; does: string; money?: string };

// The same four cards tell both stories, so the Moko version reads as
// "Printify's flow, with the factory step made possible for original products".
const FLOWS: Record<"printify" | "original", Card[]> = {
  printify: [
    { who: "You", does: "List a shirt on Etsy or Shopify", money: "sells for $25" },
    { who: "Customer", does: "Orders it from your store", money: "pays you $25" },
    { who: "Printify", does: "Routes the order to a print provider", money: "charges you $8 + shipping" },
    { who: "Print provider", does: "Prints it and ships it to your customer" },
  ],
  original: [
    { who: "You", does: "Design an original product with Moko", money: "priced from your business case" },
    { who: "Customer", does: "Orders it from your store" },
    { who: "Moko", does: "Routes the order to a matched local shop", money: "a small fee per order" },
    { who: "Local shop", does: "Makes it and ships it to your customer", money: "found and contacted for you" },
  ],
};

export const flowCard = { x: 120, y: 380, w: 380, h: 330, step: 430 };

export function Printify({ beat }: { beat: Beat }) {
  const on = beat === "printify" || beat === "original";
  const flow = beat === "original" ? "original" : "printify";
  return (
    <>
      <Show on={beat === "printify"} className="left-[120px] top-[120px]">
        <Eyebrow className="text-[#8f8b83]">A model that already works</Eyebrow>
        <Display size={76} className="mt-5 text-[#efeeec]">
          Printify hid the factory for merch.
        </Display>
      </Show>
      <Show on={beat === "original"} className="left-[120px] top-[120px]">
        <Eyebrow className="text-[#8f8b83]">The vision · in today&apos;s demo, shop quotes are simulated</Eyebrow>
        <Display size={76} className="mt-5 text-[#efeeec]">
          Moko does it for <span className="text-[#ff4a00]">original products.</span>
        </Display>
      </Show>

      {FLOWS[flow].map((card, i) => {
        const moko = flow === "original" && card.who === "Moko";
        return (
          <motion.div
            key={i}
            className="absolute flex flex-col border p-8"
            style={{ left: flowCard.x + i * flowCard.step, top: flowCard.y, width: flowCard.w, height: flowCard.h }}
            initial={false}
            animate={{
              opacity: on ? 1 : 0,
              y: on ? 0 : 40,
              backgroundColor: moko ? "#1f130c" : "#111110",
              borderColor: moko ? color.orange : "#3a3936",
            }}
            transition={{ duration: 0.8, ease, delay: on ? 0.2 + i * 0.12 : 0 }}
          >
            <span className="font-mono text-[22px] text-[#ff4a00]">0{i + 1}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${flow}-${i}`}
                className="mt-5 flex flex-1 flex-col"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ ...fade, delay: 0.1 + i * 0.1 }}
              >
                <span className="display-type text-[44px] text-[#efeeec]">{card.who}</span>
                <span className="mt-4 text-[30px] leading-snug text-[#b9b5ac]">{card.does}</span>
                {card.money && (
                  <span className="mt-auto font-mono text-[22px] uppercase tracking-[0.1em] text-[#efeeec]">{card.money}</span>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* An order travelling through the flow, card to card, on a loop. */}
      <motion.div className="pointer-events-none absolute left-0 top-0" initial={false} animate={{ opacity: on ? 1 : 0 }} transition={fade}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute font-mono text-[40px] text-[#5a5852]"
            style={{ left: flowCard.x + flowCard.w + i * flowCard.step + 8, top: flowCard.y + flowCard.h / 2 - 28 }}
          >
            →
          </span>
        ))}
        {on && (
          <motion.span
            className="absolute size-5 rounded-full"
            style={{ top: flowCard.y + flowCard.h + 34, backgroundColor: color.orange, boxShadow: `0 0 18px ${color.orange}` }}
            initial={{ x: flowCard.x + flowCard.w / 2 }}
            animate={{ x: [0, 1, 2, 3].map((i) => flowCard.x + flowCard.w / 2 + i * flowCard.step) }}
            transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
          />
        )}
        <div
          className="absolute h-[2px] bg-[#262624]"
          style={{ left: flowCard.x + flowCard.w / 2, width: 3 * flowCard.step, top: flowCard.y + flowCard.h + 43 }}
        />
      </motion.div>

      <Show on={beat === "printify"} delay={0.9} className="left-[120px] top-[820px]">
        <Display size={48} className="text-[#efeeec]">
          You never touch the factory. <span className="text-[#8f8b83]">But it only works for catalog products.</span>
        </Display>
      </Show>
      <Show on={beat === "original"} delay={0.9} className="left-[120px] top-[820px]">
        <Display size={48} className="text-[#efeeec]">
          Same model. <span className="text-[#ff4a00]">The hard part, the factory, checked before you sell.</span>
        </Display>
      </Show>
    </>
  );
}
