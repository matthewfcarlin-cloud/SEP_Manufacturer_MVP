"use client";

import { useState } from "react";
import { MIN_WALL_MM } from "@/lib/geometryLimits";
import { ModelViewer } from "./index";
import { buttonClasses } from "@/components/ui/classes";

type Props = { url: string; hasThinWalls: boolean; className?: string };

/** The project page's viewer, with a thin-wall overlay toggle when relevant. */
export function ProjectViewer({ url, hasThinWalls, className = "" }: Props) {
  const [showThin, setShowThin] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <ModelViewer url={url} highlightThin={showThin} autoRotate={!showThin} className="h-full w-full" />
      {hasThinWalls && (
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-pressed={showThin}
            onClick={() => setShowThin((v) => !v)}
            className={buttonClasses({ variant: showThin ? "primary" : "secondary", size: "sm", className: "shadow-card" })}
          >
            {showThin ? "Hide thin walls" : "Show thin walls"}
          </button>
          {showThin && (
            <span className="flex items-center gap-1.5 rounded-control bg-surface/90 px-2 py-1 text-[13px]">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: "#e0461b" }} />
              Under {MIN_WALL_MM} mm thick
            </span>
          )}
        </div>
      )}
    </div>
  );
}
