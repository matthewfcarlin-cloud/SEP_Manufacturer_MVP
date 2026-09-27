"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "idlefit:own-key-prompt-dismissed";

/** One slim, dismissible line under the app's top bar: bring your own API key instead of the demo budget. */
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
    <aside aria-label="Demo budget notice" className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 text-sm sm:px-6">
      <p className="min-w-0 text-muted">
        Using the demo AI budget ·{" "}
        <Link href="/settings" className="font-medium text-ink underline-offset-4 hover:underline">
          Add your own key
        </Link>
      </p>
      <button type="button" onClick={dismiss} aria-label="Not now" className="grid h-7 w-7 shrink-0 place-items-center text-muted hover:text-ink">
        ×
      </button>
    </aside>
  );
}
