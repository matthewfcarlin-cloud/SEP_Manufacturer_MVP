"use client";

import { useCallback, useState } from "react";
import { ModelViewer } from "@/components/viewer";
import { RENDER_ANGLES, STUDIO_BACKDROP } from "@/components/viewer/renderAngles";

const CAPTIONS = RENDER_ANGLES.map((a) => a.label);

function RenderFigure({
  src,
  caption,
  projectName,
  hero = false,
}: {
  src: string;
  caption: string;
  projectName: string;
  hero?: boolean;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line" style={{ background: STUDIO_BACKDROP }}>
      {/* Captured locally from the project's own WebGL canvas as a data URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${projectName}, ${caption.toLowerCase()} view`}
        className={hero ? "w-full" : "aspect-[4/3] w-full object-cover"}
      />
      <figcaption className="border-t border-line px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted">
        {caption} view
      </figcaption>
    </figure>
  );
}

export function PitchHero({ projectName, cadFileUrl }: { projectName: string; cadFileUrl?: string }) {
  const [renders, setRenders] = useState<string[]>([]);
  const [renderFailed, setRenderFailed] = useState(false);
  const markRenderFailed = useCallback(() => setRenderFailed(true), []);

  return (
    <section aria-labelledby="renders-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow text-accent">Product study</p>
          <h2 id="renders-heading" className="display-type mt-2 text-[clamp(1.8rem,3.5vw,2.75rem)]">The design, from every side</h2>
        </div>
        <p className="text-sm text-muted">Studio renders · generated from your 3D model</p>
      </div>
      {cadFileUrl ? (
        <>
          {renderFailed ? (
            <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
              Renders weren’t available from the 3D viewer in this browser.
            </div>
          ) : renders.length === CAPTIONS.length ? (
            // Once captured, the stills replace the live canvas: no duplicate
            // view on screen, and images print where a WebGL canvas may not.
            <div className="flex flex-col gap-3 md:gap-4">
              <RenderFigure src={renders[0]} caption={CAPTIONS[0]} projectName={projectName} hero />
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {renders.slice(1).map((render, i) => (
                  <RenderFigure key={CAPTIONS[i + 1]} src={render} caption={CAPTIONS[i + 1]} projectName={projectName} />
                ))}
              </div>
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
        </>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
          No CAD model is attached to this project, so studio renders aren’t available yet.
        </div>
      )}
    </section>
  );
}
