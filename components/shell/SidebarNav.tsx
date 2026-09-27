"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV_ITEMS, type RecentProduct } from "./nav";
import { NavIcon } from "./NavIcon";

type Props = { recent: readonly RecentProduct[]; isCollapsed?: boolean; onNavigate?: () => void };

/** The nav list and "Recent" products, shared by the desktop sidebar and the phone sheet. */
export function SidebarNav({ recent, isCollapsed = false, onNavigate }: Props) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none ${
                  active ? "border-night-accent bg-night-surface text-night-ink" : "border-transparent text-night-muted hover:text-night-ink"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <NavIcon name={item.icon} />
                <span className={isCollapsed ? "sr-only" : ""}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {!isCollapsed && recent.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="eyebrow px-3 text-[10px] text-night-muted">Recent</p>
          <ul className="flex flex-col">
            {recent.map((p) => {
              const active = pathname.startsWith(`/project/${p.id}`);
              return (
                <li key={p.id}>
                  <Link
                    href={`/project/${p.id}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm ${active ? "text-night-ink" : "text-night-muted hover:text-night-ink"}`}
                  >
                    <span aria-hidden className={`h-1.5 w-1.5 shrink-0 ${active ? "bg-night-accent" : "bg-night-line"}`} />
                    <span className="truncate">{p.name}</span>
                    {p.isExample && <span className="eyebrow ml-auto shrink-0 text-[9px] text-night-muted">Demo</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
