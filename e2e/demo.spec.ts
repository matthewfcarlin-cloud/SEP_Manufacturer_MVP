import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
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

type FlowInput = { name: string; notes?: string; file?: string; units?: "mm" | "cm" | "m" | "in"; quantity?: number };

/**
 * Creates a product through the /new flow: one question per screen, then the
 * review. The analysis is always left off, so tests never spend AI budget.
 */
async function createThroughFlow(page: Page, { name, notes, file, units, quantity = 100 }: FlowInput): Promise<string> {
  await page.goto("/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  if (notes) await page.getByLabel("Describe it in a sentence").fill(notes);
  await page.getByRole("button", { name: "Continue" }).click();
  if (file) await page.getByLabel("3D file, photos or a sketch").setInputFiles(file);
  if (units) await page.getByLabel("Units in the file").selectOption(units);
  await page.getByRole("button", { name: "Continue" }).click();
  const tile = { 10: /Just a few/, 100: /A small batch/, 1000: /A real run/ }[quantity as 10 | 100 | 1000];
  if (tile) await page.getByRole("radio", { name: tile }).click();
  else {
    await page.getByRole("button", { name: /Know the exact number/ }).click();
    await page.getByLabel("Exact number").fill(String(quantity));
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByLabel("See how to make it right away").uncheck();
  await page.getByRole("button", { name: "Create my product" }).click();
  await expect(page).toHaveURL(/\/project\/[A-Za-z0-9_-]{10}$/);
  return new URL(page.url()).pathname.split("/")[2];
}

test("landing page shows how it works, the six stages and honest answers", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start your product" }).first()).toHaveAttribute("href", "/new");
  const steps = page.getByRole("region", { name: "How it works" }).getByRole("listitem");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(1)).toContainText("See how to make it");
  // Every screenshot actually loads.
  const widths = await steps.locator("img").evaluateAll(async (imgs) =>
    Promise.all((imgs as HTMLImageElement[]).map(async (img) => (await img.decode().catch(() => undefined), img.naturalWidth))),
  );
  for (const w of widths) expect(w).toBeGreaterThan(0);
  await expect(page.getByRole("region", { name: "Six steps from idea to first sale" }).getByRole("listitem")).toHaveCount(6);

  const faq = page.getByRole("region", { name: "Questions" });
  const answer = faq.getByText(/made-up demo data/);
  await expect(answer).toBeHidden();
  await faq.getByText("Are the shops and quotes real?").click();
  await expect(answer).toBeVisible();
});

test("landing page opens a pre-analyzed example with paths and shop matches", async ({ page }) => {
  await page.goto("/");
  // The hero links straight to the same pre-analyzed project.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Turn your idea into a product you can sell.");
  await page.getByRole("link", { name: "See an example product" }).click();
  await expect(page).toHaveURL(`/project/${PEDAL.id}`);

  await expect(page.getByRole("region", { name: "3D model" }).locator("canvas")).toBeVisible();
  await expect(page.getByRole("status", { name: "Summary" })).toContainText(/^Here's the best way to make it: CNC milling/);
  const tweaks = page.getByRole("region", { name: "Ways to make it cheaper" });
  await expect(tweaks.locator("li")).toHaveCount(3);
  await expect(tweaks.locator("li").first()).toContainText("Saves about $21 each"); // "from ~$35 to ~$14" in the analysis
  await expect(tweaks.getByRole("link", { name: "Apply this" }).first()).toHaveAttribute("href", `/project/${PEDAL.id}/versions/new?from=1&tweak=0.0`);
  await openStageDetails(page);

  const analysis = page.getByRole("region", { name: "How it could be made" });
  await expect.poll(() => analysis.locator("article").count()).toBeGreaterThanOrEqual(2);
  await expect(analysis).toContainText("est.");

  const matches = page.getByRole("region", { name: "Shop matches" });
  const cards = matches.locator(":scope > ol > li");
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) await expect(card).toContainText("Demo data");

  // What you're making lives on the Idea stage.
  await page.getByRole("link", { name: /^Idea/ }).click();
  await expect(page).toHaveURL(`/project/${PEDAL.id}/idea`);
  await expect(page.getByRole("status", { name: "Summary" })).toContainText("Your part measures 122 × 66 × 39.5 mm.");
  await openStageDetails(page);
  const geometry = page.getByRole("region", { name: "Part geometry" });
  await expect(geometry).toContainText("122 × 66 × 39.5 mm");
  await expect(geometry).toContainText("Closed, solid shape");
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
  const id = await createThroughFlow(page, { name: "E2E bracket", file: "demo/charger-bracket.stl", quantity: 500 });
  await expect(page.getByRole("button", { name: "Analyze manufacturing" })).toBeVisible(); // the Design summary's one button
  await page.goto(`/project/${id}/idea`);
  await openStageDetails(page);
  const geometry = page.getByRole("region", { name: "Part geometry" });
  await expect(geometry).toContainText("80 × 60 × 50 mm");
  await expect(geometry).toContainText("3 mm");
});

