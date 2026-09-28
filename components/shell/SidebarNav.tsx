"use client";

import { Box } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/classes";
import { isActive, NAV_ITEMS, type RecentProduct } from "./nav";
import { NavIcon } from "./NavIcon";

type Props = { recent: readonly RecentProduct[]; onNavigate?: () => void; items?: typeof NAV_ITEMS };

/** Nav items: 40px, radius 10, icon + label at 15px 500; the current one sits on a white card with an orange icon. */
export function SidebarNav({ recent, onNavigate, items = NAV_ITEMS }: Props) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6 px-3">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-10 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors",
                  active ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:bg-hover hover:text-ink",
                )}
              >
                <span className={active ? "text-accent-ink" : undefined}>
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {recent.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="type-small px-3 text-muted">Recent</p>
          <ul className="flex flex-col gap-0.5">
            {recent.map((p) => {
              const active = pathname.startsWith(`/project/${p.id}`);
              return (
                <li key={p.id}>
                  <Link
                    href={`/project/${p.id}`}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx("flex h-9 items-center gap-2.5 rounded-control px-3 text-[14px] transition-colors", active ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:bg-hover hover:text-ink")}
                  >
                    {p.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- saved studio render served by our own API
                      <img src={p.thumb} alt="" className="h-5 w-5 shrink-0 rounded-[6px] bg-surface object-cover" />
                    ) : (
                      <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-surface text-muted">
                        <Box size={12} strokeWidth={1.75} />
                      </span>
                    )}
                    <span className="truncate">{p.name}</span>
                    {p.isExample && <span className="type-small ml-auto shrink-0 text-muted">Demo</span>}
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
