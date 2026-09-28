"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { answerActions } from "@/lib/agent/answerFormat";
import { agentPageFor, PAGE_STARTERS } from "@/lib/agent/pages";
import { AiUsageFooter } from "./AiUsageFooter";
import { ChatThread } from "./ChatThread";
import { useAgentChat } from "./useAgentChat";
import { PanelRightClose, Sparkles } from "lucide-react";
import { buttonClasses } from "@/components/ui/classes";

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

type Props = { projectId: string; projectName: string; version: number; hasAnalysis: boolean; hasTweaks: boolean; hasQuotes: boolean };

/**
 * Ask Moko on product pages: docked on the right of wide screens (collapsible
 * to a floating button, remembered), an overlay on smaller ones. It knows the
 * product and which page is open, and the conversation carries across pages.
 */
export function AskMokoPanel({ projectId, projectName, version, hasAnalysis, hasTweaks, hasQuotes }: Props) {
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
        className={`${buttonClasses({ className: "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 rounded-pill shadow-pop print:hidden lg:bottom-5 lg:right-5" })} ${isSheetOpen ? "hidden" : "flex"} ${isDockClosed ? "xl:flex" : "xl:hidden"}`}
      >
        <Sparkles aria-hidden size={18} strokeWidth={1.75} />
        Ask Moko
      </button>

      <aside
        aria-label="Ask Moko"
        className={`z-50 flex-col border-border bg-surface print:hidden max-xl:fixed max-xl:inset-0 max-xl:shadow-pop sm:max-xl:left-auto sm:max-xl:w-[420px] xl:sticky xl:top-0 xl:h-svh xl:w-[360px] xl:shrink-0 xl:border-l ${isSheetOpen ? "flex" : "hidden"} ${isDockClosed ? "xl:hidden" : "xl:flex"}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-accent text-white">
              <Sparkles size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="type-h3">Ask Moko</h2>
              <p className="type-small truncate text-muted">Knows about {projectName}</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close Ask Moko" title="Collapse" className="grid h-9 w-9 shrink-0 place-items-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink">
            <PanelRightClose aria-hidden size={18} strokeWidth={1.75} />
          </button>
        </header>
        <ChatThread
          chat={chat}
          inputId="ask-moko-input"
          autoFocus={isSheetOpen}
          starters={PAGE_STARTERS[page]}
          greeting={<p>Hi! Ask me anything about {projectName}.</p>}
          actionsFor={(answer) => answerActions(answer, { projectId, version, hasAnalysis, hasTweaks, hasQuotes })}
          footer={<AiUsageFooter />}
        />
      </aside>
    </>
  );
}
