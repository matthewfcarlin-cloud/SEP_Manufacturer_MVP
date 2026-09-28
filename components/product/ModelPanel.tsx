import { Box, Upload } from "lucide-react";
import Link from "next/link";
import { ProjectViewer } from "@/components/viewer/ProjectViewer";
import type { ProjectVersion } from "@/lib/types";

/** The part in a 320px warm panel: drag to rotate, scroll to zoom. A friendly prompt when there's no 3D file yet. */
export function ModelPanel({ projectId, version, name }: { projectId: string; version: ProjectVersion; name: string }) {
  if (!version.cadFileUrl) {
    return (
      <section aria-label="3D model" className="grid h-[320px] place-items-center rounded-card bg-sidebar p-6 text-center print:hidden">
        <div className="flex flex-col items-center gap-3">
          <span aria-hidden className="grid h-14 w-14 place-items-center rounded-pill bg-surface text-muted shadow-card">
            <Box size={26} strokeWidth={1.5} />
          </span>
          <p className="text-ink-2">No 3D file for {name} yet.</p>
          <Link href={`/project/${projectId}/versions/new?from=${version.number}`} className="flex items-center gap-1.5 text-[14px] font-semibold text-accent-ink hover:underline">
            <Upload aria-hidden size={16} strokeWidth={1.75} />
            Add a 3D file
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section aria-label="3D model" className="relative h-[320px] overflow-hidden rounded-card bg-sidebar print:hidden">
      <ProjectViewer key={version.cadFileUrl} url={version.cadFileUrl} hasThinWalls={Boolean(version.geometry?.thinWallWarning)} className="h-full w-full" />
      <p aria-hidden className="type-small pointer-events-none absolute right-3 top-3 rounded-pill bg-surface/80 px-2.5 py-0.5 text-muted">
        Rotate · Zoom
      </p>
      <span className="sr-only">3D model of {name}. Drag to rotate, scroll to zoom.</span>
    </section>
  );
}
