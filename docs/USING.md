# Using Moko

**Design around the machines that are already running.**

Moko is for independent inventors and small hardware teams. You upload a part (a CAD file, a few photos, and what you know about it). In return you get:

- **How it could be made:** 2–4 manufacturing processes, each with cost ranges, lead times and specific design tweaks.
- **Who could make it:** nearby shops whose machines fit the part, with machines sitting idle this month ranked first.
- **Whether it makes money:** unit cost at different run sizes, margins, tooling payback and a plain-English verdict.
- **A pitch for a company:** a licensing pitch with studio renders, the economics, how the design improved, and a 30-second commercial storyboard. You can export it as a PDF or share it with a private link.

> Club MVP. Every shop is fictional demo data, and every cost, margin and price is an AI estimate shown as a range. Treat the numbers as a starting point for a real quote, not the quote itself.

---

## Using Moko

### 1. Start a project

Click **Start a project** and fill in:

| Field | What to give it |
|---|---|
| **CAD file** | An STL or a STEP file (`.step` / `.stp`), up to 50 MB. For an STL, pick the **units in the file** (millimeters, centimeters, meters or inches; most CAD tools export millimeters). STEP files carry their own units and are converted automatically. |
| **Project name** | What you call the product. |
| **What is it?** | What it does, who it's for, and what matters most (finish, strength, cost, weight). The more specific, the better the advice. |
| **Target quantity** | How many units you want in your first run. This drives almost every recommendation. |
| **Budget** *(optional)* | Your rough budget in USD. |
| **Material ideas** *(optional)* | Comma-separated, e.g. `aluminum, ABS`. |
| **Photos or sketches** *(optional)* | Up to 5. They help the AI understand features the mesh alone doesn't show. |

Click **Create project**. Moko measures the part straight away: bounding box, volume, surface area, typical wall thickness, and whether the mesh is watertight. If the part comes out implausibly tiny or huge, a **Check the units** warning suggests re-uploading it as a new version with the right units. If the part has thin walls, **Show thin walls** paints them on the 3D model.

### 2. Check what the AI will see

Before you analyze, open **What the AI sees**. It shows the exact text sent to the AI, plus your photos.

- Untick **Send photos** or **Send my notes** to hold them back. The setting applies to every AI feature for that version.
- Your CAD file itself is never sent to the AI, only the measurements listed in the panel.

### 3. Analyze

Click **Analyze manufacturing**. It takes about 1–2 minutes. You get:

- **At a glance:** the best process, per-part cost, tooling, lead time and the best local shop.
- **Recommendation:** what to do now, and the quantity where that changes.
- **Cost per part by quantity:** a chart showing how each process's all-in cost (tooling spread over the run) changes from 10 to 10,000 units. Hover for exact ranges, or open **Show as table**.
- **Manufacturing paths:** each process with its fit score, costs, pros and cons, and **design tweaks**. Every tweak names a concrete change to your part and what it saves.
- **Risks to check**, and a **30-second commercial storyboard**.
- **Shop matches:** up to five demo shops ranked by process, part size, material, order size and idle capacity. **What this shop would see** shows the spec summary a quote request would carry: size, material, quantity and process. Your design itself isn't included.

### 4. Iterate: versions and compare

A project is a product idea that can have several versions.

- **Try a tweak:** under any design tweak, click **Try this tweak as a new version**. The new-version form opens with that tweak selected and the change note filled in.
- **New version:** or click **New version** in the timeline. Upload the revised file and say what changed. The previous version's details carry over, and its photos are kept unless you add new ones.
- **Analyze the new version.** The AI is told what changed, so it judges whether the change worked.
- **Compare versions:** see two versions side by side, with both 3D models and the change in unit cost, tooling, best process, fit score, margin and top shop. A one-line summary reads like "Unit cost −14%, fit score +5, margin +27 pts."

Every version keeps its own file, photos, analysis, business case and matches. Click a version in the timeline to switch to it.

### 5. Business case: can it make money?

Scroll to **Business case** on an analyzed version.

- **Retail price:** type one, or click **Suggest a price from similar products**. The AI suggests a price and a range, with the comparable products it based them on. The suggestion comes from the AI's general knowledge, not live market data.
- **Run sizes:** up to five quantities, 100 / 1,000 / 10,000 by default.
- **Your share of retail:** stores and distributors usually keep 40–60% of the shelf price. At the 50% default, a $40 product earns you $20 per unit.

The verdict and table update as you type:

- **Verdict:** a plain-English answer, e.g. *"Profitable at 1,900+ units at $32 retail. Tooling makes this unprofitable under ~1,900 units: injection molding needs $9,000–$20,000 up front."*
- **Table:** for each run size, the cheapest process, all-in cost per part, your margin and profit on the run.
- **Chart:** each process's cost against a dashed line for what you receive per unit. Where a line drops below it, that process has paid back its tooling.

Your inputs save automatically.

### 6. Pitch it to a company

Click **Open pitch kit**. The pitch uses the newest analyzed version and is written for a decision-maker at a company that might license, make or stock your product. It has eight sections:

