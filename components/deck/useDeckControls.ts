"use client";

import { useEffect } from "react";

export type DeckCommands = {
  next: () => void;
  previous: () => void;
  first: () => void;
  last: () => void;
  notes: () => void;
};

const keyActions: Record<string, keyof DeckCommands | "fullscreen"> = {
  ArrowRight: "next",
  ArrowDown: "next",
  PageDown: "next",
  " ": "next",
  Enter: "next",
  ArrowLeft: "previous",
  ArrowUp: "previous",
  PageUp: "previous",
  Backspace: "previous",
  Home: "first",
  End: "last",
  f: "fullscreen",
  F: "fullscreen",
  n: "notes",
  N: "notes",
};

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
}

/** Keyboard and clicker control. Clickers send PageDown/PageUp or arrow keys. */
export function useDeckControls(commands: DeckCommands) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const action = keyActions[event.key];
      if (!action) return;
      event.preventDefault();
      if (action === "fullscreen") toggleFullscreen();
      else commands[action]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commands]);
}
