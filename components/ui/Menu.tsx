"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "./classes";
import { moveFocus } from "./menuFocus";

export type MenuItem = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Delete and friends: red, set apart by a divider. */
  isDanger?: boolean;
  isDisabled?: boolean;
};

type Props = { label: string; items: readonly MenuItem[]; align?: "start" | "end"; trigger?: ReactNode; className?: string };

/** Menu (⋯) (§3): surface, radius 12, shadow-pop, 36px items with icons; danger items in red below a divider. */
export function Menu({ label, items, align = "end", trigger, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ordered = [...items.filter((i) => !i.isDanger), ...items.filter((i) => i.isDanger)];
  const firstDanger = ordered.findIndex((i) => i.isDanger);

  const close = useCallback((returnFocus: boolean) => {
    setIsOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    itemRefs.current[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [isOpen, close]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      close(e.key === "Escape");
      return;
    }
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const next = moveFocus(current, ordered.length, e.key);
    if (next !== current && next >= 0) {
      e.preventDefault();
      itemRefs.current[next]?.focus();
    }
  };

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-control text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        {trigger ?? <MoreHorizontal aria-hidden size={18} strokeWidth={1.75} />}
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className={cx("absolute top-full z-50 mt-1 flex min-w-48 flex-col rounded-[12px] bg-surface p-1.5 shadow-pop", align === "end" ? "right-0" : "left-0")}
        >
          {ordered.map((item, i) => {
            const Icon = item.icon;
            return (
              <Fragment key={item.label}>
                {i === firstDanger && i > 0 && <div role="separator" className="my-1.5 h-px bg-border" />}
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item.isDisabled}
                  onClick={() => {
                    close(false);
                    item.onSelect();
                  }}
                  className={cx(
                    "flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[14px] font-medium transition-colors focus-visible:-outline-offset-2 disabled:opacity-50",
                    item.isDanger ? "text-red-ink hover:bg-red-soft focus:bg-red-soft" : "text-ink hover:bg-hover focus:bg-hover",
                  )}
                >
                  <Icon aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
                  {item.label}
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
