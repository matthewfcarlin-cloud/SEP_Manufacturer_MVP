"use client";

import { useCallback, useState } from "react";
import { ModelViewer } from "@/components/viewer";

const CAPTIONS = ["Front", "Right", "Back", "Left"];

export function PitchHero({ projectName, cadFileUrl }: { projectName: string; cadFileUrl?: string }) {
  const [renders, setRenders] = useState<string[]>([]);
  const [renderFailed, setRenderFailed] = useState(false);
  const markRenderFailed = useCallback(() => setRenderFailed(true), []);

  return (
    <section aria-labelledby="renders-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Product study</p>
          <h2 id="renders-heading" className="mt-1 text-2xl font-semibold tracking-tight">The design, from every side</h2>
        </div>
        <p className="text-sm text-muted">Studio renders · generated from your 3D model</p>
      </div>
      {cadFileUrl ? (
        <>
          {renderFailed ? (
            <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
              Renders weren’t available from the 3D viewer in this browser.
            </div>
          ) : (
            <ModelViewer
              url={cadFileUrl}
              autoRotate={false}
              captureAngles
              onRenders={setRenders}
              onRenderError={markRenderFailed}
              className="h-[480px] w-full"
            />
          )}
          {renders.length === 4 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {renders.map((render, index) => (
                <figure key={CAPTIONS[index]} className="overflow-hidden rounded-xl border border-line bg-[#f6f4ef]">
                  {/* These images are captured locally from the project's own WebGL canvas. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={render} alt={`${projectName}, ${CAPTIONS[index].toLowerCase()} view`} className="aspect-[4/3] w-full object-cover" />
                  <figcaption className="border-t border-line px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted">{CAPTIONS[index]} view</figcaption>
                </figure>
              ))}
            </div>
          ) : !renderFailed && (
            <div className="grid min-h-64 place-items-center rounded-xl border border-line bg-[#f6f4ef] text-sm text-muted">
              Preparing studio renders…
            </div>
          )}
        </>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
          No CAD model is attached to this project, so studio renders aren’t available yet.
        </div>
      )}
    </section>
  );
}
