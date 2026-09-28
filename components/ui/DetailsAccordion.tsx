"use client";

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClasses, cx } from "./classes";

type Props = {
  children: ReactNode;
  /** The toggle's words; "See the details" by default. */
  label?: string;
  /** The words while open; "Hide the details" for the default label, otherwise the label itself. */
  openLabel?: string;
  defaultOpen?: boolean;
  /** Anchor id: the accordion opens itself when the URL #hash points inside it. */
  id?: string;
  /** Shown above the toggle, e.g. a card's title and one-line summary. */
  header?: ReactNode;
  className?: string;
};

/**
 * Details accordion (§3): a ghost "See the details" button with a chevron,
 * opening with a 160ms height animation. All tables and raw numbers live here.
 */
const DEFAULT_LABEL = "See the details";

export function DetailsAccordion({ children, label = DEFAULT_LABEL, openLabel, defaultOpen = false, id, header, className }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = `${panelId}-toggle`;
  const shownLabel = isOpen ? (openLabel ?? (label === DEFAULT_LABEL ? "Hide the details" : label)) : label;
  const rootRef = useRef<HTMLDivElement>(null);

  const openForHash = useCallback(() => {
    const hash = window.location.hash && decodeURIComponent(window.location.hash.slice(1));
    const target = hash ? document.getElementById(hash) : null;
    if (!target || !rootRef.current?.contains(target)) return;
    setIsOpen(true);
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }, []);

  useEffect(() => {
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, [openForHash]);

  return (
    <div ref={rootRef} id={id} className={cx("scroll-mt-20", className)}>
      {header}
      <button id={buttonId} type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setIsOpen((o) => !o)} className={buttonClasses({ variant: "ghost", size: "sm", className: "-ml-3.5 self-start" })}>
        {shownLabel}
        <ChevronDown aria-hidden size={18} strokeWidth={1.75} className={cx("transition-transform", isOpen && "rotate-180")} />
      </button>
      {/* 0fr → 1fr animates the height without measuring it. */}
      <div id={panelId} role="region" aria-labelledby={buttonId} className={cx("grid transition-[grid-template-rows] motion-reduce:transition-none", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        {/* Hidden from assistive tech and search once closed; visibility flips after the 160ms close. */}
        <div className={cx("min-h-0 overflow-hidden transition-[visibility] motion-reduce:transition-none", !isOpen && "invisible")} inert={!isOpen}>
          <div className="flex flex-col gap-6 pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
