"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "idlefit:own-key-prompt-dismissed";

/** One-time, dismissible nudge on the studio: bring your own API key instead of the demo budget. */
export function OwnKeyPrompt() {
  // Hidden until we know it wasn't dismissed, so it never flashes in and out.
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
      setIsVisible(window.localStorage.getItem(DISMISSED_KEY) !== "1");
    } catch {
      setIsVisible(true); // storage blocked: show it; dismissing then lasts for this page view
    }
  }, []);

  if (!isVisible) return null;
  const dismiss = () => {
    setIsVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode or blocked storage: it just shows again next visit.
    }
  };

  return (
    <aside aria-label="Use your own API key" className="flex flex-wrap items-center justify-between gap-4 border border-line border-l-4 border-l-accent bg-surface px-5 py-4">
      <div className="max-w-2xl">
        <p className="font-semibold">Use your own API key</p>
        <p className="text-sm text-muted">AI features run on a small shared demo budget. Add your own Anthropic or OpenAI key to keep going without limits; calls are billed to your provider account.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/settings" className="bg-ink px-4 py-2 text-sm font-medium text-bg hover:opacity-90">
          Add your key
        </Link>
        <button type="button" onClick={dismiss} className="px-3 py-2 text-sm text-muted hover:text-ink">
          Not now
        </button>
      </div>
    </aside>
  );
}
