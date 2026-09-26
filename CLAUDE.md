# Idlefit — Build Spec (working name)

## What we're building
A web app for independent inventors and small hardware teams. They upload a product idea (CAD file + photos + notes). The app shows how it could be manufactured, which local shops have idle machines that fit it, what design tweaks would make it cheaper, and generates a shareable pitch kit.

**Core insight (from customer discovery with a veteran model maker/inventor):** design around what factories already have running, especially idle machines. Good design alone doesn't close the deal; manufacturability and profitability do.

**Scope:** inventor side only. Shops are seeded demo data. This is a club MVP demo, so it must be fully functional end to end, but it doesn't need to be production-scaled.

## Demo flow (the whole app serves this)
1. **Upload** – CAD (STL required, STEP stretch goal), 1–5 photos/sketches, notes (target quantity, budget, material ideas, what it is).
2. **Understand** – 3D viewer shows the part; app extracts geometry stats; AI reads photos + notes + stats.
3. **Manufacturing paths** – 2–4 candidate processes, each with unit cost range, tooling cost range, lead time, pros/cons, and specific design tweaks.
4. **Shop matches** – seeded shops ranked by fit, highlighting idle capacity ("CNC mill idle this month – fits with tweak X").
5. **Pitch kit** – one shareable page: rendered hero shots, product summary, manufacturing path + cost card, 30-second commercial storyboard (6 shots).

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- react-three-fiber + drei for the 3D viewer and renders
- STL: three.js `STLLoader`. STEP (stretch): `occt-import-js` (WASM) → mesh
- Claude API (server-side only) with vision + structured JSON output
- Storage: local JSON + filesystem for v1; Supabase optional later
- Deploy: Vercel
- API key in `.env.local` as `ANTHROPIC_API_KEY`. Never expose it to the client.

## Routes
- `/` – landing + "Start a project"
- `/new` – upload form
- `/project/[id]` – analysis results: viewer, paths, tweaks, shop matches
- `/project/[id]/pitch` – shareable pitch kit
- `/shops` – browse seeded shops (idle capacity visible)
- `POST /api/analyze` – runs AI analysis, returns `Analysis`
- `POST /api/match` – returns ranked `ShopMatch[]`

## Data models
```ts
type Project = {
  id: string; name: string; createdAt: string;
  notes: string; targetQuantity: number; budgetUsd?: number; materialHints?: string[];
  cadFileUrl?: string; imageUrls: string[];
  geometry?: GeometryStats; analysis?: Analysis; renders?: string[];
};

type GeometryStats = {
  boundingBoxMm: { x: number; y: number; z: number };
  volumeCm3: number; surfaceAreaCm2: number; triangleCount: number;
  isWatertight: boolean; thinWallWarning?: boolean;
  typicalWallMm?: number; // area-weighted median wall thickness (added Phase 5)
};

type Process = "cnc_milling" | "cnc_turning" | "fdm_print" | "sla_print" | "sls_print"
  | "injection_molding" | "sheet_metal" | "laser_cutting" | "urethane_casting";

type ManufacturingPath = {
  process: Process; fitScore: number; // 0-100
  unitCostUsd: { low: number; high: number }; toolingCostUsd: { low: number; high: number };
  leadTimeDays: { low: number; high: number };
  materials: string[]; pros: string[]; cons: string[];
  designTweaks: { change: string; why: string; impact: string }[];
};

type Analysis = {
  productSummary: string; detectedFeatures: string[];
  paths: ManufacturingPath[]; // sorted by fitScore desc
  topRecommendation: string; risks: string[];
  storyboard: { shot: number; visual: string; voiceover: string; seconds: number }[];
};

type Machine = {
  type: Process; model: string;
  envelopeMm: { x: number; y: number; z: number };
  materials: string[]; idleThisMonth: boolean; idleHoursPerWeek?: number;
};

type Shop = {
  id: string; name: string; neighborhood: string; // LA-area
  description: string; machines: Machine[];
  minOrderQty: number; maxOrderQty: number; typicalLeadDays: number;
  specialties: string[]; isDemoData: true;
};

type ShopMatch = {
  shopId: string; score: number; matchedMachine: Machine;
  reasons: string[]; requiredTweaks: string[]; idleBoost: boolean;
};
```

## AI analysis (`/api/analyze`)
- Input: notes, quantity, budget, material hints, geometry stats, images (base64).
- Use a strong system prompt: act as a veteran manufacturing engineer and product developer. Be specific to THIS part (reference its dimensions and features). No generic advice. Always give cost as ranges. Consider quantity: low volume favors print/CNC; high volume justifies tooling.
- Force JSON matching `Analysis`. Validate with zod; retry once on failure.
- Storyboard: a 30-second TV-commercial-style pitch aimed at a company decision-maker ("how will we sell this?"), 6 shots.

## Matching logic (`/api/match`) – deterministic, no AI needed
Score each shop machine against each recommended path:
- Process match with path (required)
- Part bounding box fits machine envelope (required; if it fails only slightly, add a "split part" tweak and penalize)
- Material overlap (+)
- Quantity within shop min/max (+/-)
- `idleThisMonth` → big boost + `idleBoost: true`
- Weight by the path's `fitScore`
Return top 5 with human-readable `reasons`.

