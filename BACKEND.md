# Moko Backend: Learning Pipeline + Bring Your Own Key

Spec for the backend agent. Read `CLAUDE.md` and `PRODUCT.md` first. This doc covers two features:

1. **Bring your own key (BYOK):** creators connect their own AI API key, so we don't pay for every call.
2. **Learning pipeline:** the app gets better at understanding physical products, costs, and what sells, using real outcomes from its own users.

---

## 0. Read this first: three hard constraints

1. **Persistence.** Local JSON files don't persist on Vercel (serverless filesystems are temporary). Before anything here works in production, storage moves to **Supabase** (Postgres + Storage). Keep the JSON store as a local dev fallback behind one interface (`lib/db/`).
2. **Never learn from demo data.** Demo quotes and seeded shops are simulated. Every record carries `source: "demo" | "real"`. Learning jobs only read `real`.
3. **Private by default still applies.** Learning uses structured features only (process, material, size bucket, quantity, prices, outcomes). Never raw CAD files, photos, or free-text notes. Creators opt in to contribute, and it's off by default.

---

## 1. Architecture

```
                         ┌──────────────────────────────┐
  UI / API routes ─────▶ │  AI gateway  (lib/ai/)        │──▶ Anthropic / OpenAI
                         │  • picks key (user or house)  │     (user's own key)
                         │  • routes model per task      │
                         │  • meters usage (no content)  │
                         └──────────────┬───────────────┘
                                        │ prompts enriched with
                                        ▼
                         ┌──────────────────────────────┐
                         │  Knowledge layer (lib/learning)│
                         │  • similar past products      │
                         │  • tweaks that actually worked │
                         │  • cost calibration factors    │
                         └──────────────┬───────────────┘
                                        ▲ nightly / on-demand jobs
                         ┌──────────────┴───────────────┐
  UI events ───────────▶ │  Event + outcome store (db)  │
  (applied tweak, chose  │  events, outcomes, features  │
   quote, listing sold)  └──────────────────────────────┘
```

**The loop:** creators act → we log events and outcomes → jobs turn them into features, calibration factors, and ranked examples → the gateway injects those into prompts → better analysis → creators act again.

"Learning" in v1 means **retrieval + calibration + feedback ranking**, not training our own neural model. That's the right call: it works with little data, is explainable ("calibrated from 14 real quotes"), and costs nothing to run. Model training comes later, once there's enough real data (see Phase C).

---

## 2. Bring your own key

### What the creator sees
- **Settings → AI provider** page: choose provider (Anthropic default, OpenAI optional), paste key, **Test key** button, saved key shown masked (`sk-ant-…7Q2f`), **Remove key**.
- A small status pill in the header: `Your key` or `Demo budget: $2.55 left`.
- Clear copy: "Your key is encrypted and only used for your projects. Calls are billed to your provider account."
- If the key fails (401, quota), a banner explains what happened and links to Settings.

### How it works
- **Identity:** no accounts yet, so use an httpOnly, signed `workspace_id` cookie per browser. Keys belong to a workspace. (Swap for real auth later without changing the gateway.)
- **Storage:** encrypt with AES-256-GCM using `KEY_ENCRYPTION_SECRET` (env, 32 bytes). Store `{ciphertext, iv, authTag, provider, last4, createdAt}`. Decrypt only inside the gateway, server-side.
- **Never:** log a key, return it to the client, include it in errors, or send it anywhere except the provider.
- **Test key:** a tiny, cheap call to the provider. Save only if it succeeds.
- **Fallback:** no key → existing house demo budget (per-workspace cap). Budget exhausted → prompt to add a key.

### Gateway API (`lib/ai/gateway.ts`)
```ts
generate<T>({
  task: "analyze" | "agent_chat" | "plan" | "listing" | "outreach" | "quote_sim",
  workspaceId: string,
  messages: Message[],
  schema?: ZodSchema<T>,     // structured output + validation + 1 retry
  stream?: boolean,
}): Promise<T | ReadableStream>
```
- Every existing Claude call in the app moves behind this function. No route calls a provider SDK directly.
- **Model routing:** strongest model for `analyze` and `agent_chat`; cheaper model for `listing`, `outreach`, `quote_sim`. Routing table lives in `lib/ai/routing.ts`.
- **Provider adapters:** `lib/ai/providers/anthropic.ts`, `openai.ts`, same interface.
- **Usage meter:** record `{workspaceId, task, provider, model, inputTokens, outputTokens, estCostUsd, keySource: "user"|"house", latencyMs, ok}`. No prompt or response content.

---

## 3. Learning pipeline

### 3.1 Event + outcome store
Log what creators *do*, not just what the AI says.

```ts
type Event = {
  id: string; workspaceId: string; projectId: string; versionId?: string;
  type: "analysis_run" | "tweak_applied" | "tweak_rated" | "quote_requested"
      | "quote_chosen" | "plan_generated" | "listing_generated" | "listing_copied"
      | "agent_question" | "agent_rated";
  payload: Record<string, unknown>;   // structured only, no free text or files
  source: "demo" | "real";
  createdAt: string;
};

type Outcome = {            // ground truth we learn from
  id: string; projectId: string; versionId: string;
  kind: "real_quote" | "actual_unit_cost" | "units_sold" | "tweak_cost_delta";
  process?: Process; material?: string; quantity?: number;
  estimateUsd?: { low: number; high: number };
  actualUsd?: number;
  value?: number;
  source: "demo" | "real";
  createdAt: string;
};
```
- `POST /api/events` (batched from the client). Server-side events logged directly in routes.
- UI additions the frontend agent wires in: 👍/👎 on each design tweak and agent answer; "Enter a real quote" form on the outreach screen; "Units sold" field on the selling screen.

