// Installs demo/sample-project.json (a real saved Claude analysis) into local
// storage so /project/<id> works in a fresh checkout. Run: npm run demo:seed
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const project = JSON.parse(readFileSync("demo/sample-project.json", "utf8")) as { id: string };
const dir = path.join(process.env.IDLEFIT_DATA_DIR ?? ".data", "projects", project.id);
mkdirSync(dir, { recursive: true });
copyFileSync("demo/sample-project.json", path.join(dir, "project.json"));
copyFileSync("demo/pedal-enclosure.stl", path.join(dir, "model.stl"));
console.log(`seeded /project/${project.id}`);
