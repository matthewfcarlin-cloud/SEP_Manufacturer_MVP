import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "../projectStore";
import type { UsageRecord } from "../types";

// The usage meter's rows: one JSON line per AI call, one file per UTC day
// under .data/usage/calls/. Rows never hold prompt or response content.
// Moves behind lib/db/ with the storage interface (BACKEND.md A3).

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayFile(day: string): string {
  if (!DAY_PATTERN.test(day)) throw new Error(`Invalid usage day: ${day}`);
  return path.join(dataRoot(), "usage", "calls", `${day}.jsonl`);
}

/** Appends one row. A single short append per call, so concurrent writers don't interleave lines. */
export async function appendUsage(record: UsageRecord): Promise<void> {
  const file = dayFile(record.at.slice(0, 10));
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`);
}

/** Every row logged on one UTC day (`YYYY-MM-DD`), oldest first. */
export async function readUsage(day: string): Promise<UsageRecord[]> {
  try {
    const text = await readFile(dayFile(day), "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as UsageRecord);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
