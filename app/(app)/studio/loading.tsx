import { StudioCardSkeleton } from "@/components/studio/StudioCardSkeleton";

export default function StudioLoading() {
  return (
    <>
      <section className="border-b border-night-line bg-night">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-14 sm:px-6 sm:py-20">
          <div className="h-3 w-24 bg-night-line" />
          <div className="h-[clamp(3rem,9vw,7.5rem)] w-2/3 max-w-xl bg-night-line/60" />
        </div>
      </section>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2">
        <StudioCardSkeleton />
        <StudioCardSkeleton />
      </div>
    </>
  );
}
