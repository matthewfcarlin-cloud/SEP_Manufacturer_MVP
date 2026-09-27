# Idlefit

**The all-in-one studio for first-time product creators: from an idea to a design that can be made, real quotes, a price that makes money, a launch plan, and a listing ready to sell.**

*Printify made selling custom merch easy by hiding the factory. Idlefit does the same for original physical products, where the factory is the hard part.*

<!-- Hero screenshot: replace with a capture of /studio at 1600×900 (docs/hero.png). -->
![Idlefit studio](docs/hero.png)

> Club MVP. Every shop is fictional demo data, and every cost, margin and price is an AI estimate shown as a range. Product spec: [PRODUCT.md](PRODUCT.md). How to use the app, step by step: [docs/USING.md](docs/USING.md).

---

## The creator journey

Every product moves through six stages, and the app always shows the next step.

| # | Stage | What happens | Status |
|---|---|---|---|
| 1 | **Idea** | Upload CAD (STL/STEP), photos, notes, quantity and budget | ✅ Built |
| 2 | **Design** | Measured geometry, AI analysis and design tweaks, versions and compare, agent assist | ✅ Built |
| 3 | **Make** | Manufacturing paths, shop matches, outreach and quotes | ✅ Matches · 🔨 Outreach |
| 4 | **Money** | Business case: price, margin, tooling break-even | ✅ Built |
| 5 | **Launch** | Plan and timeline, pitch kit, marketing | ✅ Pitch kit · 🔨 Timeline |
| 6 | **Sell** | Etsy-ready listing | 🔨 Building |

## The eight components

| Component | In one line |
|---|---|
| [Studio dashboard](PRODUCT.md#1-studio-dashboard--home-base-for-every-product---build-today) | Every product, where it stands, and the single next thing to do. |
| [Design assist](PRODUCT.md#2-design-assist--how-to-make-it-and-how-to-make-it-better---built) | How to manufacture the part at your quantity, with cost ranges and design tweaks. |
| [Manufacturer match](PRODUCT.md#3-manufacturer-match--who-can-make-it-including-idle-machines-nearby---built) | Nearby shops ranked by fit, with idle machines first. |
| [Manufacturer outreach](PRODUCT.md#4-manufacturer-outreach--real-quotes-without-the-back-and-forth---build-today) | One click sends a spec sheet to top matches; quotes compared side by side. |
| [Plan and timeline](PRODUCT.md#5-plan-and-timeline--a-launch-plan-built-from-real-numbers---build-today) | Milestones, dates and budget from the chosen quote or the analysis. |
| [Marketing](PRODUCT.md#6-marketing--build-demand-before-paying-for-tooling---roadmap-reuse-pitch-kit-today) | Pitch kit and storyboard today; launch posts and waitlist later. |
| [Selling](PRODUCT.md#7-selling--from-finished-product-to-live-listing---build-today) | An Etsy-ready listing with copy buttons; direct publishing later. |
| [Agent assist](PRODUCT.md#8-agent-assist--a-product-development-expert-on-call---build-today) | A chat that answers with this product's own numbers. |

*(The links point at PRODUCT.md's heading anchors, which include each heading's status text. Update them here if you change a status there.)*

---

## Run it locally

Needs **Node.js 24+** and an [Anthropic API key](https://console.anthropic.com/).

```bash
npm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
npm run demo:seed            # installs the pre-analyzed example products (no API key needed)
npm run dev                  # http://localhost:3000
```

| Environment variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for analysis, pricing, pitch writing and the agent |
| `IDLEFIT_MODEL` / `IDLEFIT_EFFORT` | `claude-opus-5` / `high` | Model and effort for the manufacturing analysis |
| `IDLEFIT_DATA_DIR` | `./.data` | Where projects and files are stored (a volume in production) |
| `IDLEFIT_BROWSER_BUDGET_USD` | `3` | AI budget per browser |
| `IDLEFIT_DAILY_BUDGET_USD` | `25` | AI budget per day, site-wide |

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright on your installed Chrome; seeds the examples first) |
| `npm run typecheck` / `npm run lint` | Types and lint; both must pass before merging |
| `npm run build` / `npm start` | Production build and server. Stop `dev` before building in the same folder |
| `npm run demo:seed` | (Re)installs the example products |
| `npm run demo:stl` | Regenerates the demo STL parts |

**Deploying:** Railway, with a volume. `railway.json` has the config; the steps are in [docs/USING.md](docs/USING.md#deploying-on-railway).

## Tech stack

- **Next.js 16** (App Router) + React 19 + TypeScript, **Tailwind v4**
- **Claude API** (`@anthropic-ai/sdk`), server-side only: structured outputs validated with **zod 4**, streaming for the agent
- **react-three-fiber** + drei for the 3D viewer and studio renders; **OpenCascade** (`occt-import-js`) for STEP; **manifold-3d** for demo parts
- **motion** for animation (always respecting reduced motion)
- Storage: JSON + files on disk (`.data/`, a volume on Railway). No database yet
- Tests: **Vitest** (unit) and **Playwright** (E2E)

## Folder structure

```
app/                  Pages and API routes (App Router)
  api/                JSON APIs: projects, versions, analyze, match, business-case, pitch, agent, share…
  studio/             The creators' home: every product, its stage and next step
  project/[id]/       Product screens: overview, compare, new version, pitch
  p/[token]/          Public shared pitch
components/           UI, grouped by feature (analysis, agent, businessCase, pitch, privacy, home, viewer…)
lib/                  Domain logic, pure and tested
  analysis/           Prompts and the only file that calls the Claude SDK (claude.ts)
  agent/  usage/      Agent context/protocol; AI budget and metering
data/shops.json       The 25 fictional demo shops
demo/                 Example products, STL parts and saved renders
e2e/  test/fixtures/  Playwright tests; test files
CLAUDE.md             Technical build rules and data model (AGENTS.md is a symlink)
PRODUCT.md            Product spec
```

## Where to find things

| Component | Main files |
|---|---|
| Studio dashboard | `app/studio/`, `components/studio/`, `lib/studio/` (stage, next step, key numbers) |
| Design assist | `app/project/[id]/page.tsx`, `components/analysis/`, `lib/analysis/`, `lib/geometry.ts`, `lib/versions.ts`, `lib/compare.ts` |
| Manufacturer match | `lib/match.ts`, `components/ShopMatches.tsx`, `lib/specSummary.ts`, `data/shops.json` |
| Manufacturer outreach | *(building)* |
| Plan and timeline | *(building)* |
| Marketing (pitch kit) | `app/project/[id]/pitch/`, `components/pitch/`, `lib/analysis/pitch.ts`, `lib/iterationStory.ts` |
| Selling | *(building)* |
| Agent assist | `components/agent/BuildAgent.tsx`, `app/api/agent/`, `lib/agent/` |
| Money (business case) | `lib/businessCase.ts`, `components/businessCase/`, `lib/analysis/price.ts` |
| Privacy, sharing, AI budget | `lib/access.ts`, `proxy.ts`, `lib/shareStore.ts`, `lib/aiInputs.ts`, `lib/usage/`, `app/privacy/` |
| Data model | `lib/types.ts` (the contract), `lib/schemas.ts`, `lib/projectStore.ts` |
