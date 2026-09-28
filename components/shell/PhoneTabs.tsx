"use client";

import { Ellipsis, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/components/ui/classes";
import { Logo } from "./Logo";
import { isActive, isMoreActive, NAV_ITEMS, PHONE_TABS, type RecentProduct } from "./nav";
import { NavIcon } from "./NavIcon";
import { SidebarNav } from "./SidebarNav";
import { UsageCard } from "./UsageCard";
import { UserRow } from "./UserRow";

const TAB = "flex h-full flex-1 flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors";
const MORE_ITEMS = NAV_ITEMS.filter((item) => !PHONE_TABS.some((tab) => tab.href === item.href));

/** Phones: the sidebar becomes a bottom tab bar (Home, Products, Ask, More); More opens a sheet with the rest. */
export function PhoneTabs({ recent, limitUsd }: { recent: readonly RecentProduct[]; limitUsd: number }) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsMoreOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMoreOpen]);

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
        <div className="flex h-16">
          {PHONE_TABS.map((tab) => {
            const active = isActive(tab, pathname);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={cx(TAB, active ? "text-accent-ink" : "text-ink-2")}>
                <NavIcon name={tab.icon} />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-expanded={isMoreOpen}
            aria-haspopup="dialog"
            className={cx(TAB, isMoreActive(pathname) ? "text-accent-ink" : "text-ink-2")}
          >
            <Ellipsis aria-hidden size={18} strokeWidth={1.75} />
            More
          </button>
        </div>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button type="button" aria-label="Close menu" onClick={() => setIsMoreOpen(false)} className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85svh] flex-col gap-5 overflow-y-auto rounded-t-card bg-sidebar pb-[max(1rem,env(safe-area-inset-bottom))] shadow-pop">
            <div className="flex items-center justify-between px-6 pt-4">
              <Logo className="h-5 w-auto" />
              <button type="button" onClick={() => setIsMoreOpen(false)} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-control text-ink-2 hover:bg-hover hover:text-ink">
                <X aria-hidden size={18} strokeWidth={1.75} />
              </button>
            </div>
            <SidebarNav items={MORE_ITEMS} recent={recent} onNavigate={() => setIsMoreOpen(false)} />
            <div className="flex flex-col gap-3 px-3">
              <UsageCard limitUsd={limitUsd} />
              <UserRow />
              <Link href="/privacy" onClick={() => setIsMoreOpen(false)} className="type-small px-3 text-muted hover:text-ink">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
