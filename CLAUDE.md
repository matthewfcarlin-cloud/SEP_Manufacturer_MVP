# Idlefit — Build Spec (working name)

## What we're building
> The product direction is now the creator studio (idea → design → make → money → launch → sell). `PRODUCT.md` is the product spec; the build plan is under "Phase 10+: Creator studio" below.

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
- Deploy: Railway (see "Deploying" under Working in this repo). Vercel would need storage moved off-disk first.
- API key in `.env.local` as `ANTHROPIC_API_KEY`. Never expose it to the client.

## Routes
- `/` – landing + "Start a project"
- `/new` – upload form
- `/project/[id]` – analysis results: viewer, paths, tweaks, shop matches
- `/project/[id]/pitch` – shareable pitch kit
- `/shops` – browse seeded shops (idle capacity visible)
- `/project/[id]?v=2` – a specific version (default: latest)
- `/project/[id]/versions/new?from=1&tweak=0.0` – new-version form, optionally applying an AI tweak
- `/project/[id]/compare?a=1&b=2` – side-by-side version comparison
- `POST /api/projects` – create a project (version 1); `POST /api/projects/[id]/versions` – add a version
- `POST /api/analyze` `{ projectId, version? }` – runs AI analysis on a version, returns `Analysis`
- `POST /api/match` `{ projectId, version? }` – returns ranked `ShopMatch[]`
- `POST /api/business-case/suggest-price` `{ projectId, version }` – AI retail price; starts a business case if there is none, otherwise only replaces the suggestion
- `PUT /api/business-case` `{ projectId, version, inputs }` – saves the user's inputs (keeps the suggestion)
- `POST /api/pitch` `{ projectId, version }` – AI writes the licensing-pitch text (replaces it); `PUT /api/pitch` `{ projectId, version, pitch }` – saves user edits
- `POST /api/projects/[id]/versions/[n]/renders` – multipart, exactly 4 PNGs captured in the browser; stored as `render-N.png` / `vN-render-N.png`
- `DELETE /api/projects/[id]`, `DELETE /api/projects/[id]/versions/[n]` – real deletes (owner only; examples refuse with 403)
- `PUT /api/projects/[id]/share` `{ enabled }`, `POST /api/projects/[id]/share/rotate` – public link on/off, revoke + reissue (owner only)
- `PUT /api/projects/[id]/versions/[n]/ai-inputs` `{ includePhotos, includeNotes }` – what the AI may see
- `/p/[token]` – public read-only pitch (noindex); its renders come only from `GET /api/share/[token]/[file]`
- `/privacy` – the plain-language privacy note
- `POST /api/sourcing/plan` `{ projectId, version, process? }` – AI plans the Alibaba search (search terms, supplier checks, RFQ); replaces the plan
- `POST /api/sourcing/draft` `{ projectId, version, supplierId }` – AI drafts the next message to one supplier, saved as its unsent draft
- `PUT /api/sourcing` `{ projectId, version, op }` – shortlist edits: add/update/remove supplier, paste a reply, save/discard a draft, mark a draft sent
- `POST /api/agent` – build agent, streams NDJSON answer events (Phase 10)
- `GET /api/orders?projectId&version`, `PUT /api/orders` `{ projectId, version, op }` – order coordination: run size, a source per BOM line, the assembler, drafts, sign-off; returns `{ order, lines, plan, assemblers }`
- `POST /api/orders/draft` `{ projectId, version, to, purpose }` – AI drafts a purchase order (only after sign-off) or an assembly quote request, saved as that recipient's unsent draft
- `GET/POST/DELETE /api/settings/ai-key`, `POST /api/settings/ai-key/test`, `GET /api/usage` – bring your own key (see "Backend API contract")
- `POST /api/events`, `POST/GET /api/outcomes` – feedback events and real-world outcomes for learning (see "Backend API contract")

