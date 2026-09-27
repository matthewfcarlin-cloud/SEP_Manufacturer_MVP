import { listEvents } from "../db/learningStore";
import { listProjects } from "../projectStore";
import type { TweakStats } from "../types";
import { isContributing } from "./features";
import { computeTweakStats } from "./tweakStats";

/** Current tweak stats from contributing products. Uncached, like the other learning jobs. */
export async function currentTweakStats(): Promise<TweakStats[]> {
  const projects = (await listProjects()).filter(isContributing);
  const entries = await Promise.all(projects.map(async (project) => ({ project, events: await listEvents(project.id) })));
  return computeTweakStats(entries);
}
