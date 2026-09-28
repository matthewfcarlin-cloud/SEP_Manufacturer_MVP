import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { type RecentProduct } from "./nav";
import { PhoneTabs } from "./PhoneTabs";
import { SidebarNav } from "./SidebarNav";
import { UsageCard } from "./UsageCard";
import { UserRow } from "./UserRow";

type Props = { recent: readonly RecentProduct[]; limitUsd: number; children: ReactNode };

/**
 * The app shell: a light 248px sidebar (logo, nav, recent products, the usage
 * card and the creator's name) and no top bar; each page brings its own
 * header. On phones the sidebar becomes a bottom tab bar.
 */
export function AppFrame({ recent, limitUsd, children }: Props) {
  return (
    <div className="flex min-h-svh">
      <aside aria-label="Sidebar" className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col bg-sidebar lg:flex print:hidden">
        <div className="p-6">
          <Link href="/" className="inline-flex rounded-control">
            <Logo priority className="h-5 w-auto" />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav recent={recent} />
        </div>
        <div className="flex flex-col gap-3 p-3">
          <UsageCard limitUsd={limitUsd} />
          <UserRow />
          <Link href="/privacy" className="type-small px-3 text-muted hover:text-ink">
            Privacy
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>

      <PhoneTabs recent={recent} limitUsd={limitUsd} />
    </div>
  );
}
