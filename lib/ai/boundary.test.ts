import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";

// BACKEND.md rule: no provider SDK calls outside lib/ai/.
const ROOTS = ["app", "lib", "components", "scripts", "proxy.ts"];
const SDK_IMPORT = /from\s+["'](@anthropic-ai\/sdk|openai)(\/[^"']*)?["']/;

async function sourceFiles(entry: string): Promise<string[]> {
  if (/\.(ts|tsx)$/.test(entry)) return [entry];
  const dirents = await readdir(entry, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(dirents.map((d) => sourceFiles(path.join(entry, d.name))));
  return nested.flat();
}

describe("AI provider boundary", () => {
  test("only lib/ai/ imports a provider SDK", async () => {
    const files = (await Promise.all(ROOTS.map(sourceFiles))).flat();
    expect(files.length).toBeGreaterThan(50);
    const offenders: string[] = [];
    for (const file of files) {
      if (file.startsWith(`lib${path.sep}ai${path.sep}`)) continue;
      if (SDK_IMPORT.test(await readFile(file, "utf8"))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