test("a new version gets its own measurements and appears in the timeline", async ({ page }) => {
  await createThroughFlow(page, { name: "E2E versions", file: "demo/charger-bracket.stl", quantity: 500 });
  const projectUrl = page.url();

  await page.getByRole("button", { name: /More actions/ }).click();
  await page.getByRole("menuitem", { name: "New version" }).click();
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("demo/charger-bracket-sheet.stl");
  await page.getByLabel("What changed?").fill("Redrawn as one bent 2 mm sheet");
  await page.getByRole("button", { name: "Create version" }).click();

  await expect(page).toHaveURL(/\/idea\?v=2$/);
  await openStageDetails(page);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("2 mm");
  const timeline = page.getByRole("region", { name: /Versions/ });
  await expect(timeline.getByRole("link", { name: /^Version 1/ })).toBeVisible();
  await expect(timeline.getByRole("link", { name: /^Version 2/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Redrawn as one bent 2 mm sheet").first()).toBeVisible();

  // v1 is untouched.
  await page.goto(`${projectUrl}/idea?v=1`);
  await openStageDetails(page);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("3 mm");

  // Comparing before either is analyzed asks for analysis rather than inventing deltas.
  await page.getByRole("link", { name: "Compare versions" }).click();
  await expect(page.getByRole("heading", { name: "See how version 1 and version 2 are made to compare them." })).toBeVisible();
  await page.goto(projectUrl); // so afterEach finds and removes the project
});

test("comparing the seeded bracket versions shows real deltas", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/compare?a=1&b=2`);
  // The seeded v2 is a real saved analysis of the bent-sheet redesign.
  await expect(page.getByRole("heading", { name: /^Each one costs 14% less, it fits 5 points better, and you keep \$[\d.,]+ more per sale\.$/ })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("rowheader", { name: "Cost of each, est." })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "Top shop match" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(2);
});

test("the product studio: stages on the left, the model, one summary card, details, and no top tabs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/project/${PEDAL.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Fuzz pedal enclosure" })).toBeVisible();
  const stages = page.getByRole("navigation", { name: "Fuzz pedal enclosure stages" });
  for (const label of ["Idea", "Design", "Make", "Money", "Launch", "Sell"]) await expect(stages.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
  await expect(stages.getByRole("link", { name: /^Design/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Design & money" })).toHaveCount(0); // the old top tabs are gone
  await expect(page.getByRole("region", { name: "3D model" })).toContainText("Rotate · Zoom");

  // Each stage has one summary card with one button, and its details behind "See the details".
  await stages.getByRole("link", { name: /^Money/ }).click();
  await expect(page).toHaveURL(`/project/${PEDAL.id}/money`);
  const summary = page.getByRole("status", { name: "Summary" });
  await expect(summary.getByRole("heading", { level: 2 })).toHaveText("At $32 you'd lose money on each sale.");
  await expect(summary.getByRole("link")).toHaveCount(1);
  const details = page.locator("#stage-details > button");
  await expect(details).toHaveText(/See the details/);
  await expect(details).toHaveAttribute("aria-expanded", "false");

  // Links from elsewhere open the details at the right place.
  await page.goto(`/project/${PEDAL.id}/money?v=1#business-case-heading`);
  await expect(page.locator("#stage-details > button")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Business case" })).toBeVisible();

  await stages.getByRole("link", { name: /^Make/ }).click();
  await expect(page.getByRole("status", { name: "Summary" }).getByRole("link", { name: "Compare your 5 quotes" })).toHaveAttribute("href", "#quotes-heading");
});

test("business case recomputes the verdict as the price changes", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/money`);
  await openStageDetails(page);
  const section = page.getByRole("region", { name: "Business case" });
  const price = section.getByLabel("Retail price (USD)");
  const original = await price.inputValue();
  await expect(section.getByText("AI suggests")).toBeVisible();
  await expect(section.getByRole("table")).toContainText("10,000");
  await expect(section.getByRole("region", { name: "Cost of each vs. what you receive" })).toContainText("You receive");

  await price.fill("400");
  await expect(section.getByRole("status").first()).toContainText("Makes money at every run size shown at $400.");
  await price.fill("3");
  await expect(section.getByRole("status").first()).toContainText("Loses money at every run size shown at $3.");

  // Leave the seeded demo as it was.
  await price.fill(original);
  await expect(section.getByText("Saved")).toBeVisible();
});

test("the price slider moves the verdict and the profit bars as you drag it", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/money`);
  const summary = page.getByRole("status", { name: "Summary" });
  await expect(summary.getByRole("heading", { level: 2 })).toHaveText("At $32 you'd lose money on each sale.");
  const slider = page.getByRole("slider", { name: "Your price in US dollars" });
  const bars = page.getByRole("region", { name: "Profit on the whole run" });
  await expect(bars.getByLabel(/^Make 100: .* loss$/)).toBeVisible();

  const saved = () => page.waitForResponse((r) => r.url().endsWith("/api/business-case") && r.request().method() === "PUT" && r.ok());
  let save = saved();
  await slider.fill("120");
  await expect(summary.getByRole("heading", { level: 2 })).toHaveText(/^At \$120 you'd make about \$\d+ per sale\.$/);
  await expect(bars.getByLabel(/^Make 100: .* profit$/)).toBeVisible();
  await save;
  await expect(page.getByRole("region", { name: "Your price" }).getByText("Saved")).toBeVisible();

  // Leave the seeded demo as it was, and wait until that's really saved.
  save = saved();
  await slider.fill("32");
  await expect(summary.getByRole("heading", { level: 2 })).toHaveText("At $32 you'd lose money on each sale.");
  expect((await (await save).request().postDataJSON()).inputs.retailPriceUsd).toBe(32);
});

test("a low price on the molded bracket names the one-time setup cost problem", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/money?v=1`);
  await openStageDetails(page);
  const section = page.getByRole("region", { name: "Business case" });
  const price = section.getByLabel("Retail price (USD)");
  const original = await price.inputValue();
  await price.fill("8");
  await expect(section.getByRole("status").first()).toContainText("The one-time setup cost is too big to pay back under");
  await price.fill(original);
  await expect(section.getByText("Saved")).toBeVisible();
});

test("uploading a STEP file converts it and measures it in millimeters", async ({ page }) => {
  const id = await createThroughFlow(page, { name: "E2E STEP cube", file: "test/fixtures/cube-10mm.stp" });
  await expect(page.getByRole("region", { name: "3D model" }).locator("canvas")).toBeVisible();
  await page.goto(`/project/${id}/idea`);
  await openStageDetails(page);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("10 × 10 × 10 mm");
});

test("the Manufacturers directory filters to lathe shops that can start this week", async ({ page }) => {
  await page.goto("/shops");
  await expect(page.getByRole("heading", { level: 1, name: "Manufacturers" })).toBeVisible();
  await page.getByRole("button", { name: "CNC turning" }).click();
  await page.getByLabel("Can start this week").check();
  await expect(page.getByText("Showing 3 of 25 manufacturers")).toBeVisible();
  for (const card of await page.locator("article").all()) {
    await expect(card).toContainText("Demo data");
    await expect(card).toContainText("What they make");
    await expect(card).toContainText("Typical order size");
    await expect(card.getByText("Can start this week")).toBeVisible();
  }
});

test("no page talks about idle machines", async ({ page }) => {
  for (const url of ["/", "/present", "/studio", "/shops", `/project/${PEDAL.id}`, `/project/${PEDAL.id}/make`, `/project/${PEDAL.id}/pitch`, `/project/${BRACKET.id}/make`]) {
    await page.goto(url);
    await expect(page.locator("body")).not.toContainText(/idle|h\/wk/i);
  }
});

test("My products shows each product as a card with one status line and its progress", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("heading", { level: 1, name: "My products" })).toBeVisible();

  const pedal = page.locator("article", { hasText: "Fuzz pedal enclosure" });
  await expect(pedal.getByText("Example")).toBeVisible();
  await expect(pedal).toContainText(/quotes? waiting|Ready to/);
  await expect(pedal.getByRole("progressbar", { name: /^Step \d of 6$|All 6 steps done/ })).toBeVisible();
  await expect(pedal).toContainText(/Edited /);
  const bracket = page.locator("article", { hasText: "E-bike charger wall bracket" });
  await expect(bracket).toContainText("Ready to sell");

  await pedal.getByRole("link", { name: "Fuzz pedal enclosure" }).click();
  await expect(page).toHaveURL(new RegExp(`/project/${PEDAL.id}$`));
});

test("My products searches, and its menu copies, renames and deletes a product", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("searchbox", { name: "Search products" }).fill("pedal");
  await expect(page.locator("article")).toHaveCount(1);
  await page.getByRole("searchbox", { name: "Search products" }).fill("");

  // Examples offer a private copy instead of rename/delete.
  const example = page.locator("article", { hasText: "E-bike charger wall bracket" }).first();
  await example.getByRole("button", { name: /More actions/ }).click();
  await expect(example.getByRole("menuitem", { name: "Delete…" })).toHaveCount(0);
  await example.getByRole("menuitem", { name: "Make my own copy" }).click();

  const copy = page.locator("article", { hasText: "E-bike charger wall bracket (copy)" });
  await expect(copy).toBeVisible();
  const copyId = new URL(await copy.getByRole("link").first().getAttribute("href") ?? "", "http://x").pathname.split("/")[2];
  try {
    await copy.getByRole("button", { name: /More actions/ }).click();
    await copy.getByRole("menuitem", { name: "Rename" }).click();
    await copy.getByLabel("New name").fill("My bracket");
    await copy.getByRole("button", { name: "Save" }).click();
    const renamed = page.locator("article", { hasText: "My bracket" });
    await expect(renamed).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Sidebar" }).getByRole("link", { name: "My bracket" })).toBeVisible();

    await renamed.getByRole("button", { name: /More actions/ }).click();
    await renamed.getByRole("menuitem", { name: "Delete…" }).click();
    await renamed.getByRole("button", { name: "Delete for good" }).click();
    await expect(page.locator("article", { hasText: "My bracket" })).toHaveCount(0);
  } finally {
    await rm(path.join(".data", "projects", copyId), { recursive: true, force: true });
  }
});

test("the app shell: a light sidebar with a usage card; phones get bottom tabs and a More sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto("/studio");
  const sidebar = page.getByRole("complementary", { name: "Sidebar" });
  for (const label of ["Home", "My products", "Ask Moko", "Manufacturers", "Settings"]) await expect(sidebar.getByRole("link", { name: label })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  const usage = sidebar.getByRole("region", { name: "AI usage" });
  await expect(usage).toContainText("Demo budget");
  await expect(usage).toContainText(/\$\d+\.\d\d left/);
  await expect(usage.getByRole("link", { name: "Add your key" })).toHaveAttribute("href", "/settings");
  await expect(page.getByRole("banner")).toHaveCount(0); // no top bar
  await expect(page.getByRole("link", { name: "New product" })).toHaveAttribute("href", "/new");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  const tabs = page.getByRole("navigation", { name: "Main" });
  for (const label of ["Home", "Products", "Ask"]) await expect(tabs.getByRole("link", { name: label })).toBeVisible();
  await tabs.getByRole("button", { name: "More" }).click();
  const sheet = page.getByRole("dialog", { name: "More" });
  await expect(sheet.getByRole("region", { name: "AI usage" })).toBeVisible();
  await sheet.getByRole("link", { name: "Manufacturers" }).click();
  await expect(page).toHaveURL(/\/shops$/);
  await expect(sheet).toHaveCount(0);
});

test("Home greets you, picks up your latest product, and tracks your first product's setup", async ({ page }) => {
  await page.goto("/studio");
  await page.evaluate(() => window.localStorage.setItem("moko:display-name", "Sam"));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Good (morning|afternoon|evening), Sam$/);
  await expect(page.getByText("Here's where your products stand.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your first product", exact: true })).toBeVisible();

  const id = await createThroughFlow(page, { name: "E2E home", notes: "A hook for a desk edge" });
  await page.goto("/studio");
  const resume = page.getByRole("region", { name: "Continue where you left off" });
  await expect(resume.getByRole("heading", { name: "E2E home" })).toBeVisible();
  await expect(resume.getByRole("link", { name: /^Next: / })).toHaveAttribute("href", new RegExp(`/project/${id}`));
  const guide = page.locator("section", { has: page.getByRole("heading", { name: "Your first product", exact: true }) });
  await expect(guide).toContainText("1 of 5 done");
  await expect(guide.getByRole("link", { name: "See how it could be made" })).toHaveAttribute("href", `/project/${id}?v=1#analysis-heading`);
  await expect(page.locator("article", { hasText: "E2E home" })).toContainText("Edited just now");
  await page.goto(`/project/${id}`); // so afterEach finds and removes the project
});

test("the new-product flow asks one question per screen, checks each, keeps a draft, and a description is enough", async ({ page }) => {
  await page.goto("/new");
  await expect(page.getByRole("complementary", { name: "Sidebar" })).toHaveCount(0); // full screen
  await expect(page.getByRole("heading", { level: 1, name: "What are you making?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Give the project a name." })).toBeVisible();

  // Enter continues; with no file and no description, "Skip" asks for one.
  await page.getByLabel("Name", { exact: true }).fill("E2E idea only");
  await page.getByLabel("Name", { exact: true }).press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Show us what it looks like." })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Add a file, or go back and describe it in a sentence." })).toBeVisible();

  // Save and exit keeps the answers for next time.
  await page.getByRole("button", { name: "Save and exit" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await page.goto("/new");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("E2E idea only");
  await page.getByLabel("Describe it in a sentence").fill("A clip that holds a bike light");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "How many do you want to make?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Pick one to continue." })).toBeVisible();
  await page.getByRole("radio", { name: /Not sure yet/ }).click();
  await expect(page.getByRole("radio", { name: /Not sure yet/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Budget in US dollars").fill("750");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Does this look right?" })).toBeVisible();
  await expect(page.getByText("Not sure yet (planning for 100)")).toBeVisible();
  await expect(page.getByText("None yet, the description is enough")).toBeVisible();
  await page.getByRole("button", { name: "Edit budget" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Do you have a budget?" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("See how to make it right away").uncheck();
  await page.getByRole("button", { name: "Create my product" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saving your product…" })).toBeVisible();
  await expect(page).toHaveURL(/\/project\/[A-Za-z0-9_-]{10}$/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E idea only" })).toBeVisible();
  await expect(page.getByRole("region", { name: "3D model" })).toContainText("No 3D file for E2E idea only yet.");
  await expect(page.getByRole("status", { name: "Summary" }).getByRole("button", { name: "Analyze manufacturing" })).toBeVisible();
});

test("the studio fits a phone without sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  await expect(page.locator("article").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});

test("cost-by-quantity chart shows a summary, legend, tooltip and table", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}`);
  await openStageDetails(page);
  const chart = page.getByRole("region", { name: "Cost of each by quantity" });
  await expect(chart).toBeVisible();
  await expect(chart).toContainText(/cheapest/);
  await expect(chart.getByRole("list", { name: "Legend" }).locator("li")).toHaveCount(await chart.locator("polyline").count());

  const hitArea = chart.locator("svg rect").last();
  await hitArea.scrollIntoViewIfNeeded();
  const box = (await hitArea.boundingBox())!;
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
  await expect(chart.getByRole("status")).toContainText("10,000 made, cost of each");

  await chart.getByText("Show as table").click();
  await expect(chart.locator("table tbody tr")).toHaveCount(await chart.locator("polyline").count());
});

test("thin-wall toggle paints thin areas on the model", async ({ page }) => {
  // The bracket demo has no thin walls, so build a part that does: a 0.6 mm shell.
  await createThroughFlow(page, { name: "E2E thin shell", file: "test/fixtures/thin-shell.stl" });

  // Analyze a real screenshot: WebGL canvases can't be read back reliably.
  const redShare = async () => {
    const png = (await page.getByRole("region", { name: "3D model" }).locator("canvas").screenshot()).toString("base64");
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

// ---------------------------------------------------------------------------
// Privacy (Phase 9). Separate browser contexts are separate browsers: each
// gets its own owner cookie.
// ---------------------------------------------------------------------------

async function createProjectIn(page: Page, name: string): Promise<string> {
  return createThroughFlow(page, { name, file: "demo/charger-bracket.stl" });
}

async function otherBrowser(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  return context.newPage();
}

test("a project is private to the browser that created it", async ({ page, browser }) => {
  const id = await createProjectIn(page, "E2E private");
  const stranger = await otherBrowser(browser);

  expect((await stranger.goto(`/project/${id}`))!.status()).toBe(404);
  expect((await stranger.goto(`/project/${id}/pitch`))!.status()).toBe(404);
  expect((await stranger.request.get(`/api/files/${id}/model.stl`)).status()).toBe(404);
  await stranger.goto("/projects");
  await expect(stranger.getByText("E2E private")).toHaveCount(0);
  // Examples stay open to everyone.
  expect((await stranger.goto(`/project/${PEDAL.id}`))!.status()).toBe(200);

  // The owner still sees everything.
  expect((await page.request.get(`/api/files/${id}/model.stl`)).status()).toBe(200);
  await stranger.context().close();
});

test("help improve estimates is off by default, saves, and is owner-only", async ({ page }) => {
  const id = await createProjectIn(page, "E2E learning");
  try {
    await page.goto(`/project/${id}/idea`);
    await openStageDetails(page);
    const toggle = page.getByRole("switch", { name: "Help improve estimates" });
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await openStageDetails(page);
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    // Shared examples never contribute, so they have no switch.
    await page.goto(`/project/${PEDAL.id}/idea`);
    await openStageDetails(page);
    await expect(page.getByRole("switch", { name: "Help improve estimates" })).toHaveCount(0);
  } finally {
    await rm(path.join(".data", "projects", id), { recursive: true, force: true });
  }
});

test("a share link works for anyone until it's turned off or revoked", async ({ page, browser }) => {
  // Seeded bracket is an example (not shareable), so share a private copy of its analyzed pitch.
  const id = "E2Eshare01";
  const dir = path.join(".data", "projects", id);
  await page.goto("/"); // get this browser's owner cookie
  const cookie = (await page.context().cookies()).find((c) => c.name === "idlefit_owner")!;
  const { createHash } = await import("node:crypto");
  const demo = JSON.parse(await readFile(BRACKET.json, "utf8"));
  const fix = (u: string) => u.replace(`/api/files/${BRACKET.id}/`, `/api/files/${id}/`);
  const versions = demo.versions.map((v: { cadFileUrl: string; renders?: string[] }) => ({ ...v, cadFileUrl: fix(v.cadFileUrl), renders: v.renders?.map(fix) }));
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "project.json"),
    JSON.stringify({ ...demo, id, isExample: undefined, owner: { keyHash: createHash("sha256").update(cookie.value).digest("hex") }, versions }),
  );
  for (const [name, source] of Object.entries(BRACKET.files)) await copyFile(source, path.join(dir, name));

  const stranger = await otherBrowser(browser);
  try {
    await page.goto(`/project/${id}/pitch`);
    await expect(page.getByText("Public link off")).toBeVisible();
    await page.getByRole("button", { name: "Create share link" }).click();
    const link = page.getByRole("textbox", { name: "Share link" });
    await expect(link).toHaveValue(/\/p\/[A-Za-z0-9_-]{22}$/);
    const first = new URL(await link.inputValue()).pathname;

    await stranger.goto(first);
    await expect(stranger.getByRole("heading", { name: "What we're looking for" })).toBeVisible();
    await expect(stranger.locator("article figure img")).toHaveCount(4);
    for (const src of await stranger.locator("article figure img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src))) {
      expect(src).toContain("/api/share/");
    }
    await expect(stranger.getByRole("button", { name: "Edit text" })).toHaveCount(0);
    expect((await stranger.request.get(`/api/share/${first.split("/")[2]}/v2-model.stl`)).status()).toBe(404);
    expect((await stranger.goto(`/project/${id}`))!.status()).toBe(404);

    // Revoke: old link dies, new one works.
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Revoke and make a new link" }).click();
    await expect(link).not.toHaveValue(new RegExp(`${first}$`));
    const second = new URL(await link.inputValue()).pathname;
    expect((await stranger.goto(first))!.status()).toBe(404);
    expect((await stranger.goto(second))!.status()).toBe(200);

    // Off: the link stops working.
    await page.getByRole("button", { name: "Turn off link" }).click();
    await expect(page.getByText("Public link off")).toBeVisible();
    expect((await stranger.goto(second))!.status()).toBe(404);
  } finally {
    await stranger.context().close();
    // The real delete also removes the share index; rm is the fallback if the test died early.
    await page.request.delete(`/api/projects/${id}`);
    await rm(dir, { recursive: true, force: true });
  }
});

test("what the AI sees shows the brief and can hold back notes", async ({ page }) => {
  const id = await createProjectIn(page, "E2E ai inputs");
  await page.goto(`/project/${id}/idea`);
  await openStageDetails(page);
  const panel = page.getByRole("region", { name: /What the AI sees/ }).last();
  await expect(panel.locator("pre")).toContainText("Geometry measured from the STL");
  await expect(panel).toContainText("Your CAD file itself is never sent");
  await panel.getByLabel("Send my notes").uncheck();
  await expect(panel.locator("pre")).toContainText("(withheld by the inventor)");
  await page.reload();
  await openStageDetails(page);
  await expect(panel.getByLabel("Send my notes")).not.toBeChecked();
});

test("deleting a version and then the project removes their files", async ({ page }) => {
  const id = await createProjectIn(page, "E2E delete me");
  await page.getByRole("button", { name: /More actions/ }).click();
  await page.getByRole("menuitem", { name: "New version" }).click();
  await page.getByLabel("CAD file (STL or STEP)").setInputFiles("demo/charger-bracket-sheet.stl");
  await page.getByLabel("What changed?").fill("Bent sheet");
  await page.getByRole("button", { name: "Create version" }).click();
  await expect(page).toHaveURL(/\/idea\?v=2$/);
  await openStageDetails(page);
  const dir = path.join(".data", "projects", id);

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete version 2" }).click();
  await expect(page).toHaveURL(new RegExp(`/project/${id}/idea#danger-zone$`));
  await expect(page.getByRole("region", { name: /Versions/ })).toContainText("Versions (1)");
  expect((await readdir(dir)).sort()).toEqual(["model.stl", "project.json"]);

  const nameInput = page.getByLabel("Type the project name to delete everything");
  if (!(await nameInput.isVisible())) await page.getByRole("button", { name: "Delete", exact: true }).click();
  await nameInput.fill("E2E delete me");
  await page.getByRole("button", { name: "Delete project" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(readdir(dir)).rejects.toThrow();
  expect((await page.goto(`/project/${id}`))!.status()).toBe(404);
});

test("examples can't be deleted or shared, even by the browser that opens them", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/idea`);
  await openStageDetails(page);
  await expect(page.getByText("Shared example.")).toBeVisible();
  await expect(page.getByText("Type the project name to delete everything")).toHaveCount(0);
  expect((await page.request.delete(`/api/projects/${PEDAL.id}`)).status()).toBe(403);
  expect((await page.request.put(`/api/projects/${PEDAL.id}/share`, { data: { enabled: true } })).status()).toBe(403);
});

test("an over-budget browser is refused before any AI call", async ({ page }) => {
  await page.goto("/shops");
  const cookie = (await page.context().cookies()).find((c) => c.name === "idlefit_owner")!;
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(cookie.value).digest("hex");
  const ledger = path.join(".data", "usage", "browsers", `${hash}.json`);
  await mkdir(path.dirname(ledger), { recursive: true });
  await writeFile(ledger, JSON.stringify({ spentUsd: 99 }));
  try {
    const res = await page.request.post("/api/analyze", { data: { projectId: PEDAL.id } });
    expect(res.status()).toBe(429);
    expect((await res.json()).error).toMatch(/AI budget/);
    await page.goto(`/project/${PEDAL.id}`);
    await openStageDetails(page);
    await expect(page.getByText(/Demo AI budget for this browser: \$0\.00 of/)).toBeVisible();
  } finally {
    await rm(ledger, { force: true });
  }
});

test("an STL exported in inches is scaled to millimeters on upload", async ({ page }) => {
  const id = await createThroughFlow(page, { name: "E2E inches", file: "demo/charger-bracket.stl", units: "in" });
  await page.goto(`/project/${id}/idea`);
  await openStageDetails(page);
  const geometry = page.getByRole("region", { name: "Part geometry" });
  await expect(geometry).toContainText("2,032 × 1,524 × 1,270 mm");
  await expect(geometry).not.toContainText("Check the units");
});

test("a part that looks the wrong size gets a units warning", async ({ page }) => {
  const id = await createThroughFlow(page, { name: "E2E wrong units", file: "demo/charger-bracket.stl", units: "m" }); // 80 m across
  await page.goto(`/project/${id}/idea`);
  await openStageDetails(page);
  await expect(page.getByRole("region", { name: "Part geometry" })).toContainText("Check the units");
});

test("Ask Moko is docked on product pages, knows the page, and respects the AI budget", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const ledger = await overBudget(page); // over budget: no real AI call is made
  try {
    await page.goto(`/project/${PEDAL.id}/make`);
    await openStageDetails(page);
    const panel = page.getByRole("complementary", { name: "Ask Moko" });
    await expect(panel).toBeVisible(); // docked by default on wide screens
    await expect(panel).toContainText("Fuzz pedal enclosure");
    await expect(panel).toContainText("Hi! Ask me anything about Fuzz pedal enclosure.");
    const starters = panel.getByRole("button", { name: "Which quote should I pick?" });
    await expect(starters).toBeVisible();

    await starters.click();
    await expect(panel.getByRole("alert")).toContainText("AI budget");
    await expect(panel.getByRole("button", { name: "Which quote should I pick?" })).toBeVisible(); // no half conversation left

    // Other pages suggest other questions.
    await page.getByRole("navigation", { name: "Fuzz pedal enclosure stages" }).getByRole("link", { name: /^Sell/ }).click();
    await expect(panel.getByRole("button", { name: "What price should I list it at?" })).toBeVisible();

    // Collapses to a floating button, and stays collapsed.
    await panel.getByRole("button", { name: "Close Ask Moko" }).click();
    await expect(panel).toBeHidden();
    await page.reload();
    await expect(page.getByRole("complementary", { name: "Ask Moko" })).toBeHidden();
    await page.getByRole("button", { name: "Ask Moko", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Ask Moko" })).toBeVisible();
  } finally {
    await rm(ledger, { force: true });
  }
});

test("on phones Ask Moko opens over the page from a floating button, on every product screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [`/project/${PEDAL.id}/pitch`, `/project/${BRACKET.id}/compare?a=1&b=2`, `/project/${BRACKET.id}/versions/new`]) {
    await page.goto(url);
    const panel = page.getByRole("complementary", { name: "Ask Moko" });
    await expect(panel).toBeHidden();
    await page.getByRole("button", { name: "Ask Moko", exact: true }).click();
    await expect(panel.getByText(/^Hi! Ask me anything about/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
  }
});

test("Ask Moko streams a short answer, then offers 'Tell me more' and 'Start a new product'", async ({ page }) => {
  const asked: string[][] = [];
  await page.route("**/api/ask", async (route) => {
    const body = route.request().postDataJSON() as { messages: { content: string }[] };
    asked.push(body.messages.map((m) => m.content));
    const text = asked.length === 1 ? "Start by deciding which phones it should fit." : "Here is more detail.";
    await route.fulfill({ contentType: "application/x-ndjson", body: `${JSON.stringify({ type: "text", text })}\n${JSON.stringify({ type: "done" })}\n` });
  });
  await page.goto("/ask");
  const chat = page.getByRole("region", { name: "Ask Moko" });
  await chat.getByRole("button", { name: "I have an idea for a phone stand. Where do I start?" }).click();
  await expect(chat).toContainText("Start by deciding which phones it should fit.");
  await expect(chat.getByRole("link", { name: "Start a new product →" })).toHaveAttribute("href", "/new");
  await chat.getByRole("button", { name: "Tell me more" }).click();
  await expect(chat).toContainText("Here is more detail.");
  expect(asked[1]).toEqual(["I have an idea for a phone stand. Where do I start?", "Start by deciding which phones it should fit.", "Tell me more."]);
});

test("the full-page Ask Moko takes general questions and offers to start a product", async ({ page }) => {
  const ledger = await overBudget(page);
  try {
    await page.goto("/ask");
    await expect(page.getByRole("heading", { level: 1, name: "Ask Moko" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Sidebar" }).getByRole("link", { name: "Ask Moko" })).toHaveAttribute("aria-current", "page");
    const chat = page.getByRole("region", { name: "Ask Moko" });
    await chat.getByRole("button", { name: "I have an idea for a phone stand. Where do I start?" }).click();
    await expect(chat.getByRole("alert")).toContainText("AI budget");
    await expect(page.getByRole("link", { name: "New product", exact: true })).toHaveAttribute("href", "/new");
  } finally {
    await rm(ledger, { force: true });
  }
});

test("the Make screen compares demo quotes and saves the chosen one", async ({ page }) => {
  await page.goto(`/project/${PEDAL.id}/make`);
  await openStageDetails(page);
  const stages = page.getByRole("navigation", { name: /stages$/ });
  await expect(stages.getByRole("link", { name: /^Make/ })).toHaveAttribute("aria-current", "page");
  await expect(stages.getByRole("link", { name: /^Make/ })).toContainText("(current stage)");
  const quotes = page.getByRole("region", { name: "Your quotes" });
  const cards = quotes.locator("ul > li");
  await expect(cards).toHaveCount(5);
  await expect(quotes.getByText("Demo quote", { exact: true })).toHaveCount(5);
  await expect(cards.first()).toContainText("Best pick"); // sorted by best value
  await expect(cards.first()).toContainText(/\$[\d.]+\s*each/);
  await expect(cards.first()).toContainText(/Ready in \d+ days/);
  await expect(quotes.getByText("Best pick", { exact: true })).toHaveCount(1);
  // The rest of each quote's numbers are in the details.
  await expect(page.getByRole("region", { name: "Every quote's numbers" }).getByRole("table")).toContainText("One-time setup cost");

  // Ordering needs a choice first; then the chosen quote is saved on the version.
  await expect(cards.first().getByRole("button", { name: "Mark as ordered" })).toHaveCount(0);
  await cards.nth(1).getByRole("button", { name: "Choose" }).click();
  await expect(quotes.getByText("Chosen", { exact: true })).toBeVisible();
  // Finishing a stage is celebrated: the stepper ticks it off and a toast says what's next.
  await expect(page.getByText(/^Nice, Make is done\./)).toBeVisible();
  await expect(stages.getByRole("link", { name: /^Make/ })).toContainText("(done)");
  const chosenName = await quotes.locator("li", { hasText: "Chosen" }).locator("h3").innerText();
  await quotes.locator("li", { hasText: "Chosen" }).getByRole("button", { name: "Request a sample" }).click();
  await expect(quotes.locator("li", { hasText: "Chosen" }).getByRole("list", { name: "Quote pipeline" })).toContainText("Sample (current)");

  await page.reload();
  await openStageDetails(page);
  await expect(page.getByRole("region", { name: "Your quotes" }).locator("li", { hasText: "Chosen" }).locator("h3")).toHaveText(chosenName);
  await expect(page.getByRole("region", { name: "Spec sheet as sent" }).or(page.getByText("Spec sheet as sent"))).toBeVisible();
});

test("the Make screen shows the bill of materials and exports a supplier CSV without costs or notes", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/make`);
  await openStageDetails(page);
  const bom = page.locator("section").filter({ has: page.locator("#bom-heading") });
  await expect(bom.getByRole("heading", { name: "Parts list" })).toBeVisible();
  await expect(bom.getByText("Bracket body")).toBeVisible();
  await expect(bom.getByText("Powder coat", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await bom.getByRole("button", { name: "Parts list for suppliers (no costs)" }).click();
  const csv = await readFile((await (await download).path())!, "utf8");
  expect(csv).toContain("Bracket body");
  expect(csv).not.toMatch(/\$\d/);
  // Private notes stay out: this line's note is only in the app.
  expect(csv).not.toContain("hole-to-bend distance");
});

test("the order plan lists every BOM line and says when its total is only partial", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/make`);
  await openStageDetails(page);
  const order = page.locator("section").filter({ has: page.locator("#order-heading") });
  await expect(order.getByText("Total cost so far, delivered · est.")).toBeVisible();
  await expect(order.getByText(/9 of 10 parts not priced yet · assembly not chosen/)).toBeVisible();
  await expect(order.getByText("Pick a source for Wall screw.")).toBeVisible();
  // Nothing is approvable while parts are unpriced, and the button doesn't quote a partial total.
  await expect(order.getByRole("button", { name: "Approve plan", exact: true })).toBeDisabled();
});

test("choosing a different quote re-dates the launch plan", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/plan`);
  await openStageDetails(page);
  await expect(page.getByRole("heading", { name: "Your launch timeline" })).toBeVisible();
  await expect(page.getByRole("separator", { name: "Today" })).toBeVisible();
  await expect(page.getByRole("figure", { name: /Launch plan timeline/ }).locator("ol > li")).toHaveCount(8);
  const launch = page.locator("dl div", { hasText: /^Launch/ }).locator("dd");
  const before = await launch.innerText();

  // Choose the slowest quote on Make, then come back: production is re-dated from it.
  await page.goto(`/project/${BRACKET.id}/make`);
  await openStageDetails(page);
  const quotes = page.getByRole("region", { name: "Your quotes" });
  const cards = quotes.locator("ul > li");
  const days = await cards.evaluateAll((lis) => lis.map((li) => Number(li.textContent?.match(/Ready in (\d+) days/)?.[1] ?? 0)));
  const slowest = cards.nth(days.indexOf(Math.max(...days)));
  const slowestName = await slowest.locator("h3").innerText();
  if (await slowest.getByRole("button", { name: "Choose" }).count()) {
    await slowest.getByRole("button", { name: "Choose" }).click();
    await expect(slowest.getByText("Chosen", { exact: true })).toBeVisible();
  }
  await page.goto(`/project/${BRACKET.id}/plan`);
  await openStageDetails(page);
  await expect(page.getByText(`chosen demo quote: ${slowestName}`)).toBeVisible();
  const after = await page.locator("dl div", { hasText: /^Launch/ }).locator("dd").innerText();
  expect(after >= before).toBe(true);
  expect(after).not.toBe(before);
});

/** Opens the stage screen's "See the details". */
async function openStageDetails(page: Page): Promise<void> {
  const toggle = page.locator("#stage-details > button");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

async function overBudget(page: Page): Promise<string> {
  await page.goto("/shops");
  const cookie = (await page.context().cookies()).find((c) => c.name === "idlefit_owner")!;
  const { createHash } = await import("node:crypto");
  const ledger = path.join(".data", "usage", "browsers", `${createHash("sha256").update(cookie.value).digest("hex")}.json`);
  await mkdir(path.dirname(ledger), { recursive: true });
  await writeFile(ledger, JSON.stringify({ spentUsd: 99 }));
  return ledger;
}

test("settings checks a key with the backend and never fakes a saved one", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "AI provider" })).toBeVisible();
  await expect(page.getByLabel("Anthropic (Claude)")).toBeChecked();
  await expect(page.getByLabel("OpenAI")).toBeDisabled();
  await expect(page.getByText("Your key is encrypted and only used for your projects. Calls are billed to your provider account.")).toBeVisible();
  // A malformed key is refused by the key route itself (no provider call), for Test and for Save.
  await page.getByLabel("API key").fill("not-a-real-key");
  await page.getByRole("button", { name: "Test key", exact: true }).click();
  await expect(page.getByText("That doesn't look like an Anthropic API key. Keys start with sk-ant-.")).toBeVisible();
  await page.getByRole("button", { name: "Save key" }).click();
  await expect(page.getByText("That doesn't look like an Anthropic API key. Keys start with sk-ant-.")).toBeVisible();
  await expect(page.getByText(/Saved key ·/)).toHaveCount(0);
  await expect(page.getByText(/Demo AI budget · this browser/)).toBeVisible();
});

