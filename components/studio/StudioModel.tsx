"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "lucide-react";
import { cx } from "@/components/ui/classes";
import { ModelViewer } from "@/components/viewer";

/** A slow turntable: roughly one revolution a minute. */
const CARD_ROTATE_SPEED = 0.5;

type Props = { url?: string; still?: string; name: string; /** Sizes the stage; 16:10 by default. */ className?: string };

/**
 * The card's live model. The WebGL view only mounts while the card is on
 * screen (browsers cap live WebGL contexts), and a saved render or skeleton
 * holds the space until the model has loaded, so nothing shifts.
 */
export function StudioModel({ url, still, name, className = "aspect-[16/10]" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const reduceMotion = useReducedMotion();
  const markReady = useCallback(() => setIsReady(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cx("relative overflow-hidden", className)}>
      {!isReady &&
        (still ? (
          // eslint-disable-next-line @next/next/no-img-element -- saved studio render served by our own API
          <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : url ? (
          <div aria-hidden className="absolute inset-0 skeleton rounded-none" />
        ) : (
          // No 3D file yet (a description was enough to start): a friendly box instead of a model.
          <div aria-hidden className="absolute inset-0 grid place-items-center text-muted">
            <Box size={40} strokeWidth={1.5} />
          </div>
        ))}
      {url && isVisible && (
        // The viewer's own wrapper is `relative`, so position a box for it to fill.
        <div className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${isReady ? "opacity-100" : "opacity-0"}`}>
          <ModelViewer
            url={url}
            autoRotate={!reduceMotion}
            rotateSpeed={CARD_ROTATE_SPEED}
            enableZoom={false}
            showLoading={false}
            onReady={markReady}
            className="h-full w-full !border-0 !bg-transparent"
          />
        </div>
      )}
      <span className="sr-only">3D model of {name}</span>
    </div>
  );
}
