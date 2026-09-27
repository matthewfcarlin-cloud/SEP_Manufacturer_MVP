import { appendFile, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataRoot, isValidProjectId } from "../projectStore";
import { serialized } from "../serialize";
import type { Outcome, ProductEvent } from "../types";

// Events and outcomes live in the project's own folder as JSON lines
// (events.jsonl, outcomes.jsonl), so deleting a project deletes them, and
// deleting a version prunes its rows: /privacy promises both. /api/files
// never serves these names (its allowlist is uploads and renders only).
// Moves behind the storage interface with the rest of the data in A3.

type Kind = "events" | "outcomes";

function recordFile(projectId: string, kind: Kind): string {
  if (!isValidProjectId(projectId)) throw new Error("Invalid project id");
  return path.join(dataRoot(), "projects", projectId, `${kind}.jsonl`);
}

const lock = (projectId: string) => `learning:${projectId}`;

/**
 * Appends rows without ever creating the project folder, so a write that
 * lands after a delete is dropped instead of resurrecting the project.
 */
async function append(projectId: string, kind: Kind, rows: unknown[]): Promise<boolean> {
  const file = recordFile(projectId, kind);
  return serialized(lock(projectId), async () => {
    try {
      await appendFile(file, rows.map((r) => `${JSON.stringify(r)}\n`).join(""));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      console.warn(`[learning] project ${projectId} is gone; dropped ${rows.length} ${kind}`);
      return false;
    }
  });
}

async function list<T>(projectId: string, kind: Kind): Promise<T[]> {
  try {
    const text = await readFile(recordFile(projectId, kind), "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export const appendEvents = (projectId: string, events: ProductEvent[]) => append(projectId, "events", events);
export const appendOutcome = (projectId: string, outcome: Outcome) => append(projectId, "outcomes", [outcome]);
export const listEvents = (projectId: string) => list<ProductEvent>(projectId, "events");
export const listOutcomes = (projectId: string) => list<Outcome>(projectId, "outcomes");

/** Deletes one version's events and outcomes (called when the version is deleted). */
export async function removeVersionRecords(projectId: string, version: number): Promise<void> {
  await serialized(lock(projectId), async () => {
    for (const kind of ["events", "outcomes"] as const) {
      const rows = await list<{ version?: number }>(projectId, kind);
      const kept = rows.filter((r) => r.version !== version);
      if (kept.length === rows.length) continue;
      const file = recordFile(projectId, kind);
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, kept.map((r) => `${JSON.stringify(r)}\n`).join(""));
      await rename(tmp, file);
    }
  });
}
