/** Same footprint as ProductCard, so the page doesn't shift when data arrives. */
export function StudioCardSkeleton() {
  return (
    <div aria-hidden className="card flex flex-col overflow-hidden">
      <div className="skeleton h-[200px] rounded-none" />
      <div className="card-pad flex flex-col gap-3">
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton h-[26px] w-40 rounded-pill" />
        <div className="skeleton mt-4 h-1.5 w-full rounded-pill" />
      </div>
    </div>
  );
}