### 3.2 Product features (the shared vocabulary)
A job turns each analyzed version into a compact, private-safe feature row:
```ts
type ProductFeatures = {
  versionId: string;
  category: string;                    // AI-tagged: "enclosure", "bracket", "planter"...
  process: Process; material: string;
  sizeBucket: "xs" | "s" | "m" | "l" | "xl";   // from bounding box
  volumeCm3: number; minWallMm: number;
  quantity: number;
  unitCostEst: { low: number; high: number };
  tweaksApplied: string[];             // tweak categories, e.g. "add_draft", "switch_to_sheet_metal"
  contributeToLearning: boolean;       // creator opt-in
};
```

### 3.3 Similar-product retrieval (v1: no embeddings)
- `findSimilar(features, k=5)`: weighted nearest neighbors on category, process, material, size bucket, log(quantity). Only rows with `contributeToLearning` and `source: "real"`.
- Injected into the `analyze` and `agent_chat` prompts as: "Similar products on the platform: … what they cost, which tweaks worked."
- v2: add embeddings (pgvector) of the AI's product summary for fuzzier matches.

### 3.4 Cost calibration
Our AI cost ranges will drift from reality. Correct them with real quotes.
- For each `process × sizeBucket × quantityBucket`, compute `ratio = actual / estimateMidpoint` from real quotes.
- Shrink toward 1 when data is thin: `factor = (n · median(ratio) + k · 1) / (n + k)` with `k = 5`.
- Apply the factor to displayed ranges and label it: **"Calibrated from 14 real quotes."** With `n = 0`, show "Uncalibrated estimate."
- Job: `lib/learning/calibrate.ts`, runs on demand and after each new real quote.

### 3.5 Tweak ranking
- For each tweak category, track: times suggested, times applied, 👍/👎, and measured `tweak_cost_delta` (unit cost before vs after the version it created).
- Score = applied rate + rating + median cost drop (normalized).
- Feed the top-performing tweaks for similar products into the prompt as examples, and sort suggested tweaks by score in the UI.

### 3.6 Market and trend signals (Phase C)
- Goal: tell creators what's selling and at what price, by category.
- First source is our own data: listing views/copies and units sold reported by creators.
- External sources only through official APIs and within their terms (e.g. Etsy Open API once approved). No scraping.

### 3.7 Eval harness (how we prove it's getting better)
- `evals/golden/`: 10 to 20 demo parts with expected best process, plausible cost range, and must-mention features.
- `npm run eval`: runs `analyze` on each, scores process match, cost-range overlap, specificity (mentions real dimensions), and schema validity. Prints a table and saves results.
- Run before and after any prompt, routing, or retrieval change. Commit the score in the PR description.

---

## 4. Data and routes

**Tables (Supabase):** `workspaces`, `api_keys`, `usage`, `events`, `outcomes`, `product_features`, `calibration_factors`, `tweak_stats`. Projects and versions move here too.

| Route | Purpose |
|---|---|
| `GET/POST/DELETE /api/settings/ai-key` | Save (encrypted), view masked, remove |
| `POST /api/settings/ai-key/test` | Test a key before saving |
| `GET /api/usage` | Usage and remaining demo budget for the header pill |
| `POST /api/events` | Batched client events |
| `POST /api/outcomes` | Real quote, actual cost, units sold |
| `POST /api/learning/recompute` | Rebuild features, calibration, tweak stats (dev button) |

---

## 5. Build phases

| Phase | What | Done when |
|---|---|---|
| **A1** | AI gateway: every AI call goes through `generate()`, routing table, usage meter | App works exactly as before; usage rows appear |
| **A2** | BYOK: settings page, encryption, test key, header pill, fallback | Pasting a valid key routes calls to it; invalid key shows a clear error |
| **A3** | Storage interface + Supabase adapter (JSON stays for local dev) | Data survives a Vercel redeploy |
| **B1** | Events + outcomes + feedback buttons + real-quote form | Actions show up as rows with the right `source` |
| **B2** | Features job + similar-product retrieval in prompts | Analysis cites similar real products when they exist |
| **B3** | Cost calibration + "Calibrated from N quotes" label | Entering real quotes shifts displayed ranges |
| **B4** | Tweak ranking | Tweaks re-order by what actually worked |
| **B5** | Eval harness | `npm run eval` prints a score table |
| **C** | Embeddings, trend signals, fine-tuning once data exists | Later |

**For today's sprint:** only A1 and A2 are realistic, plus the B1 feedback buttons if time allows. Everything else is roadmap for the pitch: "every quote and sale makes the next estimate better."

---

## 6. Coordination with the frontend agent

- Backend agent works on branch `feat/backend` in its own git worktree.
- Backend owns: `lib/ai/`, `lib/learning/`, `lib/db/`, `app/api/settings/`, `app/api/events/`, `app/api/outcomes/`, `app/api/usage/`, `evals/`.
- Frontend owns pages and components. The settings page UI and feedback buttons can be built by either, but agree first.
- `lib/types.ts` is the contract. Add new types there and note them in `CLAUDE.md`.
- Merge `feat/backend` into `main` only after A1 passes the full demo flow.

## 7. Rules
- No provider SDK calls outside `lib/ai/`.
- Keys: encrypted at rest, never logged, never sent to the client.
- Learning reads only `source: "real"` and opted-in rows. No raw files or free text.
- Every learned number shows where it came from ("from N real quotes").
- Don't break the existing demo flow.
