"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { ease, fade } from "./motion";

type ShowProps = {
  on: boolean;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  /** Where it rises from (px) when it appears, and drifts to when it leaves. */
  from?: number;
  children: ReactNode;
};

/** A block that fades and rises in when `on`, and drifts out when not. Stays mounted. */
export function Show({ on, className = "", style, delay = 0, from = 28, children }: ShowProps) {
  return (
    <motion.div
      className={`absolute ${className}`}
      style={style}
      initial={false}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : from, pointerEvents: on ? "auto" : "none" }}
      transition={{ ...fade, delay: on ? delay : 0 }}
      aria-hidden={!on}
    >
      {children}
    </motion.div>
  );
}

type CountUpProps = { value: number; prefix?: string; suffix?: string; decimals?: number; duration?: number };

/** Counts from wherever it last was to `value`, so a number can tick down as well as up. */
export function CountUp({ value, prefix = "", suffix = "", decimals = 0, duration = 1.4 }: CountUpProps) {
  const count = useMotionValue(0);
  const text = useTransform(
    count,
    (n) =>
      `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`,
  );
  useEffect(() => {
    const controls = animate(count, value, { duration, ease });
    return () => controls.stop();
  }, [count, value, duration]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

/** Mono spec-sheet caption, sized for the 1920-wide canvas. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-[22px] font-medium uppercase tracking-[0.14em] ${className}`}>{children}</p>;
}

/** Huge uppercase Archivo, the site's display face. */
export function Display({ children, size, className = "" }: { children: ReactNode; size: number; className?: string }) {
  return (
    <h2 className={`display-type ${className}`} style={{ fontSize: size }}>
      {children}
    </h2>
  );
}

export function DemoTag({ children = "Demo data · fictional shops" }: { children?: ReactNode }) {
  return (
    <span className="inline-block border border-[#7a5a1a] bg-[#2e2410] px-3 py-1 font-mono text-[18px] uppercase tracking-[0.12em] text-[#f2c36b]">
      {children}
    </span>
  );
}
