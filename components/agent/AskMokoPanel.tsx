"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AGENT_PAGE_LABELS, agentPageFor, PAGE_STARTERS } from "@/lib/agent/pages";
import { ChatThread } from "./ChatThread";
import { useAgentChat } from "./useAgentChat";

const DOCK_KEY = "moko:ask-docked";
const WIDE = "(min-width: 1280px)";

// Whether the docked panel is closed on wide screens: a per-browser convenience.
const readDockClosed = () => {
  try {
    return window.localStorage.getItem(DOCK_KEY) === "closed";
  } catch {
    return false;
  }
};
const dockListeners = new Set<() => void>();
const subscribeDock = (fn: () => void) => {
  dockListeners.add(fn);
  return () => dockListeners.delete(fn);
};
const setDockClosed = (closed: boolean) => {
  try {
    window.localStorage.setItem(DOCK_KEY, closed ? "closed" : "open");
  } catch {
    // Not saved; it still toggles for this page view.
  }
  dockListeners.forEach((fn) => fn());
};

type Props = { projectId: string; projectName: string; version: number; stageLabel: string };

/**
 * Ask Moko on product pages: docked on the right of wide screens (collapsible
 * to a floating button, remembered), an overlay on smaller ones. It knows the
 * product and which page is open, and the conversation carries across pages.
 */
export function AskMokoPanel({ projectId, projectName, version, stageLabel }: Props) {
  const pathname = usePathname();
  const page = agentPageFor(pathname);
  const isDockClosed = useSyncExternalStore(subscribeDock, readDockClosed, () => false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const chat = useAgentChat("/api/agent", () => ({ projectId, version, page }));

  useEffect(() => {
    if (!isSheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSheetOpen]);

  const isWide = () => window.matchMedia(WIDE).matches;
  const open = () => (isWide() ? setDockClosed(false) : setIsSheetOpen(true));
  const close = () => (isWide() ? setDockClosed(true) : setIsSheetOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`fixed bottom-5 right-5 z-40 items-center gap-2 bg-ink px-5 py-3 text-sm font-medium text-bg shadow-lg hover:opacity-90 print:hidden ${
          isSheetOpen ? "hidden" : "flex"
        } ${isDockClosed ? "xl:flex" : "xl:hidden"}`}
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
        Ask Moko
      </button>

      <aside
        aria-label="Ask Moko"
        className={`z-50 flex-col border-line bg-bg print:hidden max-xl:fixed max-xl:inset-0 max-xl:shadow-2xl sm:max-xl:left-auto sm:max-xl:w-[420px] sm:max-xl:border-l xl:sticky xl:top-14 xl:h-[calc(100svh-3.5rem)] xl:w-[380px] xl:shrink-0 xl:border-l ${
          isSheetOpen ? "flex" : "hidden"
        } ${isDockClosed ? "xl:hidden" : "xl:flex"}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            <p className="eyebrow text-[11px] text-accent">
              Ask Moko <span className="text-muted">· {AGENT_PAGE_LABELS[page]}</span>
            </p>
            <h2 className="mt-1 truncate font-semibold">{projectName}</h2>
          </div>
          <button type="button" onClick={close} aria-label="Close Ask Moko" className="px-2 py-1 text-lg text-muted hover:text-ink">
            ×
          </button>
        </header>
        <ChatThread
          chat={chat}
          inputId="ask-moko-input"
          autoFocus={isSheetOpen}
          starters={PAGE_STARTERS[page]}
          greeting={
            <p>
              Hi! I know <span className="font-semibold">{projectName}</span>&apos;s numbers and that you&apos;re on the{" "}
              <span className="font-semibold">{AGENT_PAGE_LABELS[page]}</span> page{stageLabel && <> (it&apos;s at the {stageLabel} stage)</>}. Ask
              me anything, in your own words.
            </p>
          }
          footer={
            <>
              Answers use this product&apos;s AI estimates; shops are demo data. Uses your AI budget ·{" "}
              <Link href="/settings" className="underline hover:text-ink">
                use your own key
              </Link>
            </>
          }
        />
      </aside>
    </>
  );
}
