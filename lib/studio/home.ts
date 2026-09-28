import type { Project } from "../types";
import { latestVersion } from "../versions";
import { stageProgress } from "./stage";

// The Home dashboard's small pure pieces: greeting, "Edited 2h ago", initials,
// and the "Your first product" setup guide.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "Good morning" before noon, "Good afternoon" until 6pm, otherwise "Good evening". */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Edited 2h ago", in plain words; the date once it's over a week old. */
export function editedAgo(iso: string, nowMs: number): string {
  const elapsed = Math.max(0, nowMs - Date.parse(iso));
  if (elapsed < MINUTE) return "Edited just now";
  if (elapsed < HOUR) return `Edited ${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `Edited ${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < WEEK) return `Edited ${Math.floor(elapsed / DAY)}d ago`;
  return `Edited ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

/** Up to two initials for the avatar. */
export function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export type GuideStep = { key: string; label: string; href: string; isDone: boolean };
export type Guide = { steps: GuideStep[]; doneCount: number; isComplete: boolean };

/**
 * "Your first product": five steps from idea to launch plan, ticked from what
 * the product already has. Each open step links to the screen that does it.
 */
export function gettingStarted(project: Project | undefined): Guide {
  const start = "/new";
  const statuses = project ? stageProgress(project).statuses : undefined;
  const base = project ? `/project/${project.id}` : start;
  const onVersion = project ? `${base}?v=${latestVersion(project).number}` : start;
  const at = (path: string) => (project ? path : start);

  const steps: GuideStep[] = [
    { key: "create", label: "Describe your product", href: start, isDone: Boolean(project) },
    { key: "design", label: "See how it could be made", href: at(`${onVersion}#analysis-heading`), isDone: statuses?.design === "done" },
    { key: "make", label: "Choose who makes it", href: at(`${base}/make`), isDone: statuses?.make === "done" },
    { key: "money", label: "Set a price that makes money", href: at(project ? `${base}/money?v=${latestVersion(project).number}#business-case-heading` : start), isDone: statuses?.money === "done" },
    { key: "launch", label: "Plan your launch", href: at(`${base}/plan`), isDone: statuses?.launch === "done" },
  ];
  const doneCount = steps.filter((s) => s.isDone).length;
  return { steps, doneCount, isComplete: doneCount === steps.length };
}
