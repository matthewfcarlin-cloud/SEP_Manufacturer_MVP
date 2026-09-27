"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { HeaderAiPill } from "@/components/HeaderAiPill";
import logo from "@/public/brand/moko-logo-night.png";
import { titleFor, type RecentProduct } from "./nav";
import { NavIcon } from "./NavIcon";
import { SidebarNav } from "./SidebarNav";

const COLLAPSED_KEY = "moko:sidebar-collapsed";

// The collapsed choice is a per-browser convenience; storage can be missing or blocked.
const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const writeCollapsed = (value: boolean) => {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {
    // Not saved; the sidebar still toggles for this page view.
  }
  listeners.forEach((fn) => fn());
};

type Props = { recent: readonly RecentProduct[]; productNames: Readonly<Record<string, string>>; idleMachines: number; children: ReactNode };

/** The app shell: a collapsible left sidebar (a bottom sheet on phones), a top bar, and the page. */
export function AppFrame({ recent, productNames, idleMachines, children }: Props) {
  const pathname = usePathname();
  const isCollapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const title = titleFor(pathname, productNames);

  useEffect(() => {
    if (!isSheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsSheetOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSheetOpen]);

  return (
    <div className="flex min-h-svh">
      <aside
        aria-label="Main"
        className={`sticky top-0 hidden h-svh shrink-0 flex-col justify-between border-r border-night-line bg-night text-night-ink lg:flex ${
          isCollapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex flex-col gap-8 py-4">
          <div className={`flex items-center ${isCollapsed ? "flex-col gap-3" : "justify-between px-4"}`}>
            <Link href="/" className="flex h-9 items-center">
              {isCollapsed ? (
                <span aria-label="Moko" className="display-type text-xl text-night-accent">M</span>
              ) : (
                <Image src={logo} alt="Moko" priority className="h-6 w-auto" />
              )}
            </Link>
            <button
              type="button"
              onClick={() => writeCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
              className="grid h-8 w-8 place-items-center border border-night-line text-night-muted hover:text-night-ink"
            >
              <NavIcon name="collapse" className={`h-3.5 w-3.5 ${isCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>
          <SidebarNav recent={recent} isCollapsed={isCollapsed} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col gap-3 border-t border-night-line px-4 py-4">
            <p className="eyebrow flex items-center gap-2 text-[10px] text-night-muted">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-night-idle" />
              {idleMachines} machines idle in LA · demo
            </p>
            <Link href="/privacy" className="eyebrow text-[10px] text-night-muted hover:text-night-ink">
              Privacy
            </Link>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-night-line bg-night/95 text-night-ink backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              aria-label="Open menu"
              aria-expanded={isSheetOpen}
              className="grid h-9 w-9 shrink-0 place-items-center border border-night-line text-night-muted hover:text-night-ink lg:hidden"
            >
              <NavIcon name="menu" />
            </button>
            <p className="eyebrow min-w-0 flex-1 truncate text-[11px] text-night-ink sm:text-xs">{title}</p>
            <HeaderAiPill />
            <Link
              href="/new"
              aria-label="New product"
              className="eyebrow flex shrink-0 items-center gap-1.5 whitespace-nowrap bg-night-accent px-3 py-2 text-[11px] text-night hover:opacity-90"
            >
              <span aria-hidden className="text-base leading-none">+</span>
              <span className="hidden sm:inline">New product</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>

      {isSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setIsSheetOpen(false)} className="absolute inset-0 bg-night/60" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto border-t border-night-line bg-night pb-[max(1rem,env(safe-area-inset-bottom))] text-night-ink">
            <div className="flex items-center justify-between px-4 py-3">
              <Image src={logo} alt="Moko" className="h-5 w-auto" />
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center border border-night-line text-night-muted hover:text-night-ink"
              >
                <NavIcon name="close" />
              </button>
            </div>
            <div className="px-1 pb-2">
              <SidebarNav recent={recent} onNavigate={() => setIsSheetOpen(false)} />
            </div>
            <div className="flex items-center justify-between border-t border-night-line px-4 pt-3">
              <p className="eyebrow flex items-center gap-2 text-[10px] text-night-muted">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-night-idle" />
                {idleMachines} machines idle in LA · demo
              </p>
              <Link href="/privacy" onClick={() => setIsSheetOpen(false)} className="eyebrow text-[10px] text-night-muted hover:text-night-ink">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
