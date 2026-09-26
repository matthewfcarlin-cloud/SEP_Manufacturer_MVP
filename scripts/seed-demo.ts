// Installs the pre-analyzed demo projects (real saved Claude analyses) into
// local storage so they open without an API key. Run: npm run demo:seed
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_PROJECTS } from "../lib/demoProjects.ts";

for (const demo of DEMO_PROJECTS) {
  const project = JSON.parse(readFileSync(demo.json, "utf8")) as { id: string };
  if (project.id !== demo.id) throw new Error(`${demo.json} has id ${project.id}, expected ${demo.id}`);
  const dir = path.join(process.env.IDLEFIT_DATA_DIR ?? ".data", "projects", demo.id);
  mkdirSync(dir, { recursive: true });
  copyFileSync(demo.json, path.join(dir, "project.json"));
  copyFileSync(demo.stl, path.join(dir, "model.stl"));
  console.log(`seeded /project/${demo.id}`);
}
