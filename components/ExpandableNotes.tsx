"use client";

import { useState } from "react";

/** Long enough to need collapsing: roughly what fits beside the 3D viewer. */
const COLLAPSE_AFTER_CHARS = 600;

/** The inventor's notes, collapsed to a preview when they're long so the brief can't outgrow the page. */
export function ExpandableNotes({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const isLong = text.length > COLLAPSE_AFTER_CHARS;
  return (
    <div className="flex flex-col gap-2">
      <span className={`whitespace-pre-line ${isLong && !isOpen ? "line-clamp-[10]" : ""}`}>{text}</span>
      {isLong && (
        <button type="button" onClick={() => setIsOpen((o) => !o)} className="self-start text-xs font-medium text-accent hover:underline">
          {isOpen ? "Show less" : "Show all notes"}
        </button>
      )}
    </div>
  );
}