1. **Cover:** name, one-liner, hero render and headline numbers.
2. **The problem**, and who buys it.
3. **The product**, with features and studio renders from three more angles.
4. **How it gets made**, and a local shop ready to run it.
5. **Unit economics**, from your business case.
6. **How the design got better:** each version step with its measured result (only when there's more than one analyzed version).
7. **The 30-second spot:** the storyboard, plus a slot for a pitch video (video generation isn't wired up yet).
8. **The ask.**

The controls at the top of the pitch page:

- **Write pitch with AI** drafts the problem, product, audience and ask. **Edit text** lets you rewrite any of them.
- **Studio renders** are captured from your 3D model the first time you open the pitch. **Re-render shots** redoes them.
- **Download PDF** opens the print dialog. Choose *Save as PDF* to get a landscape page per section.
- **Share link:** see below.

### 7. Share, privacy and deleting

- **Private by default.** Your projects are tied to your browser (a cookie). Anyone else opening the link gets "not found". There are no accounts yet, so clearing cookies or switching browsers loses access.
- **Share a pitch:** on the pitch page, click **Create share link**. Anyone with the link sees the pitch (text, renders and estimates), never your CAD file, photos or notes. You can **Turn off link** or **Revoke and make a new link** at any time.
- **Delete:** at the bottom of a project, **Delete** removes a single version, or the whole project once you type its name. Files and data are removed from the server. Deleting can't recall what was already sent to the AI.
- The **examples** are shared demos: anyone can open and try them, but they can't be deleted or shared, and they reset on each deploy.
- The full, plain-language note is at **/privacy**.

### AI budget

To keep a public demo affordable, AI features are capped at **$3 per browser** and **$25 per day** across the whole site. Your remaining budget appears next to the Analyze button and on the pitch page; one analysis costs up to about $0.60. When the budget runs out, the examples and everything already analyzed keep working.

---

## A 3-minute demo

1. **Landing page:** scroll the "From file to factory" story, then click **See a real analysis** (the fuzz pedal enclosure).
2. **Pedal analysis:** walk through at a glance, the cost-by-quantity chart, a design tweak, and a shop match with an idle machine.
3. **Business case:** change the retail price and watch the verdict flip.
4. **Bracket example:** open **Compare versions**. v1 was drawn for molding; v2 applies the AI's sheet-metal tweak (unit cost −14%, margin up).
5. **Pitch kit:** scroll the pitch, then **Download PDF**.
6. *(Optional finale)* Upload `demo/charger-bracket.stl` as a new project and analyze it live. Start it early, since it takes 1–2 minutes.

Demo parts live in `demo/`: `pedal-enclosure.stl`, `charger-bracket.stl`, and `charger-bracket-sheet.stl` (the bracket after its sheet-metal tweak).

---

## Running it yourself

Needs Node.js 24 or newer and an [Anthropic API key](https://console.anthropic.com/).

```bash
npm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
npm run demo:seed            # installs the two example projects (no API key needed)
npm run dev                  # http://localhost:3000
```

| Setting (in `.env.local` or your host's variables) | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for analysis, pricing and pitch writing. |
| `IDLEFIT_MODEL` / `IDLEFIT_EFFORT` | `claude-opus-5` / `high` | The model and effort used for analysis. |
| `IDLEFIT_DATA_DIR` | `./.data` | Where projects and files are stored. |
| `IDLEFIT_BROWSER_BUDGET_USD` | `3` | AI budget per browser. |
| `IDLEFIT_DAILY_BUDGET_USD` | `25` | AI budget per day, site-wide. |

### Deploying on Railway

`railway.json` already holds the build, start and health-check settings.

1. **New Project → Deploy from GitHub repo**, and pick this repo.
2. **Attach a volume** to the service, mounted at `/data`.
3. In **Variables**, set `ANTHROPIC_API_KEY` and `IDLEFIT_DATA_DIR=/data`.
4. **Settings → Networking → Generate Domain**, then redeploy.

The examples are installed on every deploy. Pushes to `main` redeploy automatically. As a backstop, set a monthly spend limit in the Anthropic Console.

Vercel isn't supported yet: it has no persistent disk and limits uploads to 4.5 MB.

### For developers

```bash
npm test && npm run typecheck && npm run lint && npm run build
npm run test:e2e    # Playwright on your installed Google Chrome; seeds the examples first
```

Stop `npm run dev` before running `npm run build` in the same folder. The build rewrites `.next`, and a running dev server then 404s its newer routes.

The full build spec, data model and code conventions are in [CLAUDE.md](../CLAUDE.md). `AGENTS.md` is a symlink to it for Codex.

## Limitations

- Every shop is fictional, and nothing is ever sent to a shop.
- Costs, margins and prices are AI estimates for planning, not quotes.
- There are no user accounts: access is per browser.
- Data is stored as files on the server, without encryption at rest.
- One server instance only.
- The pitch video slot is a placeholder until a video API is connected.
