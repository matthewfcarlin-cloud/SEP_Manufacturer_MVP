/** Same footprint as the Make page, so nothing shifts when it arrives. */
export default function MakeLoading() {
  return (
    <div aria-hidden className="@container mx-auto flex max-w-content flex-col gap-12 page-pad py-8">
      <div className="flex flex-col gap-3">
        <div className="skeleton h-5 w-full max-w-xl" />
        <div className="skeleton h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-6 @3xl:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-14 skeleton" />)}</div>
        <div className="h-80 skeleton" />
      </div>
    </div>
  );
}
