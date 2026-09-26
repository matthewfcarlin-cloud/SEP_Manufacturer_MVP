import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_PROJECTS } from "../lib/demoProjects";

// The demo, end to end, against seeded projects (see global-setup.ts).
const [PEDAL, BRACKET] = DEMO_PROJECTS;

// Remove any project a test created, even if the test failed midway.
test.afterEach(async ({ page }) => {
  await removeCreatedProject(page);
});

async function removeCreatedProject(page: Page): Promise<void> {
  const id = new URL(page.url()).pathname.split("/")[2];
  if (id && !DEMO_PROJECTS.some((d) => d.id === id)) {
    await rm(path.join(".data", "projects", id), { recursive: true, force: true });
  }
}

test("landing page opens a pre-analyzed example with paths and shop matches", async ({ page }) => {
  await page.goto("/");
  // The hero links straight to the same pre-analyzed project.
  await expect(page.getByRole("link", { name: "See a real analysis" })).toHaveAttribute("href", `/project/${PEDAL.id}`);
  await page.getByRole("region", { name: "See an example" }).getByRole("link", { name: /Fuzz pedal enclosure/ }).click();
  await expect(page).toHaveURL(`/project/${PEDAL.id}`);

  await expect(page.locator("canvas")).toBeVisible();
  const geometry = page.getByRole("region", { name: "Part geometry" });
  await expect(geometry).toContainText("122 × 66 × 39.5 mm");
  await expect(geometry).toContainText("Watertight mesh");

  const analysis = page.getByRole("region", { name: "How it could be made" });
  expect(await analysis.locator("article").count()).toBeGreaterThanOrEqual(2);
  await expect(analysis).toContainText("est.");

  const matches = page.getByRole("region", { name: "Shop matches" });
  const cards = matches.locator(":scope > ol > li");
  expect(await cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) await expect(card).toContainText("Demo data");
});

/** Share of each <img> that shows the part rather than the light studio backdrop. */
async function partPixelShares(page: Page): Promise<number[]> {
  return page.locator("article figure img").evaluateAll(async (imgs) => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    return Promise.all(
      (imgs as HTMLImageElement[]).map(async (img) => {
        await img.decode();
        ctx.clearRect(0, 0, 200, 100);
        ctx.drawImage(img, 0, 0, 200, 100);
        const d = ctx.getImageData(0, 0, 200, 100).data;
        let part = 0;
        for (let i = 0; i < d.length; i += 4) if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 225) part++;
        return part / (200 * 100);
      }),
    );
  });
}

test("the pitch shows saved studio stills and every section", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/pitch`);
  await expect(page.locator("article figure img")).toHaveCount(4);
  await expect(page.locator("canvas")).toHaveCount(0); // stills, not a live viewer
  for (const share of await partPixelShares(page)) expect(share).toBeGreaterThan(0.03);

  for (const name of ["Why this needs to exist", "What we're offering", "Can it make money?", "How we'd sell it", "What we're looking for"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByText("Pitch video · not generated yet")).toBeVisible();
  await expect(page.getByRole("region", { name: "How we'd sell it" }).locator("ol > li")).toHaveCount(6);
  await page.screenshot({ path: "test-results/pitch-kit.png", fullPage: true });
});

test("a pitch without renders captures them once and saves them", async ({ page }) => {
  // A render-less copy of the pedal, so the seeded demo is never touched.
  const id = "E2Erender1";
  const dir = path.join(".data", "projects", id);
  const demo = JSON.parse(await readFile(PEDAL.json, "utf8"));
  const versions = demo.versions.map((v: Record<string, unknown>) => ({ ...v, renders: undefined, cadFileUrl: `/api/files/${id}/model.stl` }));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "project.json"), JSON.stringify({ ...demo, id, versions }));
  await copyFile(PEDAL.files["model.stl"], path.join(dir, "model.stl"));
  try {
    await page.goto(`/project/${id}/pitch`);
    await expect(page.locator("article figure img")).toHaveCount(4, { timeout: 30_000 });
    for (const share of await partPixelShares(page)) expect(share).toBeGreaterThan(0.03);
    const saved = JSON.parse(await readFile(path.join(dir, "project.json"), "utf8"));
    expect(saved.versions[0].renders).toHaveLength(4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the pitch prints to a landscape PDF, one section per page", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/pitch`);
  await expect(page.locator("article figure img")).toHaveCount(4);
  const pdf = await page.pdf({ path: "test-results/pitch.pdf", preferCSSPageSize: true, printBackground: true });
  const text = pdf.toString("latin1");
  const pages = text.match(/\/Type\s*\/Page[^s]/g) ?? [];
  // Cover, problem, product, how it's made, economics, spot, ask (no iteration: one version).
  expect(pages.length).toBe(7);
  expect(text).toMatch(/\/MediaBox\s*\[\s*0 0 792 612\s*\]/); // Letter, landscape
});

