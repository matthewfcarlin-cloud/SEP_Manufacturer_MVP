"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { canvas, color } from "./motion";

function fitScale(): number {
  return Math.min(window.innerWidth / canvas.w, window.innerHeight / canvas.h);
}

// A faint drafting grid, so the dark stage reads as a spec sheet rather than a void.
const grid = `linear-gradient(${color.line} 1px, transparent 1px), linear-gradient(90deg, ${color.line} 1px, transparent 1px)`;

/** Lays every slide out on a fixed 1920×1080 canvas and scales it to fit the window, letterboxed. */
export function Stage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const update = () => setScale(fitScale());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden" style={{ background: "#050505" }}>
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: canvas.w,
          height: canvas.h,
          transform: `scale(${scale})`,
          visibility: scale ? "visible" : "hidden",
          backgroundColor: color.stage,
          color: color.ink,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: grid, backgroundSize: "120px 120px", backgroundPosition: "-1px -1px" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgb(0 0 0 / 0.6))" }}
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}
