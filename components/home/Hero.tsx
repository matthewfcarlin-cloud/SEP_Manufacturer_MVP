"use client";

import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

// WebGL only exists in the browser.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

const EASE = [0.2, 0.7, 0.1, 1] as const;
/** The part sits centered in its circle rather than off to the right. */
const CENTERED: [number, number, number] = [0, -0.2, 0];

type Props = { exampleHref: string | null };

/** The landing page's one big moment (§4): the headline, and the real demo part turning on a soft circle. */
export function Hero({ exampleHref }: Props) {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: EASE, delay },
  });

  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden">
      <div className="mx-auto grid max-w-content items-center gap-10 page-pad pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <div className="flex flex-col gap-6">
          <motion.h1 id="hero-heading" className="type-display" {...rise(0)}>
            Turn your idea into a product <span className="text-accent-ink">you can sell.</span>
          </motion.h1>
          <motion.p className="max-w-xl text-[17px] leading-relaxed text-ink-2" {...rise(0.12)}>
            Bring a 3D file, a few photos or just an idea. Moko shows you how to make it, what it costs,
            what to charge, and gets your listing ready.
          </motion.p>
          <motion.div className="flex flex-col gap-3 sm:flex-row" {...rise(0.24)}>
            <ButtonLink href="/new" size="lg" iconRight={ArrowRight}>
              Start your product
            </ButtonLink>
            {exampleHref && (
              <ButtonLink href={exampleHref} size="lg" variant="secondary">
                See an example product
              </ButtonLink>
            )}
          </motion.div>
          <motion.div {...rise(0.36)}>
            <Link href="/privacy" className="type-small inline-flex items-center gap-2 rounded-control text-ink-2 hover:text-ink">
              <ShieldCheck aria-hidden size={18} strokeWidth={1.75} className="text-green-ink" />
              Private by default. Your 3D file is never sent to the AI.
            </Link>
          </motion.div>
        </div>

        {/* The part turns on a soft circle; it holds still when motion is reduced. */}
        <motion.div
          aria-hidden
          className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[420px] lg:max-w-[520px]"
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        >
          <div className="absolute inset-0 rounded-pill bg-sidebar" />
          <div className="absolute inset-0">
            <HeroScene offset={CENTERED} distance={5.6} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
