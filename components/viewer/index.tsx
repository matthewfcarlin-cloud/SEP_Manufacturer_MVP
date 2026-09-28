"use client";

import dynamic from "next/dynamic";

// WebGL only exists in the browser, so the viewer never renders on the server.
export const ModelViewer = dynamic(() => import("./ModelViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[320px] place-items-center card text-sm text-ink-2">
      Loading viewer…
    </div>
  ),
});
