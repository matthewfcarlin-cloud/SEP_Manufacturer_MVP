import type { ReactNode } from "react";

/** One store on the Sell screen: its name, a status tag, and what it can do. */
export function StoreCard({ name, status, children }: { name: string; status: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="display-type text-2xl">{name}</h3>
        <span className="eyebrow border border-line px-1.5 py-0.5 text-[9px] text-muted">{status}</span>
      </div>
      {children}
    </section>
  );
}
