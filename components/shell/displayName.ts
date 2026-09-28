"use client";

import { useSyncExternalStore } from "react";

// Moko has no accounts: the name in the greeting and the sidebar is a
// per-browser convenience, kept in localStorage (which can be missing or blocked).
const KEY = "moko:display-name";
const MAX_NAME = 40;

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
};
const read = () => {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

/** The creator's name as they typed it, or "" before they add one (and on the server). */
export function useDisplayName(): string {
  return useSyncExternalStore(subscribe, read, () => "");
}

export function saveDisplayName(name: string): void {
  try {
    const trimmed = name.trim().slice(0, MAX_NAME);
    if (trimmed) window.localStorage.setItem(KEY, trimmed);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Not saved: the name just won't show on the next visit.
  }
  listeners.forEach((fn) => fn());
}
