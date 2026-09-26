import { rm } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_PROJECTS } from "../lib/demoProjects";

// The demo, end to end, against seeded projects (see global-setup.ts).
const [PEDAL] = DEMO_PROJECTS;

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
  // The hero's example card links to the same project.
  await expect(page.locator("article").getByRole("link", { name: "Fuzz pedal enclosure" })).toHaveAttribute("href", `/project/${PEDAL.id}`);
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

test("pitch kit captures four non-blank studio renders", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/pitch`);
  const renders = page.locator("figure img");
  await expect(renders).toHaveCount(4, { timeout: 30_000 });

  // Each render must actually show the part, not just the backdrop.
  const partPixelShare = await renders.evaluateAll(async (imgs) => {
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
  for (const share of partPixelShare) expect(share).toBeGreaterThan(0.03);

  await expect(page.getByRole("region", { name: "The story in six frames" }).locator("li")).toHaveCount(6);
  await expect(page.getByRole("region", { name: "The cost picture" })).toContainText("Estimate for 250 units");
  await page.screenshot({ path: "test-results/pitch-kit.png", fullPage: true });
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