test("editing the pitch text persists", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/pitch`);
  const problem = page.getByRole("region", { name: "Why this needs to exist" });
  const original = await problem.locator("p.text-2xl").innerText();

  await page.getByRole("button", { name: "Edit text" }).click();
  await page.getByLabel("The problem").fill("Builders lose an hour per pedal drilling blank shells.");
  await page.getByRole("button", { name: "Save pitch text" }).click();
  await expect(problem).toContainText("Builders lose an hour per pedal drilling blank shells.");
  await page.reload();
  await expect(problem).toContainText("Builders lose an hour per pedal drilling blank shells.");
  await expect(page.getByText("Text edited by you")).toBeVisible();

  // Leave the seeded demo as it was.
  await page.getByRole("button", { name: "Edit text" }).click();
  await page.getByLabel("The problem").fill(original);
  await page.getByRole("button", { name: "Save pitch text" }).click();
  await expect(problem).toContainText(original.slice(0, 40));
});

test("uploading an STL creates a measured project", async ({ page }) => {
  await page.goto("/new");
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("demo/charger-bracket.stl");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByLabel("Project name").fill("E2E bracket");
  await page.getByLabel("Target quantity").fill("500");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/project\/[A-Za-z0-9_-]{10}$/);
  const geometry = page.getByRole("region", { name: "Part geometry" });
  await expect(geometry).toContainText("80 × 60 × 50 mm");
  await expect(geometry).toContainText("3 mm");
  await expect(page.getByRole("button", { name: "Analyze manufacturing" })).toBeVisible();
});

test("a new version gets its own measurements and appears in the timeline", async ({ page }) => {
  await page.goto("/new");
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("demo/charger-bracket.stl");
  await page.getByLabel("Project name").fill("E2E versions");
  await page.getByLabel("Target quantity").fill("500");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/project\/[A-Za-z0-9_-]{10}$/);
  const projectUrl = page.url();

  await page.getByRole("link", { name: "New version" }).click();
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("demo/charger-bracket-sheet.stl");
  await page.getByLabel("What changed?").fill("Redrawn as one bent 2 mm sheet");
  await page.getByRole("button", { name: "Create version" }).click();

  await expect(page).toHaveURL(/\?v=2$/);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("2 mm");
  const timeline = page.getByRole("region", { name: /Versions/ });
  await expect(timeline.getByRole("link", { name: /^v1/ })).toBeVisible();
  await expect(timeline.getByRole("link", { name: /^v2/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Redrawn as one bent 2 mm sheet").first()).toBeVisible();

  // v1 is untouched.
  await page.goto(`${projectUrl}?v=1`);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("3 mm");

  // Comparing before either is analyzed asks for analysis rather than inventing deltas.
  await page.getByRole("link", { name: "Compare versions" }).click();
  await expect(page.getByRole("heading", { name: "Analyze v1 and v2 to compare them." })).toBeVisible();
  await page.goto(projectUrl); // so afterEach finds and removes the project
});

test("comparing the seeded bracket versions shows real deltas", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/compare?a=1&b=2`);
  // The seeded v2 is a real saved analysis of the bent-sheet redesign.
  await expect(page.getByRole("heading", { name: /^Unit cost −14%, fit score \+5, margin \+\d+ pts\.$/ })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("rowheader", { name: "Unit cost, est." })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "Top shop match" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
});

