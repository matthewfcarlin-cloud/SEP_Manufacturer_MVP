"use client";

import { Check, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { initialsFor } from "@/lib/studio/home";
import { saveDisplayName, useDisplayName } from "./displayName";

/** The creator's avatar and name at the foot of the sidebar; click to set or change the name. */
export function UserRow() {
  const name = useDisplayName();
  const [draft, setDraft] = useState<string | null>(null);

  const save = (e: FormEvent) => {
    e.preventDefault();
    saveDisplayName(draft ?? "");
    setDraft(null);
  };

  if (draft !== null) {
    return (
      <form onSubmit={save} className="flex items-center gap-2 px-1">
        <label htmlFor="display-name" className="sr-only">
          Your name
        </label>
        <input
          id="display-name"
          autoFocus
          maxLength={40}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setDraft(null)}
          placeholder="Your name"
          className="h-9 min-w-0 flex-1 rounded-control border border-control-border bg-surface px-3 text-[14px] focus:border-accent focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] focus:outline-none"
        />
        <button type="submit" aria-label="Save name" className="grid h-9 w-9 place-items-center rounded-control text-accent-ink hover:bg-hover">
          <Check aria-hidden size={18} strokeWidth={1.75} />
        </button>
      </form>
    );
  }

  const initials = initialsFor(name);
  return (
    <button
      type="button"
      onClick={() => setDraft(name)}
      title={name ? "Change your name" : undefined}
      className="flex h-11 w-full items-center gap-2.5 rounded-control px-2 text-left transition-colors hover:bg-hover"
    >
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-accent-soft text-[13px] font-semibold text-accent-ink">
        {initials || <User size={16} strokeWidth={1.75} />}
      </span>
      <span className={name ? "truncate text-[14px] font-medium text-ink" : "truncate text-[14px] text-ink-2"}>{name || "Add your name"}</span>
    </button>
  );
}