## Data models
```ts
type Project = {
  id: string; name: string; createdAt: string;
  versions: ProjectVersion[]; // ascending by number, never empty (Phase 6)
  owner?: { keyHash: string }; // Phase 9: SHA-256 of the creating browser's owner cookie; absent on examples
  isExample?: true;           // shared demo: anyone can open and edit, nobody can delete or share
  share?: ShareLink;          // public pitch link, off until the owner turns it on
};

type ShareLink = { token: string; enabled: boolean; createdAt: string }; // token: 128-bit base64url
type AiInputs = { includePhotos: boolean; includeNotes: boolean };      // on ProjectVersion.aiInputs; absent = send everything

// Everything that describes one iteration of the part lives on its version.
type ProjectVersion = {
  number: number; createdAt: string; // numbers are never reused after a delete
  notes: string; targetQuantity: number; budgetUsd?: number; materialHints?: string[];
  cadFileUrl?: string; imageUrls: string[];
  geometry?: GeometryStats; analysis?: Analysis; renders?: string[];
  basedOn?: number; changeNote?: string; appliedTweak?: AppliedTweak;
  businessCase?: BusinessCaseInputs; // Phase 7: inputs only; outputs are computed
};

type BusinessCaseInputs = {
  retailPriceUsd: number; priceSource: "ai" | "user";
  quantityTiers: number[];   // 1-5, ascending
  revenueShare: number;      // share of retail the maker receives, default 0.5
  priceSuggestion?: PriceSuggestion;
};

type PriceSuggestion = { low: number; high: number; suggested: number; comparables: string[]; reasoning: string };

// Phase 8, on ProjectVersion: pitch?: PitchContent; pitchVideo?: PitchVideo
// Sourcing, on ProjectVersion: sourcing?: Sourcing (Alibaba; nothing is ever sent by the app)
type Sourcing = { plan?: SourcingPlan; suppliers: Supplier[] };
type SourcingPlan = { process: Process; createdAt: string; searchTerms: string[]; supplierChecks: string[]; rfq: string };
type Supplier = { id: string; name: string; listingUrl?: string; status: "shortlisted" | "contacted" | "negotiating" | "agreed" | "dropped";
  quote?: { unitUsd?: number; moq?: number; toolingUsd?: number; leadDays?: number }; notes?: string; createdAt: string;
  messages: { id: string; from: "me" | "supplier"; text: string; state: "draft" | "sent"; at: string; aiDrafted?: boolean }[] }; // at most one draft, always last
type PitchContent = { oneLiner: string; problem: string; product: string; audience: string; ask: string; editedByUser: boolean };
type PitchVideo = { status: "none" } | { status: "ready"; url: string; provider: string }; // nothing generates one yet

// Order coordination, on ProjectVersion: order?: OrderCoordination (choices only; the plan is computed; nothing is ever sent or ordered by the app)
type OrderLineKind = "custom_part" | "hardware" | "electronics" | "material" | "finish" | "packaging"; // = the BOM's categories
type OrderLine = { id: string; name: string; kind: OrderLineKind; quantityPerUnit: number; unit: "pc" | "set" | "g" | "m" | "ml"; spec?: string; process?: Process; material?: string };
type OrderSource = { kind: "local_quote"; quoteId: string } | { kind: "alibaba"; supplierId: string }
  | { kind: "catalog"; vendor: string; unitUsd: number; leadDays: number; moq?: number; overseas: boolean };
type OrderRecipient = { kind: "local_quote"; quoteId: string } | { kind: "alibaba"; supplierId: string } | { kind: "assembler"; assemblerId: string };
type OrderMessage = { id: string; to: OrderRecipient; purpose: "purchase_order" | "assembly_rfq"; subject: string; text: string; state: "draft" | "sent"; at: string; aiDrafted?: boolean };
type OrderCoordination = { runQuantity: number; assignments: { lineId: string; source: OrderSource }[]; assemblerId?: string; messages: OrderMessage[];
  signOff?: { at: string; fingerprint: string; landedTotalUsd: { low: number; high: number } } }; // valid only while fingerprint matches the plan
type AssemblyCapability = "mechanical" | "electronics" | "adhesive_bonding" | "finishing" | "testing" | "kitting" | "packaging" | "fulfillment";
type AssemblyPartner = { id: string; name: string; neighborhood: string; description: string; capabilities: AssemblyCapability[]; minUnits: number; maxUnits: number;
  setupUsd: number; laborUsdPerMinute: number; leadDays: number; idleThisMonth: boolean; isDemoData: true }; // data/assemblers.json, fictional

// Phase 10: one turn of a build-agent conversation (not stored; the browser keeps it)
type AgentMessage = { role: "user" | "assistant"; content: string };

type AppliedTweak = { fromVersion: number; process: Process; change: string; why: string; impact: string };

// AI gateway (BACKEND.md A1): one metered row per AI call, never any prompt or response content
type AiTask = "analyze" | "agent_chat" | "price" | "pitch" | "sourcing_plan" | "negotiation" | "order_draft";
type KeySource = "user" | "house";
type AiErrorCode = "invalid_key" | "quota_exceeded" | "budget_exhausted" | "provider_down"; // `code` on AI error responses
type AiErrorKind = Exclude<AiErrorCode, "budget_exhausted">;                                // provider failures (AiError.kind)
type AiKeyInfo = { provider: "anthropic"; maskedKey: string; createdAt: string };           // maskedKey like "sk-ant-…7Q2f"
type UsageSummary = { keySource: KeySource; maskedKey?: string; demoBudgetRemainingUsd: number };

// Learning pipeline (BACKEND.md B1): structured fields only, source decided server-side
type LearningSource = "demo" | "real";
type ProductEventType = "analysis_run" | "tweak_applied" | "tweak_rated" | "quote_requested" | "quote_chosen"
  | "plan_generated" | "listing_generated" | "listing_copied" | "agent_question" | "agent_rated";
type ProductEvent = { id: string; workspaceId: string; projectId: string; version?: number; type: ProductEventType;
  payload: Record<string, string | number | boolean>; source: LearningSource; createdAt: string };
type OutcomeKind = "real_quote" | "actual_unit_cost" | "units_sold" | "tweak_cost_delta";
type Outcome = { id: string; projectId: string; version: number; kind: OutcomeKind; process?: Process; material?: string;
  quantity?: number; estimateUsd?: { low: number; high: number }; actualUsd?: number; value?: number; source: LearningSource; createdAt: string };
type UsageRecord = { at: string; workspaceId: string; task: AiTask; provider: "anthropic"; model: string;
  inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number;
  estCostUsd: number; keySource: KeySource; latencyMs: number; ok: boolean; errorKind?: AiErrorKind };

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
  unitCostAtVolume?: { quantity: number; low: number; high: number }[]; // 10/100/1k/10k units (added round 2)
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
| 6 | Iteration tracking (versions, compare, timeline) | Claude Code | Built; see Phases 6–9 below |
| 7 | Business case per version | Claude Code | Built; see Phases 6–9 below |
| 8 | Pitch to company (licensing pitch, PDF, video slot) | Claude Code | Built; see Phases 6–9 below |
| 9 | Privacy by default (ownership, share links, delete) | Claude Code | Built; see Phases 6–9 below |

## Phases 6–9

Build one phase at a time, in order. Stop after each for manual testing. Every phase must keep the existing demo flow working: landing → example project → pitch kit, and upload → analyze. `npm test`, `typecheck`, `lint`, `build` and `test:e2e` pass at the end of each phase. Type changes go into `lib/types.ts` **and** the "Data models" section above in the same commit.

### Where the app is today (what these phases build on)
- A project is one flat record: `project.json` in `.data/projects/<id>/` holds the brief, `geometry`, and `analysis`. Files sit beside it as `model.stl` and `image-N.ext`; the allowlist regex in `lib/projectStore.ts` is the only thing that decides which files `/api/files/[id]/[file]` serves.
- Shop matches aren't stored. `matchProject(project)` recomputes them on every render from `geometry` and `analysis`.
- Pitch renders are captured in the browser on every visit to the pitch page and never saved. `Project.renders` exists but nothing writes it.
- There are no accounts, owners or sessions. `/projects` lists every project and `/api/files` serves every file to anyone who has the 10-character id. Nothing is private today.
- `unitCostAtVolume` (priced at 10/100/1k/10k) exists on every path in both demo projects. Older analyses may not have it.

### Phase 6 – Iteration tracking

**Data model** (`lib/types.ts`)
```ts
type Project = {
  id: string; name: string; createdAt: string;
  versions: ProjectVersion[];     // ascending by number, never empty
  // Phase 9 adds: owner, share, isExample
};

type ProjectVersion = {
  number: number;                 // 1, 2, 3… never reused after a delete
  createdAt: string;
  notes: string; targetQuantity: number; budgetUsd?: number; materialHints?: string[];
  cadFileUrl?: string; imageUrls: string[];
  geometry?: GeometryStats; analysis?: Analysis; renders?: string[];
  changeNote?: string;            // "what changed", from the new-version form
  appliedTweak?: AppliedTweak;    // set when the user picked an AI tweak as the reason
};

