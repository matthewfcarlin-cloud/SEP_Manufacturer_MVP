import { StudioCardSkeleton } from "@/components/studio/StudioCardSkeleton";

export default function StudioLoading() {
  return (
    <div aria-hidden className="mx-auto flex max-w-content flex-col gap-12 page-pad py-10">
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-72 max-w-full" />
        <div className="skeleton h-4 w-60 max-w-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="skeleton h-[244px] rounded-card" />
        <div className="skeleton h-[244px] rounded-card" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StudioCardSkeleton />
        <StudioCardSkeleton />
        <StudioCardSkeleton />
      </div>
    </div>
  );
}