## Seed data
- `data/shops.json`: 25 **fictional** LA-area shops (e.g. Vernon, Burbank, Gardena, Van Nuys, Downtown Arts District). Mix: machine shops, print farms, sheet-metal fabs, a small injection molder, a makerspace, a guitar/wood shop.
- About 40% of machines flagged idle.
- Every shop has `isDemoData: true` and the UI shows a "Demo data" badge. Do not use real business names.

## Pitch kit (`/project/[id]/pitch`)
- Hero renders: capture 3–4 angles from the r3f canvas (`gl.domElement.toDataURL()`) with studio lighting on a neutral backdrop.
- Sections: product name + one-liner, hero renders, "How it gets made" (top path + matched shop), cost card (unit/tooling ranges at target qty), storyboard as a 6-panel grid.
- Clean, presentation-ready design. Shareable URL. Print-to-PDF friendly.

## Build phases
Each phase ends with a working, demoable app.

| # | Phase | Owner | Done when |
|---|---|---|---|
| 0 | Scaffold, types (`lib/types.ts`), seed shops, layout | Claude Code | App runs, `/shops` lists seeded shops |
| 1 | Upload + 3D viewer + geometry extraction | Claude Code | Upload STL → spinning model + correct stats |
| 2 | `/api/analyze` + results page | Claude Code | Real AI paths/tweaks render for a sample part |
| 3 | `/api/match` + shop match UI | Codex (branch `feat/matching`) | Ranked matches with idle highlights |
| 4 | Pitch kit page + renders | Codex (branch `feat/pitch`) | Shareable pitch page from a real project |
| 5 | Polish, loading states, demo parts, STEP support if time | Both | Full demo runs in <3 min without errors |

## Agent coordination
- `lib/types.ts` is the contract. Don't change shared types without updating this file.
- Claude Code owns `main` and the core app. Codex works in feature branches on isolated modules (`lib/match.ts`, `app/project/[id]/pitch/`).
- Codex also reads `AGENTS.md`, so copy or symlink this file there.

## Demo prep
- Prepare 2–3 example projects in `demo/`: a guitar bridge or pedal enclosure (hero), plus one part where a tweak clearly changes the process (e.g. molded bracket → sheet metal).
- Test AI output on these early and tune the prompt until the tweaks are specific and credible.

## Rules
- Costs are always ranges, labeled as estimates.
- Shops are clearly fictional demo data.
- Keep the API key server-side.
- Favor a smooth, polished demo path over extra features.

## Working in this repo
- Next.js 16 (App Router), React 19, Tailwind v4, zod 4, vitest. Next 16 has breaking changes from older versions: check `node_modules/next/dist/docs/` before using an unfamiliar API.
- Commands: `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. All five must pass before merging to `main`.
- Shop data: `data/shops.json`, validated at load by `lib/schemas.ts` (`shopsSchema`). Read it through `getShops()` / `getShopById()` in `lib/shops.ts`, never by importing the JSON directly.
- Process names and display labels: `lib/processes.ts` (`PROCESSES`, `PROCESS_LABELS`).
- Colors are theme tokens in `app/globals.css` (`bg`, `surface`, `ink`, `muted`, `line`, `accent`, `idle`, `demo`) with light and dark values. Use them instead of raw Tailwind colors.
- Badges: `DemoBadge` and `IdleBadge` in `components/Badges.tsx`. Any UI showing a shop must show `DemoBadge`.
- Projects: read and write only through `lib/projectStore.ts` (`getProject`, `saveProject`, `createProject`). Storage is `.data/projects/<id>/` (gitignored); uploads are served by `GET /api/files/[id]/[file]` with an allowlist of file names.
- Geometry: `analyzeStl()` in `lib/geometry.ts` runs server-side at upload and stores `GeometryStats` on the project. STL is assumed to be in mm.
- 3D viewer: import `ModelViewer` from `@/components/viewer` (client-only, loaded with `ssr: false`). Don't use drei `<Html>` as a Suspense fallback inside the Canvas; it crashes under React 19.
- API routes return the `ApiResponse<T>` envelope from `lib/api.ts` (`ok()` / `fail()`).
- Demo parts: `npm run demo:stl` regenerates `demo/*.stl` from `lib/meshes.ts`.
- Sample project: `demo/sample-project.json` is a real saved Claude analysis of the pedal enclosure (250 units). Run `npm run demo:seed` to install it, then open `/project/yAeM9-RDOE`. Build the matching and pitch features against it; no API key needed. A test keeps it valid against `projectSchema`.
- AI analysis: `lib/analysis/` (`prompt.ts` builds the prompts, `run.ts` validates and retries once, `claude.ts` is the only file that calls the SDK). The model sees `analysisOutputSchema` (structural only); `analysisSchema` in `lib/schemas.ts` adds the business rules. Model and effort come from `IDLEFIT_MODEL` / `IDLEFIT_EFFORT` (default `claude-opus-5` / `high`). The local-capacity summary in the system prompt comes from `data/shops.json`, so editing shops changes the prompt.