type AppliedTweak = { fromVersion: number; process: Process; change: string; why: string; impact: string };
```
- Per-version fields are exactly the fields that are flat on `Project` today, so each version carries its own brief, CAD, photos, geometry and analysis. Matches stay derived: `matchProject` becomes `matchVersion(version)`, still deterministic.
- Files: version 1 keeps its existing unprefixed names (`model.stl`, `image-0.jpg`), so no stored file or URL moves. Versions 2 and up use `v2-model.stl`, `v2-image-0.jpg`. The allowlist becomes `^(v\d{1,3}-)?(model\.stl|image-[0-4]\.(jpg|png|webp))$`.
- Migration is lazy and pure. `migrateProject(raw)` in `lib/projectMigration.ts` turns a legacy flat `project.json` into `{ id, name, createdAt, versions: [v1] }`. `getProject` runs it on every read, and the next `saveProject` writes the new shape. `demo/*.json` get converted to the new shape, and a legacy fixture test keeps the migration path covered.
- Add `lib/versions.ts` with helpers: `latestVersion(p)`, `getVersion(p, n)`, `nextVersionNumber(p)`.

**Routes**
- `/project/[id]` shows the latest version. `/project/[id]?v=2` shows a specific one. Everything on the page (viewer, geometry, brief, analysis, matches) reads from the selected version.
- `/project/[id]/versions/new` is the "New version" form. It reuses the `NewProjectForm` fields with the previous version's notes, quantity and budget prefilled, plus a required "What changed?" note and an optional tweak picker listing every `designTweaks` entry from the previous version's analysis. `?tweak=<pathIndex>.<tweakIndex>` preselects a tweak, and a "Try this tweak" link on each `PathCard` tweak links there.
- `POST /api/projects/[id]/versions`: multipart, same validation as `POST /api/projects` (the shared parts get extracted rather than copied). Returns `{ id, version }`.
- `POST /api/analyze` and `POST /api/match` take `{ projectId, version? }` and default to the latest version.
- `/project/[id]/compare?a=1&b=2` is the comparison view.
- When a version has `changeNote` or `appliedTweak`, `buildProjectBrief` adds a short "Revision" block ("v2 revised from v1: <change>. v1's top path was <process> at <unit cost>.") so the AI judges the change instead of starting from zero.

**UI**
- Version timeline on the project page: a horizontal strip of version chips (number, date, best process, unit-cost midpoint, change note), with the selected one highlighted. Actions: "New version" and "Compare".
- Comparison view: two version pickers, then a side-by-side table of unit cost at target quantity, tooling cost, best process, fit score and top shop match. Each row gets a delta column with a signed percent and a color. A one-line summary sits on top ("Unit cost −40%, tooling −$18k, switched from injection molding to sheet metal"). If the two target quantities differ, a warning says the costs aren't like-for-like. Unanalyzed versions show "Not analyzed yet" instead of numbers.
- Deltas come from a pure function, `compareVersions(a, b)` in `lib/compare.ts`, that compares range midpoints, with unit tests. The page does no math.

**Done when**
- Both demo projects and every existing `.data` project open unchanged as "v1", and their file URLs still work.
- Creating v2 of the bracket by applying the "sheet metal" tweak produces its own geometry, analysis and matches, while v1's are untouched.
- The comparison of v1 and v2 shows correct deltas and a summary sentence. `compareVersions` and `migrateProject` are unit-tested, including the legacy fixture.
- E2E: open example → New version → upload → v2 appears in the timeline → Compare renders.

### Phase 7 – Business case (per version)

**Data model**
```ts
type BusinessCaseInputs = {
  retailPriceUsd: number;
  priceSource: "ai" | "user";
  quantityTiers: number[];         // 1–5 tiers, ascending, default [100, 1000, 10000]
  revenueShare: number;            // share of retail the maker actually receives, default 0.5 (see open question)
  priceSuggestion?: PriceSuggestion;
};
type PriceSuggestion = {
  low: number; high: number; suggested: number;
  comparables: string[];           // "similar products" named by the AI, from its own knowledge
  reasoning: string;               // one or two sentences
};
// ProjectVersion gains: businessCase?: BusinessCaseInputs
```
- Only the inputs and the AI suggestion are stored. Every output is computed by `lib/businessCase.ts` (pure and tested), so the output always reflects the current analysis:
  - `unitCostAt(path, q)`: log-log interpolation over `unitCostAtVolume`. Tiers outside 10–10k are clamped and flagged `extrapolated`. Legacy analyses with no curve fall back to the flat `unitCostUsd`, flagged in the same way.
  - Per tier: the cheapest path at that tier (by all-in midpoint, the same rule as `cheapestByVolume`), its unit cost range, all-in cost range including amortized tooling, and margin range. The low margin uses the high cost, so the ranges stay honest.
  - Tooling break-even: the smallest quantity where cumulative contribution (`price × revenueShare − unitCost(q)`) covers tooling, solved over the interpolated curve and given as a range. "Never at this price" is a valid answer.
  - `verdict(result)` builds the plain-English line from templates, with thresholds as named constants (e.g. `MIN_HEALTHY_MARGIN = 0.3`). Examples: "Profitable at 1,000+ units at $49 retail (est. margin 31–44%)." / "Tooling makes this unprofitable under ~5,000 units. Consider <lowest-tooling path> or <top tweak>." / "Not profitable at any tier shown: cost floor is ~$X, so retail would need to be ≥ $Y." The "consider X" part comes deterministically from the analysis, not from a new AI call.

**Routes**
- `POST /api/business-case/suggest-price` `{ projectId, version }` makes a small, separate Claude call (`lib/analysis/price.ts`, its own zod output schema, low effort) that returns a `PriceSuggestion`. It doesn't rerun the full analysis.
- `PUT /api/business-case` `{ projectId, version, retailPriceUsd, quantityTiers, revenueShare }` validates and saves the inputs.

**UI**
- A "Business case" section on the project page, below the analysis. It has a price input with an "AI suggests $45 ($39–55), based on …" chip that shows the comparables and can be applied or edited, tier inputs, and the revenue-share assumption stated in plain words.
- A results table per tier: process, unit cost, all-in cost and margin, all as ranges.
- A cost-per-unit vs quantity chart: an all-in cost band, a horizontal line at your revenue per unit, and a marker at the break-even point. It extends `CostByVolumeChart`'s approach and series tokens, and gets built with the dataviz skill.
- The verdict line in large type.
- Every number is labeled "est." The section footer says: "Estimates from the AI analysis. Retail suggestion is based on the AI's general knowledge of similar products, not live market data."

**Done when**
- The pedal demo shows a business case with an AI-suggested price, three tiers, a chart and a verdict. Changing the price updates the verdict at once, client-side, with no refetch.
- The bracket demo's verdict names the tooling problem when the price is set low.
- `lib/businessCase.ts` has unit tests for interpolation, clamping, the legacy fallback, break-even (including "never") and each verdict template.
- Each version keeps its own business case, and the Phase 6 comparison view gains a margin row.

### Phase 8 – Pitch to company

**Data model**
```ts
type PitchContent = {
  oneLiner: string;
  problem: string;                 // who hurts and how, 2–3 sentences
  product: string;                 // what it is and why it's better
  audience: string;                // who buys it / which company would license it
  ask: string;                     // what the inventor wants from the company
  editedByUser: boolean;
};
type PitchVideo = { status: "none" } | { status: "ready"; url: string; provider: string };
// ProjectVersion gains: pitch?: PitchContent
// Project gains: pitchVideo?: PitchVideo   (always { status: "none" } until a video API is wired)
```
- The pitch shows the latest analyzed version, and the iteration story draws on all versions.

**Routes**
- `POST /api/pitch` `{ projectId, version }` makes a small Claude call that generates `PitchContent` from the brief, analysis, business case and change notes, and saves it.
- `PUT /api/pitch` saves user edits.
- `POST /api/projects/[id]/versions/[n]/renders` persists the four captured renders as PNGs (`v2-render-0.png`; the allowlist gains `render-[0-3]\.png`) and sets `version.renders`. Once they're saved, the pitch page shows the stills with no WebGL, so it loads fast, prints reliably and works on the Phase 9 shared page. A "Re-render" button redoes the capture.
- `/project/[id]/pitch` is the owner's view and gets inline edit affordances. The read-only body is one `PitchDocument` component that Phase 9's share page reuses.

**UI**: sections in this order, each a print page
1. Cover: name, one-liner, hero render.
2. The problem.
3. The product, with the 3 other renders.
4. How it gets made: top path, the matched shop's spec-level fit, lead time.
5. Unit economics: the Phase 7 table, chart and verdict. If there's no business case yet, it says so, with a link to set one up, rather than showing made-up numbers.
6. Iteration story: a version-by-version strip showing each change note or applied tweak with its `compareVersions` delta ("v1 → v2: switched to sheet metal, unit cost −40%"). Hidden when there's only one version.
7. The 30-second storyboard: 6 frames.
8. Video placeholder: a 16:9 slot titled "Pitch video" that shows "Not generated yet" and presents the storyboard as the script. It renders `PitchVideo.url` when `status: "ready"`.
9. The ask, plus a footer with estimate and demo-data labels.

**PDF**: done with a print stylesheet. Landscape Letter via `@page`, one section per page (`break-before: page`), no nav, stored renders only. "Download PDF" opens the print dialog with the filename set through `document.title`. No server-side PDF dependency.

**Done when**
- The pedal demo's pitch shows all 9 sections, and editing the problem text persists.
- Print preview in Chrome gives a clean page per section with no clipped charts or blank renders.
- With two versions, the iteration story shows the delta. With one, the section is hidden.
- E2E updated: the existing "four non-blank renders" test still passes against persisted renders.

### Phase 9 – Privacy by default

> **Scope (decided 2026-09-26): MVP-light.** This is a club demo, so outreach and privacy only need to *look* ready and be implementable later; no real shop contact, no accounts. One hard line: the UI never claims a protection the code doesn't provide. Build the cheap version that makes "private by default" true (owner cookie, hidden listings, 404s, share links, real deletes) and cut anything heavier than that. Stubbed flows (e.g. contacting a shop) are labeled as demo, not presented as working.

**Ownership (this app has no accounts)**: projects are owned by the browser that created them.
- On first project creation the server issues a random 256-bit owner key in an `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie (`idlefit_owner`). The project stores only its SHA-256 hash.
- `lib/access.ts` exports `canView(project, request)` / `requireOwner(...)`, called explicitly in every page and API route that reads or writes a project, and in `/api/files`. Pages that fail the check show 404, not 403, so a project's existence isn't revealed.
- Demo examples are marked `isExample: true`: readable by anyone, never deletable, never mutated by visitors. Visitors who want to iterate on one get "Duplicate to my projects".
- `/projects` lists only your projects plus the examples.

**Data model**
```ts
// Project gains:
owner?: { keyHash: string };        // absent only on examples
isExample?: true;
share?: { token: string; enabled: boolean; createdAt: string }; // token: 128-bit random, base64url
// ProjectVersion gains:
aiInputs: { includePhotos: boolean; includeNotes: boolean };   // default both true, migrated as true
```

**Routes**
- `/p/[token]` is the public pitch page and the only unauthenticated way in. It renders `PitchDocument` from stored renders and never exposes the CAD file, photos, notes or project id. Its files come through `/api/share/[token]/[file]`, restricted to `render-*.png`.
- `.data/shares/<token>.json` maps token → projectId, so lookups don't scan every project.
- `PUT /api/projects/[id]/share` `{ enabled }` toggles sharing. `POST /api/projects/[id]/share/rotate` revokes by issuing a new token, which deletes the old index file and kills the old link.
- `DELETE /api/projects/[id]` removes the project folder recursively plus its share index. `DELETE /api/projects/[id]/versions/[n]` removes that version's files and entry. Deleting the only version is refused; the UI offers project deletion instead. Both require the typed project name in a confirm dialog.
- `/api/files` switches from `max-age=31536000, immutable` to `private, no-store`, so deleted or revoked files don't live on in browser caches.
- `/privacy` is a short page.

**UI**
- "What the AI sees" panel on the upload form, the new-version form, and next to "Analyze". It lists exactly what gets sent: the name, notes, quantity, budget, material hints, each photo as a thumbnail, and the measured geometry lines. The project-page panel shows the literal `buildProjectBrief` text. It states plainly that "Your CAD file itself is not sent, only these measurements". That matches `lib/analysis/prompt.ts` today, and a test pins it. Toggles exclude photos or notes and are saved to `aiInputs`, and `/api/analyze` honors them.
- Shop matches show a "What this shop would see" spec summary (bounding size, material, quantity, process) built by `lib/specSummary.ts`, plus an honest line: "Demo shops are fictional and receive nothing. When real shops are connected, they'll see only this summary until you choose to share more." There's no "share more" button until there's a real shop to share with.
- A share panel on the pitch page: off by default, with a toggle, copy link, and "Revoke and create a new link".
- Delete buttons for the project and for each version, in the timeline.
- Privacy note (in the upload form, the analysis panel and `/privacy`), with no claims the code doesn't back:
  - Projects are private to this browser.
  - Photos, notes and measurements are sent to Anthropic's API for analysis, under Anthropic's API data policies.
  - Deleting here removes the files from this server but can't recall what was already sent for analysis.
  - Clearing cookies loses access, because there are no accounts yet.
  - Shared links are viewable by anyone who has them.

**Done when**
- A second browser can't see a project, its files, its pitch or its `/projects` entry, and gets 404s.
- Turning sharing on makes `/p/<token>` work for that browser. Turning it off, or rotating, makes the old link 404.
- The analyze request honors the photo and notes toggles, proven by a unit test on the built request.
- After deleting a version or project, its files are gone from `.data` (asserted in tests) and its URLs 404.
- Demo examples still open for everyone, and the full demo flow still passes E2E.

## Agent coordination
- `lib/types.ts` is the contract. Don't change shared types without updating this file.
- Claude Code owns `main` and the core app. Codex works in feature branches on isolated modules (`lib/match.ts`, `app/project/[id]/pitch/`).
- Codex also reads `AGENTS.md`, so copy or symlink this file there.

## Demo prep
- Prepare 2–3 example projects in `demo/`: a guitar bridge or pedal enclosure (hero), plus one part where a tweak clearly changes the process (e.g. molded bracket → sheet metal).
- Test AI output on these early and tune the prompt until the tweaks are specific and credible.

## Phase 10+: Creator studio

Idlefit is repositioned as the all-in-one studio for first-time product creators: **idea → design → make → money → launch → sell**. `PRODUCT.md` is the product spec (why and what); this file stays the build reference (how). Build in this order, one commit each, stopping after each for testing:

| # | Build | Done when | Status |
|---|---|---|---|
| 1 | Studio dashboard `/studio` | Opening the studio shows every product, its stage, key numbers and next step at a glance | Built |
| 2 | Agent assist on every product screen | "How do I make this cheaper?" answers with this part's features and numbers | Built (quotes and plan join its context in builds 3–4) |
| 3 | Manufacturer outreach | Five labeled demo quotes appear, sort by price and lead time, and one can be chosen | Built |
| 4 | Plan and timeline | Choosing a quote re-dates the launch | Planned |
| 5 | Selling (Etsy listing) | A full listing copies into Etsy in under a minute | Planned |

**Rules for every build**
- Keep the design system exactly: dark header, huge uppercase `display-type` headings, mono `eyebrow` labels, orange `accent`, sharp corners, `night-*` tokens on dark bands. Extend, don't restyle. Check light, dark and phone widths.
- Every screen looks finished at rest: loading skeletons, empty states, no layout shift. Every animation respects `useReducedMotion()` / `motion-reduce:`.
- Costs are ranges labeled "est."; demo data is always badged (`DemoBadge`, "Demo quote").
- Derived state (stage, next step, deltas) is computed by pure, tested functions, never stored and never AI.
- AI features go through `aiBudgetGate` and the AI gateway (`lib/ai/gateway.ts`, which meters every call), and read notes/photos via `lib/aiInputs.ts`. Only `lib/ai/providers/` touches a provider SDK.
- The demo projects are seeded so the dashboard, quotes and plan have data the moment the app opens (`demo/*.json` + `npm run demo:seed`).
- `lib/types.ts` stays the contract: each build adds its types there and in the data-model block above, in the same commit.

**Routes (planned unless marked)**
- `/studio` (built): the creators' home (header link "Studio"); `/projects` redirects there. `/` stays the marketing landing.
- Product screens share a tab bar and the agent panel: `/project/[id]` (design + money, built), `/project/[id]/make` (outreach + quotes, built), `/project/[id]/plan`, `/project/[id]/pitch` (built), `/project/[id]/sell`.
- `POST /api/projects/[id]/versions/[n]/quotes` (built): request quotes (spec sheet + simulated demo quotes). `PATCH .../quotes/[quoteId]` `{ status }`, `POST .../quotes/[quoteId]/choose` (built).
- `POST /api/plan` `{ projectId, version }`: Claude drafts milestones as zod-validated JSON; choosing a quote re-dates the plan without an AI call.
- `POST /api/listing` `{ projectId, version }`: generates the Etsy listing.
- `POST /api/agent` (built): the agent's streamed answers.

**New types (added to `lib/types.ts` by the build that uses them)**
```ts
type Stage = "idea" | "design" | "make" | "money" | "launch" | "sell"; // build 1 (in lib/types.ts), derived, never stored

// Build 3 (in lib/types.ts), on ProjectVersion.outreach
type ShareLevel = "summary" | "full";
type QuoteStatus = "sent" | "quoted" | "sample" | "ordered";
type DemoQuote = {
  id: string; shopId: string; machineModel: string; process: Process;
  quantity: number; unitPriceUsd: number;   // simulated, inside the analysis unit-cost range for that process
  toolingUsd: number; leadTimeDays: number; moq: number;
  note: string; status: QuoteStatus; isDemo: true;
};
type SpecSheet = {
  shareLevel: ShareLevel; process: Process;
  dimensionsMm: { x: number; y: number; z: number }; material: string; finish: string;
  quantityTiers: number[]; targetUnitPriceUsd?: number; quoteBy: string; // YYYY-MM-DD
  renders: string[]; notes?: string; // only with shareLevel "full" (notes only if aiInputs allows)
};
type Outreach = { requestedAt: string; specSheet: SpecSheet; quotes: DemoQuote[]; chosenQuoteId?: string };

// Build 4, on ProjectVersion.plan
type MilestoneKey = "finalize_design" | "prototype" | "sample_approval" | "tooling" | "production" | "photos" | "listing" | "launch";
type Milestone = { key: MilestoneKey; title: string; startDate: string; endDate: string; budgetUsd: { low: number; high: number }; note?: string };
type LaunchPlan = {
  generatedAt: string; startDate: string; launchDate: string;
  basedOn: { kind: "quote"; quoteId: string } | { kind: "analysis" };
  milestones: Milestone[]; warnings: string[];
};

// Build 5, on ProjectVersion.listing
type EtsyListing = { title: string; description: string; tags: string[]; priceUsd: number; photos: string[]; generatedAt: string }; // title ≤ 140 chars, exactly 13 tags
```

### Build 1 – Studio dashboard (built)
- `/studio` (`app/studio/page.tsx`, skeleton in `loading.tsx`): dark header band (title + products/versions/idle-machine stats), then one `StudioCard` per product this browser can see (own products newest first, then examples), plus a "Start a product" card. Header and footer link "Studio"; `/projects` redirects to `/studio`; deletes land there.
- Derived, pure, tested (`lib/studio/`): `stageProgress()` (a stage is done when its data exists on the latest version; the current stage is the first gap, so later stages can be done out of order), `nextStep()` (ordered rules: wrong units → analyze → set a price → rework if unprofitable at every volume → talk to a shop → write pitch → share; each links to the screen that does it), `keyNumbers()` (best-path unit cost at target qty, retail, margin at target qty) and `unitCostTrend()` (best-path unit cost per analyzed version). Make/Launch/Sell rules gain quotes, plan and listing in builds 3–5.
- `StudioModel` mounts the WebGL viewer only while the card is on screen (browsers cap live contexts), shows the saved render or a skeleton until `onReady`, spins slowly (`rotateSpeed` 0.5, zoom off) and not at all under reduced motion. `ModelViewer` gained `rotateSpeed`, `enableZoom`, `onReady`, `showLoading` (defaults unchanged).
- Grid children need `min-w-0` or a long title widens the page on phones (E2E checks no horizontal scroll at 390 px).

### Build 3 – Manufacturer outreach (built)
- `/project/[id]/make` is the Make stage screen (latest version): **Local shops · demo** (request panel → comparison → spec sheet as sent) and **Overseas · Alibaba** (the teammate-built `SourcingPanel`, moved here from the overview; the overview links to Make). Product screens share a tab bar (`components/product/ProductNav.tsx`, in the product layout): Design & money · Make · Launch.
- `POST /api/projects/[id]/versions/[n]/quotes` `{ shareLevel }` builds the spec sheet and simulates quotes from the top 5 matches, replacing any earlier request. `PATCH .../quotes/[quoteId]` `{ status }` and `POST .../quotes/[quoteId]/choose` edit it through `editOutreach()` (`lib/outreach/store.ts`, under the project lock). Access: owner or example, like other edits.
- Pure and tested (`lib/outreach/`): `buildSpecSheet()` (summary by default; "full" adds renders, and notes only if `aiInputs` allows; target price = revenue per unit × (1 − 30% healthy margin); quote-by = request + 7 days), `simulateQuotes()` (deterministic, seeded by project/version/shop/request time; price placed inside the analysis unit-cost range for the shop's process, lower for idle machines and orders in the shop's range; tooling inside the tooling range; notes in the shop's voice, never claiming experience it doesn't list), `compare.ts` (best value = lowest all-in per unit, tooling spread over max(qty, MOQ); fastest; sorts), `pipeline.ts` (Sent → Quoted → Sample → Ordered, forward only; only the chosen quote can be ordered).
- Quotes are single figures (they're prices, not estimates) and are always badged "Demo quote" (`DemoBadge label`), each shown next to the analysis estimate range for its process.
- Make is done when a quote is chosen **or** an Alibaba supplier is "agreed". Next step: "Request quotes" → "N quotes waiting". The agent's context lists the quotes (chosen marked) and the Alibaba shortlist; its Make starters change once quotes exist.
- Seeded: the pedal has 5 quotes (none chosen); the bracket v2 has 5 with the best value chosen. Regenerate by requesting quotes through the API on a fresh seed and copying `.data` back to `demo/`.

### Build 2 – Agent assist (built)
- The panel lives in `app/project/[id]/layout.tsx`, so every product screen (overview, compare, new version, pitch, and future make/plan/sell) has it, and a conversation survives moving between them. It always works on the **latest** version.
- Starters come from the current journey stage: `starterQuestions(project)` → `starterQuestionsForStage(stage, project)` in `lib/agent/starters.ts`, three per stage, built from the product's numbers (no AI call).
- The context opens with the current stage and the app's suggested next step (`stageProgress` + `nextStep`), and the system prompt requires costs, prices and margins as ranges labeled est., focused on that stage.
- The panel slides in from the right (instant under reduced motion) and shows "Stage: …" in its header.
- Builds 3 and 4 must add the quotes and the plan to `buildAgentContext()`.

The chat underneath (built first as "phase 10"):
- `POST /api/agent` `{ projectId, version?, messages: AgentMessage[] }` streams newline-delimited JSON events (`lib/agent/protocol.ts`: `text` deltas, then `done` or `error`). Validated by `agentRequestSchema` (alternating turns starting and ending with the user, ≤24 turns, ≤4,000 chars each).
- `streamAgentReply()` in `lib/analysis/callers.ts` streams through `gateway.stream()` (task `agent_chat`: adaptive thinking, effort `medium`, server-side fallback). The system prompt (`lib/agent/prompt.ts`) is followed by the product context as a second system block with `cache_control`, so follow-up turns re-read it from cache.
- Context: `buildAgentContext()` (`lib/agent/context.ts`) = brief (notes via `notesForAi`), geometry, analysis paths and tweaks, cost-by-volume, business case tiers and verdict, top 5 shop matches (labeled fictional), version history. Photos are never sent to the agent.
- Budget: action `chat` (estimate $0.10). The gateway charges the real cost when the stream finishes, or the estimate if it breaks after text was sent. A refusal ends with an `error` event.
- UI: `components/agent/BuildAgent.tsx`, a launcher button plus side panel (full-screen on phones, Escape closes, Stop while streaming). Three starters from `starterQuestions()` (`lib/agent/starters.ts`), built from the version's own numbers, no AI call. Conversations live in the browser only; they aren't stored.

## Backend API contract

For the frontend agent (BACKEND.md A2). All routes use the `ApiResponse<T>` envelope from `lib/api.ts`. Every route below works on the calling browser's workspace (its `idlefit_owner` cookie); without that cookie they answer 400. Types are in `lib/types.ts`.

```ts
// Success
{ success: true, data: T, error: null }
// Failure. `code` is present only for AI failures the UI should handle specially.
{ success: false, data: null, error: string /* plain English, safe to show */, code?: AiErrorCode }
```

### `GET /api/settings/ai-key`
- 200 → `{ key: AiKeyInfo | null }`, e.g. `{ key: { provider: "anthropic", maskedKey: "sk-ant-…7Q2f", createdAt: "2026-09-27T20:00:00.000Z" } }`

### `POST /api/settings/ai-key`: test, then save
- Request: `Content-Type: application/json` (anything else → 415), body `{ provider?: "anthropic", apiKey: string }` (1–256 chars after trimming).
- Tests the key with a one-token call, and saves it (encrypted, replacing any earlier key) only if the test passes.
- 200 → `AiKeyInfo` (masked; the full key is never returned).
- Errors: 400 bad body · 415 not JSON · 422 `invalid_key` (not shaped like `sk-ant-…`, no provider call made) · 401 `invalid_key` (Anthropic rejected it) · 429 `quota_exceeded` (the key signs in but is rate-limited or out of credit; not saved) · 503 `provider_down` · 429 without a code: too many key checks (10 per browser per 10 minutes, shared with `/test`) · 500 unexpected.

### `POST /api/settings/ai-key/test`: test only, never saves
- Same request, validation and errors as the POST above.
- 200 → `{ valid: true }`

### `DELETE /api/settings/ai-key`
- 200 → `{ removed: boolean }` (false if there was no key). AI calls go back to the demo budget.

### `GET /api/usage`: for the header pill
- 200 → `UsageSummary`: `{ keySource: "house", demoBudgetRemainingUsd: 2.55 }` or `{ keySource: "user", maskedKey: "sk-ant-…7Q2f", demoBudgetRemainingUsd: 2.55 }`.
- `demoBudgetRemainingUsd` is this browser's demo budget left today, capped by the site's daily budget, rounded down to cents. It's reported even when the creator uses their own key.

### `POST /api/events`: feedback from the browser (BACKEND.md B1)
- Request: JSON (anything else → 415), `{ events: ClientEvent[] }` with 1–50 events. Payloads are strict: unknown keys or other values → 400.
  ```ts
  type ClientEvent =
    | { projectId: string; version: number; type: "tweak_rated"; payload: { tweak: string /* "pathIndex.tweakIndex", as in ?tweak= */; rating: "up" | "down" } }
    | { projectId: string; version: number; type: "agent_rated"; payload: { turnIndex: number /* index in the conversation */; rating: "up" | "down" } }
    | { projectId: string; version: number; type: "listing_copied"; payload: { field: "title" | "description" | "tags" | "price" } };
  ```
- 200 → `{ accepted: number; dropped: number }`. Events for a project this browser can't see, a missing version, or a tweak that isn't in that version's analysis are dropped silently, never an error. Fire and forget: the UI shouldn't block on or show failures.
- 429: more than 600 events per browser per 10 minutes.
- Ratings are append-only. A later rating of the same tweak or answer supersedes an earlier one (the learning jobs take the latest), so the UI can just send the new state on every click.
- Every other event type is logged by the server where it happens, and clients can't send it: `analysis_run` (analyze), `tweak_applied` (new version from a tweak), `quote_requested` and `quote_chosen` (always `demo`, since the quotes are simulated), and `agent_question` (the conversation's length only, never the text). `plan_generated` and `listing_generated` will be logged by builds 4 and 5.

### `POST /api/outcomes`: real-world results, typed in by the creator
- Request: JSON, one of:
  ```ts
  { projectId: string; version: number; kind: "real_quote"; process: Process; quantity: number; actualUsd: number /* per unit */; material?: string }
  { projectId: string; version: number; kind: "actual_unit_cost"; process: Process; quantity: number; actualUsd: number }
  { projectId: string; version: number; kind: "units_sold"; value: number /* whole units */ }
  ```
  `quantity` is 1–10,000,000, `actualUsd` is > 0 and ≤ 1,000,000, and `value` is an integer. `material`, if sent, must be one of that path's `materials` (case-insensitive; stored as listed). This keeps free text out.
- 201 → the stored `Outcome`. `estimateUsd` is the analysis's unit-cost range for that process at that quantity, computed by the server; the UI can show it next to the real number. `source` is `"demo"` on shared examples. Suggested UI copy for that case: "Saved. Examples don't count toward learning."
- Errors: 400 bad body, or a material not on the list (the message lists the allowed ones) · 404 project or version not found · 422 the version isn't analyzed, or the process isn't one of its paths · 429 more than 60 per browser per 10 minutes.

### `GET /api/outcomes?projectId=…&version=N`
- 200 → `{ outcomes: Outcome[] }` for that version, oldest first. 404 if this browser can't see the project.

Events and outcomes are stored in the project's folder. Deleting the project deletes them, and deleting a version deletes that version's rows. Only the creator's own projects give `source: "real"`, and only real rows will ever be learned from (B2+, which also adds the opt-in).

### AI error codes (every AI route: analyze, price, pitch, sourcing, agent)
JSON routes return the code in the envelope. `POST /api/agent` streams it as `{ "type": "error", "message": string, "code"?: AiErrorCode }`. The `error` or `message` text is already written for the creator. Use `code` to choose the banner's action.

| code | HTTP | when | suggested UI |
|---|---|---|---|
| `invalid_key` | 401 (their key) / 503 (house key) | the provider rejected the key, or a saved key can't be decrypted any more | link to Settings |
| `quota_exceeded` | 429 | the key's account is rate-limited or out of credit | their key: link to the Anthropic Console; house key: suggest adding their own key |
| `budget_exhausted` | 429 | no key of their own, and the demo budget (browser or site-wide daily) is used up | link to Settings to add a key |
| `provider_down` | 503 | Anthropic is unreachable, overloaded, or returned an error | retry later |

A browser with its own key is never charged to the demo budget and never falls back to the house key: if its key fails, the call fails with that key's error.

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
- Projects: read and write only through `lib/projectStore.ts` (`getProject`, `createProject`, `addVersion`, `updateProject`, `updateVersion`). Storage is `.data/projects/<id>/` (gitignored); uploads are served by `GET /api/files/[id]/[file]` with an allowlist of file names. Every read-modify-write goes through `updateProject`/`updateVersion`, which re-read under a per-project lock. Never do `getProject` → long await → `saveProject`: a version added meanwhile would be lost.
- Versions (Phase 6): helpers in `lib/versions.ts` (`latestVersion`, `latestAnalyzedVersion`, `getVersion`, `parseVersionParam`). Version 1 files keep their original names (`model.stl`, `image-0.jpg`); version n > 1 files are `vn-model.stl` etc. Pre-Phase-6 flat `project.json` files are migrated on read by `lib/projectMigration.ts` (fixture: `test/fixtures/legacy-project.json`). Matches are per version: `matchVersion(version)`. Version deltas come only from `compareVersions` in `lib/compare.ts`. AI tweak picks are sent as `pathIndex.tweakIndex` and resolved server-side by `lib/tweaks.ts`, so the stored text is always the real analysis text.
- Geometry: `analyzeStl()` in `lib/geometry.ts` runs server-side at upload and stores `GeometryStats` on the version. Everything downstream is in mm: the upload form sends `units` (mm/cm/m/in, `lib/units.ts`) and `readUploadedParts` scales STL files with `scaleStl()` before measuring and storing them; STEP is converted to mm by OpenCascade and ignores `units`. `scaleWarning()` flags parts under 5 mm or over 3 m across in the geometry panel.
- 3D viewer: import `ModelViewer` from `@/components/viewer` (client-only, loaded with `ssr: false`). Don't use drei `<Html>` as a Suspense fallback inside the Canvas; it crashes under React 19.
- API routes return the `ApiResponse<T>` envelope from `lib/api.ts` (`ok()` / `fail()`).
- Demo parts: `npm run demo:stl` regenerates `demo/*.stl` (script: `scripts/make-demo-stl.ts`). `charger-bracket-sheet.stl` is the bracket after its sheet-metal tweak (demo v2). `lib/demoProjects.ts` maps each demo's stored file names to their sources.
- Sample projects are marked `isExample: true` (public demos). `demo/sample-project.json` is a real saved Claude analysis of the pedal enclosure (250 units), with a saved price suggestion, pitch text and renders (`demo/renders/`). Run `npm run demo:seed` to install it, then open `/project/yAeM9-RDOE`. Build the matching and pitch features against it; no API key needed. A test keeps it valid against `projectSchema`.
- AI analysis: `lib/analysis/` (`prompt.ts` builds the prompts, `run.ts` validates and retries once, `callers.ts` sends them through the gateway). The model sees `analysisOutputSchema` (structural only); `analysisSchema` in `lib/schemas.ts` adds the business rules. Model, effort and token limits per task live in the routing table `lib/ai/routing.ts`; `IDLEFIT_MODEL` / `IDLEFIT_EFFORT` (default `claude-opus-5` / `high`) set the strongest model and the analysis effort. The local-capacity summary in the system prompt comes from `data/shops.json`, so editing shops changes the prompt.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
- Privacy (Phase 9): `proxy.ts` gives every browser a random owner key (httpOnly cookie `idlefit_owner`); projects store only its hash (`lib/ownerKey.ts`). Every page and API route loads projects through `getAccessibleProject()` / `findVersion()` / `requireOwner()` in `lib/access.ts`, never `getProject()` directly; a failed check is a 404 so a project's existence isn't revealed. `lib/projectStore.ts` stays access-free. Projects from before Phase 9 (no owner, not an example) are claimed by the first browser that opens them. Share links: `lib/shareStore.ts` (index at `.data/shares/<token>.json`; the project's own `share` field is the source of truth). The share page gets its version through `loadSharedPitch()`, which rewrites render URLs to the share-scoped route. All AI prompts read notes/photos through `lib/aiInputs.ts` (`notesForAi`, `changeNoteForAi`, `imagesToSend`), so withholding works for analysis, price and pitch alike. Shops only ever see `specSummaryFor()` (size, material, quantity, process). `/api/files` is `no-store` so deletes and revokes take effect at once.
- AI budget: every AI route (analysis, price, pitch, agent, sourcing) calls `aiBudgetGate(action)` (`lib/usage/gate.ts`) before calling the model; the gateway then charges each house-key response's real token usage (`lib/usage/pricing.ts`, list prices; unknown models priced at the highest rate) to a per-browser ledger and a per-UTC-day site ledger under `.data/usage/`. A conservative per-action estimate (`ACTION_ESTIMATE_USD`) must fit before a call; over budget returns 429 with a friendly message. The per-browser limit resets if cookies are cleared, so the daily cap is the real protection. Any new AI route must use the gate and call the model only through the gateway.
- Serialization: `serialized(key, fn)` in `lib/serialize.ts` is the one per-key async lock (project updates, budget ledgers). Single process only, which Railway's one-replica volume setup guarantees.
- Landing storyboard: `ProcessStory`'s pitch step shows the six storyboard frames as stills from the pedal's saved studio renders (`demo/renders/`, static imports in `app/page.tsx`), each with its own "camera move" (render, zoom, focus) in `SHOTS`, plus the AI's shot description and voiceover. Re-render the pedal's pitch and copy the PNGs to `demo/renders/` to refresh them.
- Privacy claims: `/privacy`, the upload form, the "What the AI sees" panel, the share panel and the home hero all make claims backed by the code above. Change a behavior and its claim together; never add a claim the code doesn't enforce.
- Pitch (Phase 8): `/project/[id]/pitch` pitches the newest analyzed version. `components/pitch/PitchDocument.tsx` is the read-only document (server component, `isOwnerView` toggles gap hints) that Phase 9's share page will reuse; owner controls live only in `PitchToolbar` (hidden in print). Renders are captured once from the 3D model and saved; the pitch then shows stills, no WebGL. Stored render URLs carry `?v=<timestamp>` because `/api/files` caches for a year. PDF = the browser's print: each `.pitch-page` section starts a new landscape Letter page (`app/globals.css`); sections are laid out to fit one page each (checked in E2E by page count). The iteration story comes from `buildIterationStory()` (analyzed versions only). The video slot is `PitchVideoSlot`; wiring a video API means setting `version.pitchVideo` to `{ status: "ready", url, provider }`.
- Small AI calls (price, pitch, sourcing) share `runStructured()` (`lib/analysis/structured.ts`, one retry naming the failures) and `textCaller(task, workspaceId)` in `callers.ts`. Word limits gate AI answers; user edits get character limits.
- Business case (Phase 7): all math and the verdict live in `lib/businessCase.ts` (pure, client-safe, tested); the panel recomputes it on every keystroke and auto-saves inputs. Only inputs are stored. Costs between the AI's priced volumes are interpolated log-log; outside 10–10k they're clamped and flagged. The low-volume diagnosis ("tooling makes this unprofitable…") is made on the process that becomes profitable, and an alternative process is only suggested if it covers its own cost at the smallest run.
- Bring your own key (BACKEND.md A2): a creator's Anthropic key is tested with a one-token call (`verifyAnthropicKey`, `claude-haiku-4-5`), then sealed with AES-256-GCM (`lib/ai/keyCrypto.ts`, `KEY_ENCRYPTION_SECRET`, workspace id bound as associated data) and stored at `.data/keys/<workspaceId>.json` (mode 600) by `lib/ai/keyStore.ts`. Only the gateway's `userProviderFor` decrypts it, straight into the SDK client. `instrumentation.ts` (via the Node-only `lib/ai/startupCheck.ts`) exits the server at startup if `KEY_ENCRYPTION_SECRET` is missing or isn't 32 base64 bytes. Changing the secret makes saved keys unreadable, which surfaces as `invalid_key` until the creator re-adds theirs. Key routes share `lib/ai/keySettings.ts` (JSON-only bodies, shape check, a 10-per-10-minutes in-memory limit per browser). Logs never include a key or a provider's error message, only status and error type. `lib/ai/keyRoutes.test.ts` checks every response body and console call for the key. User-facing messages for each code are in `lib/ai/errors.ts`.
- Learning events (BACKEND.md B1): event rules in `lib/learning/events.ts` (one strict schema per type in `EVENT_PAYLOADS`; `sourceFor(access)` is `real` only for `owner`), outcomes in `lib/learning/outcomes.ts` (the estimate comes from `unitCostAt`, never the client), storage in `lib/db/learningStore.ts` (`events.jsonl` and `outcomes.jsonl` in the project folder; writes never create the folder; `removeVersionRecords` is called by the version DELETE route). Routes log server-side events through `recordEvent()` (`lib/learning/record.ts`), which never throws. Pass `simulated: true` for anything built on demo quotes. `findVersion()` now also returns `access`. Rate limits use `createRateLimiter` (`lib/rateLimit.ts`); cookie-authenticated JSON routes check `isJsonRequest()` (`lib/api.ts`).
- AI gateway (BACKEND.md A1): `lib/ai/`. `gateway.generate({ task, workspaceId, system, messages, schema })` makes one structured call; `gateway.stream(...)` streams text. It picks the key (the workspace's own key when saved, else the house `ANTHROPIC_API_KEY`), takes model/effort/maxTokens/thinking from `TASK_ROUTES` (`routing.ts`), and meters each call: one `UsageRecord` row in `.data/usage/calls/<UTC day>.jsonl` (`usageLog.ts`; tokens, cost, latency, ok, no content) plus the house demo budget. Metering failures are logged, never thrown into the request. `workspaceId` is the owner-cookie hash. Provider adapters (`providers/anthropic.ts`) are the only SDK users (pinned by `lib/ai/boundary.test.ts`); they map SDK errors to `AiError { kind, keySource }` with fixed messages (`kind` is an `AiErrorKind`), and turn an unparseable structured answer into an empty turn so the caller's one retry runs. Callers (`lib/analysis/callers.ts`: `analysisCaller`, `textCaller`, `streamAgentReply`, `isAiConfigured`) pair prompts and schemas with a task. Route error mapping is shared: `aiFailure()` / `describeAiError()` in `lib/analysis/errors.ts`, which read only `AiError` kinds. Price briefs (`lib/analysis/price.ts`) deliberately omit costs and the analysis summary, so the price comes from the market, not cost-plus.
- Stored data vs. AI rules: stored `priceSuggestion` is validated structurally only; the business rules (`priceSuggestionSchema`) gate new AI answers. Tightening a rule must never make saved projects unreadable.
- Route lookups: API routes load `{ project, version }` with `findVersion()` from `lib/versionLookup.ts`.
- Alibaba sourcing: Alibaba has no buyer API (its Open Platform is for sellers/ISVs) and its terms forbid automated access, so the app never searches or messages Alibaba. The AI plans the search and drafts messages (`lib/analysis/sourcing.ts`); the user sends each one on alibaba.com and marks it sent. Negotiation numbers (open / aim / walk-away) come only from `negotiationTargets()` in `lib/sourcing/targets.ts` (analysis estimate, capped by a 30% margin when there's a business case). The walk-away is never put in a supplier message: the prompt forbids it and `runSupplierDraft` retries a draft that states it. Shortlist edits are pure ops in `lib/sourcing/ops.ts`, saved under the project lock via `lib/sourcing/store.ts`. Supplier text is third-party input: it's fenced in the brief and the prompt ignores instructions in it. If a real integration is ever added, sending must stay an explicit per-message user action.
- Order coordination: `lib/orders/`. `orderLinesFor(version)` (`lines.ts`) is the only reader of the BOM (one custom "Main part" line until the version has one). `planOrder()` (`plan.ts`, pure) resolves each line's source (the user's assignment, else a suggestion: chosen local quote → agreed Alibaba supplier → best-value quote), orders max(need + 3% spares when assembled, MOQ), adds shipping to the assembler as named share-of-goods and transit-day ranges (`SHIPPING`), assembly from `matchAssemblers()` (`assemblers.ts`, deterministic: required capabilities from line kinds, run size, idle time, cost), and gives landed cost, dates, blockers and warnings. Sign-off stores a fingerprint of everything signed; any change (run, source, a supplier re-quoting, assembler) voids it, and purchase orders can only be drafted or marked sent while it holds (`ops.ts`). The app never orders, pays or sends: the user sends each email. Drafts go through `lib/analysis/orders.ts` (task `order_draft`, budget action `order`); briefs are spec-level and never carry the product name, notes, budget or retail price.
- Process names mid-sentence: `processInSentence()` ("injection molding", but "CNC milling").
- Deploying (Railway): `railway.json` holds the build/start/healthcheck config. The service needs a volume (e.g. mounted at `/data`), `IDLEFIT_DATA_DIR=/data`, `ANTHROPIC_API_KEY`, and `KEY_ENCRYPTION_SECRET` (the server won't start without it). Optional: `IDLEFIT_BROWSER_BUDGET_USD` (default 3) and `IDLEFIT_DAILY_BUDGET_USD` (default 25) for the AI budget. The start command runs `demo:seed` first, so the examples are (re)installed on the volume at every deploy, which also resets any visitor edits to them. One volume means one replica; that's also what the in-process update lock in `projectStore` assumes.
- Don't run `npm run build` while `next dev` runs from the same folder: the build rewrites `.next` and the dev server then 404s routes added since it started. Stop dev, build, restart.
- Wall thickness: `lib/wallThickness.ts` is shared by the server (sampled, for `GeometryStats`) and the browser (every triangle, for the viewer's "Show thin walls" overlay). Change the method there, not in two places.
- Cost by quantity: `lib/costCurve.ts` turns `unitCostAtVolume` + tooling into all-in cost per part and a "cheapest by volume" sentence; `CostByVolumeChart` draws it. Series colors are the validated `--series-1..4` tokens in `app/globals.css`; keep their order.
- Pages that read project files per request call `await connection()` (Next 16's replacement for `force-dynamic`).
- E2E: `npm run test:e2e` (Playwright on installed Chrome). Tests clean up projects they create in `afterEach`.
- Design system (industrial redesign): tokens in `app/globals.css` (theme `bg/surface/ink/muted/line/accent` plus always-dark `night-*` for the header, footer, hero and statement bands; use `night-accent`, not `accent`, on night surfaces). Utilities: `display-type` (Archivo, uppercase headlines) and `eyebrow` (mono caps captions). Page titles use `components/PageHeader.tsx`. Radii are tightened globally in `@theme`.
- Home page sections live in `components/home/` (3D hero, idle ticker, pinned `ProcessStory`, `ProcessTiles`, `Showcase`, `ScrollStatement`). Animation uses `motion` (`motion/react`); every animated component must respect `useReducedMotion()`. Animated words need real spaces between them, not just margins.

