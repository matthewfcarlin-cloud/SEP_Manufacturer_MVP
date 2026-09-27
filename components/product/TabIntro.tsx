import type { ReactNode } from "react";

/** How every product tab opens: its name, two plain lines, and optional actions. */
export function TabIntro({ eyebrow, title, lines, actions }: { eyebrow: ReactNode; title: string; lines: readonly [string, string]; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 pb-2 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-3xl flex-col gap-3">
        <h2 className="sr-only">{title}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">{eyebrow}</p>
        <p className="text-lg leading-relaxed">
          {lines[0]}
          <br />
          <span className="text-muted">{lines[1]}</span>
        </p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
