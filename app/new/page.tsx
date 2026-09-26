import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Start a project" };

// Placeholder until Phase 1 (upload + 3D viewer + geometry extraction).
export default function NewProjectPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Start a project</h1>
      <p className="text-muted">
        Uploading isn&apos;t built yet. It&apos;s next on the list (Phase 1: STL upload, 3D viewer,
        and geometry stats).
      </p>
      <p>
        <Link href="/shops" className="underline">
          Browse the demo shops
        </Link>{" "}
        in the meantime.
      </p>
    </div>
  );
}