test("the public header's pill shows the demo budget and links to settings", async ({ page }) => {
  await page.goto("/");
  const pill = page.getByRole("link", { name: /Demo AI budget: \$\d+\.\d\d left/ });
  await expect(pill).toBeVisible();
  await pill.click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("a spent demo budget explains itself on the screen that made the call", async ({ page }) => {
  const ledger = await overBudget(page);
  try {
    await page.goto(`/project/${BRACKET.id}/plan`);
    await openStageDetails(page);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Redraft with AI" }).click();
    const banner = page.getByRole("alert").filter({ hasText: "Demo AI budget used up" });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("link", { name: "Use your own API key →" })).toHaveAttribute("href", "/settings");
    await expect(page.getByRole("complementary", { name: "Sidebar" }).getByRole("region", { name: "AI usage" })).toContainText("$0.00 left");
  } finally {
    await rm(ledger, { force: true });
  }
});

test("the Sell screen shows a copy-ready Etsy listing within Etsy's limits", async ({ page }) => {
  await page.goto(`/project/${BRACKET.id}/sell`);
  await openStageDetails(page);
  await expect(page.getByRole("navigation", { name: /stages$/ }).getByRole("link", { name: /^Sell/ })).toHaveAttribute("aria-current", "page");
  const preview = page.getByRole("region", { name: "Your Etsy listing" });
  const title = preview.getByRole("heading", { level: 2 });
  expect((await title.innerText()).length).toBeLessThanOrEqual(140);
  await expect(preview.getByRole("list", { name: "Tags" }).locator("li")).toHaveCount(13);
  await expect(preview.getByText("$19.00")).toBeVisible(); // price from the business case
  await expect(preview.getByText("Your Etsy shop")).toBeVisible();
  for (const label of ["Copy title", "Copy description", "Copy tags", "Copy price"]) await expect(preview.getByRole("button", { name: label })).toBeAttached();
  await expect(preview.getByRole("button", { name: "Copy whole listing" })).toBeVisible();
  // A carousel of the studio renders.
  await expect(preview.getByRole("img", { name: /listing photo 1 of 4/ })).toBeVisible();
  await preview.getByRole("button", { name: "Next photo" }).click();
  await expect(preview.getByRole("img", { name: /listing photo 2 of 4/ })).toBeVisible();
  // Etsy's limits, fees and downloads are in the details.
  await expect(page.getByText(/^\d+\/140$/)).toBeVisible();
  await expect(page.getByText("13/13")).toBeVisible();
  await expect(page.getByRole("img", { name: /photo \d to download/ })).toHaveCount(4);
  await expect(page.getByRole("button", { name: /Connect Etsy shop/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Shopify/ })).toBeDisabled();
  await expect(page.getByRole("status", { name: "Summary" }).getByRole("link", { name: /Open Etsy/ })).toHaveAttribute("target", "_blank");
});

test("no page scrolls sideways at phone width", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const paths = [
    "/", "/privacy", "/studio", "/new", "/shops", "/settings", "/ask",
    `/project/${PEDAL.id}`, `/project/${PEDAL.id}/idea`, `/project/${PEDAL.id}/make`, `/project/${PEDAL.id}/money`,
    `/project/${BRACKET.id}/plan`, `/project/${BRACKET.id}/sell`, `/project/${BRACKET.id}/pitch`, `/project/${BRACKET.id}/compare`,
  ];
  for (const p of paths) {
    await page.goto(p);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${p} is ${overflow}px wider than the phone`).toBeLessThanOrEqual(0);
  }
});
