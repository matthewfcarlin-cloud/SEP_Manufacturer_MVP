"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { DeckFacts } from "@/lib/deckFacts";
import { color, ease, fade } from "./motion";
import { Cells } from "./scenes/Cells";
import { Logo, Ring } from "./scenes/Brand";
import { Journey, Pedal, Rail } from "./scenes/Journey";
import { Market } from "./scenes/Market";
import { Problem, Questions, Title } from "./scenes/Opening";
import { Printify } from "./scenes/Printify";
import { Appendix, Business, Close, Demo, Field, WhyNow } from "./scenes/Story";
import { Tech } from "./scenes/Tech";
import { notes, outline, slides } from "./script";
import { Stage } from "./Stage";
import { advance, last, progress, retreat, start, toSearch, type Position } from "./timeline";
import { useDeckControls } from "./useDeckControls";

/**
 * The Moko pitch. Arrow keys, space or a clicker step through beats; F goes
 * fullscreen; N shows the speaker notes. The URL tracks the position, so a
 * reload (or a link) lands on the same beat.
 */
export function Deck({ initial, facts }: { initial: Position; facts: DeckFacts }) {
  const [position, setPosition] = useState(initial);
  const [showNotes, setShowNotes] = useState(false);

  const commands = useMemo(
    () => ({
      next: () => setPosition((p) => advance(p, outline)),
      previous: () => setPosition((p) => retreat(p, outline)),
      first: () => setPosition(start),
      last: () => setPosition(last(outline)),
      notes: () => setShowNotes((shown) => !shown),
    }),
    [],
  );
  useDeckControls(commands);

  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${toSearch(position)}`);
  }, [position]);

  // The site's own scrollbar would otherwise peek out beside the fixed stage.
  useEffect(() => {
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, []);

  const beat = slides[position.slide].beats[position.beat];

  return (
    <MotionConfig reducedMotion="user">
      <div className="select-none" onClick={commands.next}>
        <h1 className="sr-only">Moko pitch deck</h1>
        <p className="sr-only" aria-live="polite">
          {`Slide ${position.slide + 1} of ${slides.length}. ${notes[beat]}`}
        </p>
        <Stage>
          <Cells beat={beat} />
          <Rail beat={beat} />
          <Pedal beat={beat} facts={facts} />
          <Title beat={beat} />
          <Problem beat={beat} />
          <Questions beat={beat} />
          <Printify beat={beat} />
          <Journey beat={beat} facts={facts} />
          <Demo beat={beat} />
          <Tech beat={beat} />
          <Market beat={beat} />
          <Field beat={beat} />
          <WhyNow beat={beat} />
          <Business beat={beat} />
          <Close beat={beat} />
          <Appendix beat={beat} />
          <Logo beat={beat} />
          <Ring beat={beat} />

          <motion.div
            className="absolute bottom-0 left-0 h-[5px] origin-left"
            style={{ width: "100%", backgroundColor: color.orange }}
            initial={false}
            animate={{ scaleX: progress(position, outline) }}
            transition={{ duration: 0.8, ease }}
          />
          <p className="absolute bottom-6 right-10 font-mono text-[18px] tabular-nums tracking-[0.14em] text-[#5a5852]">
            {String(position.slide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </p>

          <AnimatePresence>
            {showNotes && (
              <motion.div
                key="notes"
                className="absolute inset-x-10 bottom-10 border border-[#3a3936] bg-[#0a0a0a]/95 px-10 py-7"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={fade}
              >
                <p className="font-mono text-[18px] uppercase tracking-[0.14em] text-[#8f8b83]">
                  Speaker notes · {slides[position.slide].id} · beat {position.beat + 1}/{outline[position.slide]} · N to hide
                </p>
                <p className="mt-3 text-[34px] leading-snug text-[#efeeec]">{notes[beat]}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Stage>
      </div>
    </MotionConfig>
  );
}
