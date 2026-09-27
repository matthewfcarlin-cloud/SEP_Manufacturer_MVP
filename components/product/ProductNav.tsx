"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The product's stage screens. Plan and Sell join as they're built. */
const TABS = [
  { href: "", label: "Design & money" },
  { href: "/make", label: "Make" },
  { href: "/launch", label: "Launch" },
] as const;

export function ProductNav({ projectId, projectName }: { projectId: string; projectName: string }) {
  const pathname = usePathname();
  const base = `/project/${projectId}`;
  return (
    <nav aria-label={`${projectName} screens`} className="border-b border-line bg-surface/60 print:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
        <Link href="/studio" className="eyebrow shrink-0 py-3 pr-3 text-[11px] text-muted hover:text-ink">
          Studio /
        </Link>
        {TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const isActive = tab.href === "" ? pathname === base || pathname.startsWith(`${base}/compare`) || pathname.startsWith(`${base}/versions`) : pathname.startsWith(href);
          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`eyebrow shrink-0 border-b-2 px-3 py-3 text-[11px] ${isActive ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
