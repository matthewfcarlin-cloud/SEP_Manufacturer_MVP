/** Same footprint as StudioCard, so the page doesn't shift when data arrives. */
export function StudioCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col overflow-hidden border border-line bg-surface">
      <div className="aspect-[16/10] animate-pulse border-b border-line bg-line/40 motion-reduce:animate-none" />
      <div className="flex flex-col gap-5 p-5">
        <div className="h-3 w-40 bg-line/60" />
        <div className="h-8 w-2/3 bg-line/60" />
        <div className="grid grid-cols-6 gap-1">{Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1 bg-line" />)}</div>
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }, (_, i) => <span key={i} className="h-9 bg-line/50" />)}</div>
        <div className="h-11 bg-line/40" />
        <div className="h-20 bg-line/40" />
      </div>
    </div>
  );
}
