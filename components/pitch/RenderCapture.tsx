"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ModelViewer } from "@/components/viewer";
import type { ApiResponse } from "@/lib/api";

type Props = { projectId: string; version: number; cadFileUrl: string; onDone: () => void };

/**
 * Renders the four studio angles from the 3D model once, uploads them, and
 * refreshes the page so the pitch shows saved stills from then on.
 */
export function RenderCapture({ projectId, version, cadFileUrl, onDone }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (dataUrls: string[]) => {
      try {
        const body = new FormData();
        const blobs = await Promise.all(dataUrls.map((url) => fetch(url).then((r) => r.blob())));
        blobs.forEach((blob, i) => body.append("renders", blob, `render-${i}.png`));
        const res = await fetch(`/api/projects/${projectId}/versions/${version}/renders`, { method: "POST", body });
        const json = (await res.json()) as ApiResponse<{ renders: string[] }>;
        if (!json.success) throw new Error(json.error);
        onDone();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save the renders.");
      }
    },
    [projectId, version, onDone, router],
  );
  const markFailed = useCallback(() => setError("The 3D viewer couldn't render in this browser."), []);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 print:hidden" role="status">
      <p className="text-sm font-medium">{error ?? "Rendering studio shots from your 3D model…"}</p>
      {!error && <ModelViewer url={cadFileUrl} autoRotate={false} captureAngles onRenders={upload} onRenderError={markFailed} className="h-64 w-full" />}
    </div>
  );
}
