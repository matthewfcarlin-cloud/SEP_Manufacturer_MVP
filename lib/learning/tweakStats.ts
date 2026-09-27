import type { ProductEvent, Project, ProjectVersion, RankedTweak, TweakCategory, TweakStats } from "../types";
import { getVersion } from "../versions";
import { isContributing, revisionOf } from "./features";
import { TWEAK_CATEGORY_LABELS } from "./vocabulary";

// Tweak ranking (BACKEND.md 3.5): what each kind of tweak did on
// contributing products. Pure; tweakData.ts feeds it current data.

/** A 50% unit-cost drop counts as a full point. */
const FULL_COST_DROP_PCT = 50;
const BLOCK_SIZE = 3;

type Tally = { suggested: number; applied: number; up: number; down: number; deltas: number[] };
const emptyTally = (): Tally => ({ suggested: 0, applied: 0, up: 0, down: 0, deltas: [] });

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function tweakCategoryAt(version: ProjectVersion | undefined, pathIndex: number, tweakIndex: number): TweakCategory | undefined {
  return version?.analysis?.paths[pathIndex]?.designTweaks[tweakIndex]?.category;
}

/** The category of the tweak a version applied, looked up in the version it revised. */
function appliedCategory(project: Project, version: ProjectVersion): TweakCategory | undefined {
  const applied = version.appliedTweak;
  const base = applied && getVersion(project, applied.fromVersion);
  return base?.analysis?.paths.find((p) => p.process === applied!.process)?.designTweaks.find((t) => t.change === applied!.change)?.category;
}

/** Latest real rating per browser and tweak (people change their minds; the last click counts). */
function latestRatings(events: ProductEvent[]): ProductEvent[] {
  const latest = new Map<string, ProductEvent>();
  for (const e of events) {
    if (e.type !== "tweak_rated" || e.source !== "real") continue;
    const key = [e.workspaceId, e.projectId, e.version, e.payload.pathIndex, e.payload.tweakIndex].join("|");
    const current = latest.get(key);
    if (!current || e.createdAt >= current.createdAt) latest.set(key, e);
  }
  return [...latest.values()];
}

export function tweakScore(s: Omit<TweakStats, "score">): number {
  const appliedRate = s.suggested > 0 ? s.applied / s.suggested : 0;
  const rating = (s.up - s.down) / (s.up + s.down + 2);
  const costDrop = s.medianCostChangePct === undefined ? 0 : Math.max(-1, Math.min(1, -s.medianCostChangePct / FULL_COST_DROP_PCT));
  return Math.round((appliedRate + rating + costDrop) * 1000) / 1000;
}

/** Stats per tweak category, from contributing products only. */
export function computeTweakStats(entries: { project: Project; events: ProductEvent[] }[]): TweakStats[] {
  const tallies = new Map<TweakCategory, Tally>();
  const tally = (c: TweakCategory) => tallies.get(c) ?? (tallies.set(c, emptyTally()), tallies.get(c)!);

  for (const { project, events } of entries.filter((e) => isContributing(e.project))) {
    for (const version of project.versions) {
      for (const path of version.analysis?.paths ?? []) for (const t of path.designTweaks) if (t.category) tally(t.category).suggested++;
      const category = appliedCategory(project, version);
      if (!category) continue;
      tally(category).applied++;
      const revision = revisionOf(project, version);
      if (revision) tally(category).deltas.push(revision.unitCostChangePct);
    }
    for (const e of latestRatings(events)) {
      const category = tweakCategoryAt(getVersion(project, e.version ?? 0), Number(e.payload.pathIndex), Number(e.payload.tweakIndex));
      if (category) tally(category)[e.payload.rating === "up" ? "up" : "down"]++;
    }
  }

  return [...tallies.entries()].map(([category, t]) => {
    const stats = {
      category,
      suggested: t.suggested,
      applied: t.applied,
      up: t.up,
      down: t.down,
      costDeltas: t.deltas.length,
      ...(t.deltas.length && { medianCostChangePct: Math.round(median(t.deltas)) }),
    };
    return { ...stats, score: tweakScore(stats) };
  });
}

function evidence(s: TweakStats | undefined): string {
  if (!s || (s.applied === 0 && s.up + s.down === 0)) return "No results yet";
  const parts = [`applied ${s.applied} of ${s.suggested} times`];
  if (s.up + s.down > 0) parts.push(`rated up ${s.up}, down ${s.down}`);
  if (s.medianCostChangePct !== undefined) {
    const pct = s.medianCostChangePct;
    parts.push(`median unit cost ${pct < 0 ? "−" : "+"}${Math.abs(pct)}% across ${s.costDeltas} revision${s.costDeltas === 1 ? "" : "s"}`);
  }
  return parts.join("; ");
}

/** Each path's tweaks, best first by what worked; ties keep the AI's order. */
export function rankTweaks(version: ProjectVersion, stats: TweakStats[]): { process: string; tweaks: RankedTweak[] }[] {
  const byCategory = new Map(stats.map((s) => [s.category, s]));
  return (version.analysis?.paths ?? []).map((path, p) => ({
    process: path.process,
    tweaks: path.designTweaks
      .map((t, i): RankedTweak => {
        const s = t.category ? byCategory.get(t.category) : undefined;
        return { key: `${p}.${i}`, index: i, ...(t.category && { category: t.category }), score: s?.score ?? 0, evidence: evidence(s) };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index),
  }));
}

/** The prompt block of kinds of tweaks with real evidence, best first, or null. */
export function tweaksThatWorkedBlock(stats: TweakStats[]): string | null {
  const proven = stats
    .filter((s) => s.score > 0 && (s.applied > 0 || s.up + s.down > 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, BLOCK_SIZE);
  if (proven.length === 0) return null;
  return [
    "TWEAKS THAT WORKED ON THIS PLATFORM (kinds of design change, from real revisions and ratings on creators' products shared with permission):",
    ...proven.map((s) => `- ${TWEAK_CATEGORY_LABELS[s.category]}: ${evidence(s)}.`),
    "Prefer these kinds of change where they genuinely fit this part, and say briefly when a suggestion is one that has worked before.",
  ].join("\n");
}
