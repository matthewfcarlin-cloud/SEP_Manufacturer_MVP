/** Same footprint as the Make page, so nothing shifts when it arrives. */
export default function MakeLoading() {
  return (
    <div aria-hidden className="mx-auto flex max-w-7xl flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4 border-b border-line pb-8">
        <div className="h-3 w-48 bg-line/60" />
        <div className="h-[clamp(2.4rem,6vw,5rem)] w-64 bg-line/60" />
        <div className="h-4 w-full max-w-xl bg-line/40" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-3">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-14 animate-pulse bg-line/40 motion-reduce:animate-none" />)}</div>
        <div className="h-80 animate-pulse bg-line/40 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
