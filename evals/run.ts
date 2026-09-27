// npm run eval [-- --limit 3] [-- --only pedal-enclosure,nylon-gear]
// Runs the real analysis on each golden part (evals/golden/cases.json),
// scores it (lib/evals/score.ts), prints a table and saves the results to
// evals/results/. Costs real API money: ~$0.17 per case on the house key.
// Run it before and after any prompt, routing or retrieval change, and put
// the average in the PR description.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analysisCaller } from "@/lib/analysis/callers";
import { buildProjectBrief } from "@/lib/analysis/prompt";
import { runAnalysis } from "@/lib/analysis/run";
import { goldenCasesSchema, scoreCase, type CaseScore, type GoldenCase } from "@/lib/evals/score";
import type { Analysis, Project, ProjectVersion } from "@/lib/types";

const CONCURRENCY = 4;
/** The eval's own workspace, so its usage rows and spend are easy to tell apart. */
const EVAL_WORKSPACE = createHash("sha256").update("moko-eval").digest("hex");

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function asProject(c: GoldenCase): { project: Project; version: ProjectVersion } {
  const now = new Date().toISOString();
  const version: ProjectVersion = {
    number: 1,
    createdAt: now,
    notes: c.notes,
    targetQuantity: c.targetQuantity,
    materialHints: c.materialHints,
    imageUrls: [],
    geometry: { ...c.geometry, thinWallWarning: false },
  };
  return { project: { id: "EvalCase01", name: c.name, createdAt: now, versions: [version] }, version };
}

type Result = { name: string; topProcess?: string; score: CaseScore; seconds: number; error?: string };

async function runCase(c: GoldenCase): Promise<Result> {
  const { project, version } = asProject(c);
  const started = Date.now();
  let analysis: Analysis | null = null;
  let error: string | undefined;
  try {
    analysis = await runAnalysis(analysisCaller(EVAL_WORKSPACE), { images: [], text: buildProjectBrief(project, version, 0) });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const seconds = Math.round((Date.now() - started) / 1000);
  return { name: c.name, topProcess: analysis?.paths[0].process, score: scoreCase(c, analysis), seconds, ...(error && { error }) };
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
      console.error(`  done: ${(items[i] as { name?: string }).name ?? i}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function printTable(results: Result[]): number {
  console.log(`\n${pad("case", 24)}${pad("top process", 20)}${pad("process", 9)}${pad("cost", 6)}${pad("specific", 10)}${pad("mentions", 10)}${pad("total", 7)}secs`);
  for (const r of results) {
    const s = r.score;
    console.log(
      `${pad(r.name, 24)}${pad(r.topProcess ?? "FAILED", 20)}${pad(pct(s.processMatch), 9)}${pad(pct(s.costOverlap), 6)}${pad(pct(s.specificity), 10)}${pad(pct(s.mentions), 10)}${pad(s.total, 7)}${r.seconds}`,
    );
    if (r.error) console.log(`  error: ${r.error}`);
  }
  const average = Math.round(results.reduce((sum, r) => sum + r.score.total, 0) / results.length);
  const valid = results.filter((r) => r.score.schemaValid).length;
  console.log(`\nAverage score: ${average}/100 over ${results.length} cases (${valid} valid answers)`);
  return average;
}

async function main() {
  const all = goldenCasesSchema.parse(JSON.parse(await readFile("evals/golden/cases.json", "utf8")));
  const only = argValue("--only")?.split(",");
  const limit = Number(argValue("--limit") ?? all.length);
  const cases = (only ? all.filter((c) => only.includes(c.name)) : all).slice(0, limit);
  if (cases.length === 0) throw new Error(`No golden cases match. Names: ${all.map((c) => c.name).join(", ")}`);
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY isn't set (npm run eval loads .env.local).");
  console.error(`Running ${cases.length} golden case(s), ${CONCURRENCY} at a time. This calls the real API.`);

  const results = await mapLimited(cases, CONCURRENCY, runCase);
  const average = printTable(results);
  const file = path.join("evals", "results", `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ ranAt: new Date().toISOString(), model: process.env.IDLEFIT_MODEL ?? "claude-opus-5", average, results }, null, 2));
  console.log(`Saved ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
