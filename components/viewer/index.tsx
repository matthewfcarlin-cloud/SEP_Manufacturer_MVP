"use client";

import dynamic from "next/dynamic";

// WebGL only exists in the browser, so the viewer never renders on the server.
export const ModelViewer = dynamic(() => import("./ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center rounded-xl border border-line bg-surface text-sm text-muted">
      Loading viewer…
    </div>
  ),
});
