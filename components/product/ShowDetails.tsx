"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = { id: string; title: string; teaser?: ReactNode; children: ReactNode; defaultOpen?: boolean };

/**
 * A section whose numbers sit behind "Show details". It opens itself when a
 * link points at something inside it (e.g. the Next step's #business-case-heading).
 */
export function ShowDetails({ id, title, teaser, children, defaultOpen = false }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const openForHash = () => {
      const target = window.location.hash && document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      if (target && ref.current?.contains(target) && !ref.current.open) {
        ref.current.open = true;
        requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
      }
    };
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, []);

  return (
    // Browsers open a closed <details> themselves when the URL #hash points inside it.
    <details ref={ref} id={id} open={defaultOpen} suppressHydrationWarning className="group scroll-mt-20 border border-line bg-surface">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold">{title}</span>
          {teaser && <span className="text-sm text-muted">{teaser}</span>}
        </span>
        <span className="eyebrow shrink-0 border border-line px-3 py-1.5 text-[11px] group-open:border-ink">
          <span className="group-open:hidden">Show details</span>
          <span className="hidden group-open:inline">Hide details</span>
        </span>
      </summary>
      <div className="flex flex-col gap-6 border-t border-line bg-bg p-4 sm:p-6">{children}</div>
    </details>
  );
}