test("business case recomputes the verdict as the price changes", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}`);
  const section = page.getByRole("region", { name: "Business case" });
  const price = section.getByLabel("Retail price (USD)");
  const original = await price.inputValue();
  await expect(section.getByText("AI suggests")).toBeVisible();
  await expect(section.getByRole("table")).toContainText("10,000");
  await expect(section.getByRole("region", { name: "Cost per part vs. what you receive" })).toContainText("You receive");

  await price.fill("400");
  await expect(section.getByRole("status").first()).toContainText("Profitable at every volume shown at $400 retail.");
  await price.fill("3");
  await expect(section.getByRole("status").first()).toContainText("Not profitable at any volume shown at $3 retail.");

  // Leave the seeded demo as it was.
  await price.fill(original);
  await expect(section.getByText("Saved")).toBeVisible();
});

test("a low price on the molded bracket names the tooling problem", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}?v=1`);
  const section = page.getByRole("region", { name: "Business case" });
  const price = section.getByLabel("Retail price (USD)");
  const original = await price.inputValue();
  await price.fill("8");
  await expect(section.getByRole("status").first()).toContainText("Tooling makes this unprofitable under");
  await price.fill(original);
  await expect(section.getByText("Saved")).toBeVisible();
});

test("uploading a STEP file converts it and measures it in millimeters", async ({ page }) => {
  await page.goto("/new");
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("test/fixtures/cube-10mm.stp");
  await expect(page.getByText("STEP file ready")).toBeVisible();
  await page.getByLabel("Project name").fill("E2E STEP cube");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(page).toHaveURL(/\/project\/[A-Za-z0-9_-]{10}$/);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("10 × 10 × 10 mm");
  await expect(page.locator("canvas")).toBeVisible();
});

test("shops page filters to idle lathes", async ({ page }) => {
  await page.goto("/shops");
  await page.getByRole("button", { name: "CNC turning" }).click();
  await page.getByLabel("Idle machines only").check();
  await expect(page.getByText("Showing 3 of 25 shops")).toBeVisible();
  for (const card of await page.locator("article").all()) await expect(card).toContainText("Demo data");
});

test("projects page lists the examples and links to them", async ({ page }) => {
  await page.goto("/projects");
  const card = page.getByRole("link", { name: /Fuzz pedal enclosure[\s\S]*Example/ }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(`/project/${PEDAL.id}`);
});

test("cost-by-quantity chart shows a summary, legend, tooltip and table", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}`);
  const chart = page.getByRole("region", { name: "Cost per part by quantity" });
  await expect(chart).toBeVisible();
  await expect(chart).toContainText(/cheapest/);
  await expect(chart.getByRole("list", { name: "Legend" }).locator("li")).toHaveCount(await chart.locator("polyline").count());

  const hitArea = chart.locator("svg rect").last();
  await hitArea.scrollIntoViewIfNeeded();
  const box = (await hitArea.boundingBox())!;
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
  await expect(chart.getByRole("status")).toContainText("10,000 units, per part");

  await chart.getByText("Show as table").click();
  await expect(chart.locator("table tbody tr")).toHaveCount(await chart.locator("polyline").count());
});

test("thin-wall toggle paints thin areas on the model", async ({ page }) => {
  // The bracket demo has no thin walls, so build a part that does: a 0.6 mm shell.
  await page.goto("/new");
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("test/fixtures/thin-shell.stl");
  await page.getByLabel("Project name").fill("E2E thin shell");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/project\/[A-Za-z0-9_-]{10}$/);

  // Analyze a real screenshot: WebGL canvases can't be read back reliably.
  const redShare = async () => {
    const png = (await page.locator("canvas").screenshot()).toString("base64");
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const copy = document.createElement("canvas");
      copy.width = 160;
      copy.height = 120;
      const ctx = copy.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, 160, 120);
      const d = ctx.getImageData(0, 0, 160, 120).data;
      let red = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 90) red++;
      return red / (160 * 120);
    }, png);
  };

  await page.waitForTimeout(1500);
  const before = await redShare();
  await page.getByRole("button", { name: "Show thin walls" }).click();
  await page.waitForTimeout(1500);
  const after = await redShare();
  expect(before).toBeLessThan(0.01);
  expect(after).toBeGreaterThan(0.05);
});
