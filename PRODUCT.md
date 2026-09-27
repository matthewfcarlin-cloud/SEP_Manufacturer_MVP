# Moko: From Idea to First Sale

> Working name. Alternatives under review: **Firstrun** (top pick), **Madeby**. See [Naming](#naming).

Moko is the all-in-one studio for **first-time product creators**. Bring an idea (CAD file, photos, sketch, or just a description). Leave with a design that can actually be made, real manufacturer quotes, a price that makes money, a launch plan, and a listing ready to sell.

**The bet:** Printify made selling custom merch easy by hiding the factory. We do the same for *original* physical products, where the factory is the hard part.

This doc is the team reference: what we're building, why, and how each piece works. `CLAUDE.md` / `AGENTS.md` hold the technical build rules for coding agents.

---

## Table of contents
1. [The problem](#the-problem)
2. [Who it's for](#who-its-for)
3. [The creator journey](#the-creator-journey)
4. [The eight components](#the-eight-components)
5. [How it all connects](#how-it-all-connects)
6. [Today's build (MVP scope)](#todays-build-mvp-scope)
7. [Design system](#design-system)
8. [Competitors and how we win](#competitors-and-how-we-win)
9. [Why now](#why-now)
10. [Business model](#business-model)
11. [Hard questions](#hard-questions)
12. [Naming](#naming)

---

## The problem

Our customer discovery call was with a veteran model maker and inventor (Lucasfilm, Mattel, Sega). He pitched about 250 ideas a year to land two. His prototypes died on **manufacturing and tooling cost**, not design. His lessons:

- Design around what real factories already make, and find the one who can take your run early.
- Good design alone doesn't close the deal. Manufacturability and profitability do.
- Pitch with how it will *sell*, not just how it works.

Most people only learn this after years on factory floors. First-time creators don't have years. They juggle five or six tools and still can't answer: *Can this be made? What will it cost? Who makes it? Will it make money? How do I sell it?*

## Who it's for

| Segment | Who | Pain | Why they matter |
|---|---|---|---|
| **Primary (beachhead)** | Etsy sellers who've outgrown print-on-demand | Want an original product but don't know how manufacturing works; one bad tooling bet wipes out profit | Already pay for Printify/Etsy tools; understand listings and margins |
| Secondary | Students and first-time founders | Can model something but can't tell if it's makeable or profitable | Easiest users to get today |
| Secondary | Hobby makers with a 3D printer | Don't know when to switch from printing to molding/CNC | Loud online, most likely to share on X |
| Supply side | Small shops and manufacturers | Small runs are hard to find and quote | Clear, ready-to-quote requests from serious creators (like Printify's print providers) |

## The creator journey

One guided journey, not a toolbox. Every product moves through six stages, and the app always shows the next step.

| # | Stage | What happens | Status |
|---|---|---|---|
| 1 | **Idea** | Upload CAD, photos, sketches, notes, quantity, budget | ✅ Built |
| 2 | **Design** | Analysis, AI design tweaks, versions and compare, agent assist | ✅ Built + agent today |
| 3 | **Make** | Manufacturing paths, shop matches, outreach and quotes | ✅ Built + outreach today |
| 4 | **Money** | Business case: price, margin, break-even | ✅ Built |
| 5 | **Launch** | Plan and timeline, pitch kit, marketing | ✅ Pitch kit + timeline today |
| 6 | **Sell** | Etsy-ready listing | 🔨 Today |

---

## The eight components

Every component reads from and writes to the **same product record**. A new version or a chosen quote updates everything else.

### 1. Studio dashboard — *home base for every product* · 🔨 Build today

The first screen a creator opens. Shows every product, where it stands, and the single next thing to do. **This is the "wow" screen in the demo.**

- **Creator sees:** a card per product with a live, slowly turning 3D model; a 6-stage progress rail; key numbers (cost to make, retail, margin, next deadline); a unit-cost sparkline across versions that visibly drops as the design improves; a "Next step" card (e.g. "2 quotes waiting, compare them").
- **How it works:** reads existing data (versions, analysis, business case, matches, quotes, plan). Stage is derived from what exists. Next step comes from simple rules, not AI, so it's instant.
- **Later:** readiness score per idea, team sharing, notifications.
- **Why it's different:** other tools track orders. This tracks the whole product from sketch to first sale.

### 2. Design assist — *how to make it, and how to make it better* · ✅ Built

The core engine. Measures the part, flags problems, explains the best ways to manufacture it at the creator's quantity, with cost ranges and specific design changes.

- **Creator sees:** 3D viewer with thin-wall highlighting; geometry stats; 2–4 manufacturing paths with unit cost, tooling, lead time; design tweaks with impact; version history and side-by-side compare.
- **How it works:** geometry measured in-browser; Claude reads photos + notes + geometry and returns structured paths and tweaks; tweaks can be applied as new versions.
- **Later:** tolerance/material guidance, "why" explainer per tweak, sketch-to-3D.
- **Why it's different:** design tools stop at the model; quoting sites judge a finished file. We connect each design change to cost, process, and supplier while the idea is still changing.

### 3. Manufacturer match — *who can make it: local shops and overseas suppliers* · ✅ Built

- **Creator sees:** ranked shop cards with score and reasons, the matched machine, a plain "Can start this week" / "Can start in 2–3 weeks" badge, tweaks needed to fit. Overseas suppliers come through Alibaba sourcing: Moko plans the search and writes the emails; the creator sends them.
- **How it works:** deterministic scoring (process, envelope, material, quantity, and a small bonus for shops that can start soon) weighted by path fit. Shops see only a spec summary until the creator shares more.
- **Later:** real shop onboarding portal, verified reviews.
- **Why it's different:** marketplaces route finished parts to whoever bids. We use real available capacity as a design input.

### 4. Manufacturer outreach — *real quotes without the back-and-forth* · 🔨 Build today

- **Creator sees:** one-click "Request quotes" to top matches; an auto-built spec sheet (renders, dimensions, material, finish, quantity tiers, target price, deadline); a pipeline (Sent → Quoted → Sample → Ordered); quote comparison with best value highlighted; drafted follow-up messages.
- **How it works:** spec sheet assembled from analysis + business case; privacy setting controls what each shop sees; quotes normalized to price per unit per quantity.
- **Today:** simulated quotes, clearly labeled **"Demo quote"**, priced inside the analysis cost range.
- **Later:** real email send/receive, NDA before full file reveal, sample tracking.
- **Why it's different:** sourcing tools assume you know what to ask for. We write the request from the design itself.

### 5. Plan and timeline — *a launch plan built from real numbers* · 🔨 Build today

- **Creator sees:** milestones (finalize design → prototype → sample approval → tooling → production run → photos → listing → launch) on a timeline with today and launch date marked; budget per milestone and running total; warnings ("tooling lead time pushes launch past the holidays").
- **How it works:** Claude drafts milestones as structured JSON from the analysis and chosen path; durations come from the chosen quote or analysis lead times; choosing a quote re-dates the plan.
- **Later:** drag to edit, reminders, calendar sync.
- **Why it's different:** nobody tells a first-timer what order to do things in, with their own dates and costs.

### 6. Marketing — *build demand before paying for tooling* · 🗺️ Roadmap (reuse pitch kit today)

- **Creator sees:** studio renders, 30-second commercial storyboard (later: generated video), launch posts for X/TikTok/Instagram, hosted waitlist page with signup counter, share card ("Costs $X to make → sells for $Y").
- **Why it's different:** marketing tools start after the product exists. Here, demand testing happens before the biggest spend.

### 7. Selling — *from finished product to live listing* · 🔨 Build today

- **Creator sees:** Etsy-ready listing (title ≤140 chars, description, exactly 13 tags, photos from renders), suggested price from the business case with margin after marketplace fees, copy button per field, "Connect Etsy shop" and Shopify marked **Coming soon**.
- **Note:** Etsy's Open API lets a seller app create drafts in the developer's own shop quickly; serving other sellers needs a separate commercial review. So today is copy-ready, not direct publish.
- **Later:** direct Etsy/Shopify publishing, pre-order pages, reorder alerts.

### 8. Agent assist — *a product-development expert on call* · 🔨 Build today

- **Creator sees:** chat panel on every product screen, starter questions for the current stage, answers that cite the product's own numbers, action buttons (apply this tweak, draft this request, update the plan).
- **How it works:** server-side Claude call with the project record as context; streamed; costs always as ranges; actions only run after the creator confirms.
- **Why it's different:** generic chatbots don't know your part. This one reads your design and numbers, and explains the reasoning so creators learn instead of leaning on it blindly (a concern from our discovery call).

---

## How it all connects

```
            ┌──────────── Agent assist (reads everything, acts with approval) ────────────┐
Upload ─▶ Design assist ─▶ Manufacturer match ─▶ Outreach & quotes ─▶ Plan & timeline ─▶ Selling
   │           │                 │                     │                   │               │
   └───────────┴─────────────────┴──── Product record (versions) ──────────┴───────────────┘
                                             │
                                     Studio dashboard
```

- New **version** → re-analysis → matches, business case, listing price update.
- Chosen **quote** → unit cost and lead time flow into business case and plan dates.
- **Dashboard** reads everything and shows the next step.

## Today's build (MVP scope)

| # | Build | Time | Done when |
|---|---|---|---|
| 1 | Studio dashboard | ~35 min | Opening the app shows every product and its next step at a glance |
| 2 | Agent assist | ~35 min | "How do I make this cheaper?" returns an answer naming this part's features and numbers |
| 3 | Outreach and quotes | ~35 min | Five labeled demo quotes appear and sort by price and lead time |
| 4 | Plan and timeline | ~25 min | Choosing a quote updates the launch date |
| 5 | Selling (Etsy listing) | ~20 min | A full listing copies into Etsy in under a minute |

**Feature freeze at T+2:10.** Deploy, test on a phone, record the demo. If behind, drop 5, then 4.

### Team lanes
- **Builder:** ships the five builds with Claude Code, owns the live demo.
- **Growth:** waitlist + outreach for users, 5 real testers, the X post.
- **Pitch:** hero demo product, deck, 5-minute script.

## Design system

Keep the existing Moko look. Don't restyle what's built.

- **Header:** dark bar, wordmark, the AI budget pill.
- **Type:** huge uppercase wide display headings; small monospace uppercase labels with letter-spacing; clean sans body.
- **Color:** warm off-white ground in light mode, near-black in dark; one burnt-orange accent; green only for "available/good".
- **Shape:** sharp corners, 1px borders, cards only where an object needs setting apart.
- **Motion:** slow turntable 3D models, subtle count-ups on numbers; respect `prefers-reduced-motion`.
- **Data:** tabular numbers, costs always as ranges labeled "est.", demo data always badged.

## Competitors and how we win

**Closest to us**
- **Pietra:** AI platform for brands, 40,000+ suppliers, fulfillment, marketing. *Gap:* sources existing/private-label goods; doesn't read your design.
- **Alibaba Accio Work:** AI agents for sourcing, negotiation, listings, marketing. *Gap:* built for overseas high-volume sourcing, not a first-timer's small domestic run.
- **Backflip:** text/photo to 3D-printable model ($30M, NEA + a16z). *Gap:* ends at the model.
- **Printify:** the model we borrow. *Gap:* catalog products only.

**Wider field:** Xometry/Protolabs/Fictiv/Craftcloud (finished-CAD fulfillment), SendCutSend/PCBWay (one process each), AdamCAD/Zoo/Vizcom (design), MakerWorld (assumes you own a printer; recently shut down two AI tools), Etsy/Shopify/Kickstarter (selling only).

**How we win**
1. **Part-aware:** we read the geometry and tie every design change to cost, process, and shop.
2. **Built for the first run:** Moko finds the local shops and overseas suppliers that take 100-unit runs, and writes the request for you.
3. **One record, whole journey:** a new version updates quotes, plan, price, and listing.
4. **Made for first-timers:** a next step at every stage, an agent that explains why, private by default.

## Why now

- **AI can read and make 3D.** Text-to-CAD became usable in 2025–26; frontier models are generating 3D assets that get 3D printed.
- **Making went mainstream.** Consumer printers and platforms like MakerWorld created millions of prototypers with no path to scale.
- **Manufacturing is coming home.** 36% of OEMs in the 2026 Reshoring Survey have reshored or are reshoring (up from 29%); 65% cite tariffs.
- **The model is proven.** Creators pay Printify a subscription to skip the factory. Nobody offers that for original products.

**Inflection point:** for the first time, someone with no hardware background can go from a photo to a makeable design, a price, and a supplier in one sitting.

## Business model

- **Free:** upload, analysis, one product.
- **Pro subscription:** unlimited products and versions, outreach, plan, listings, agent.
- **Order fee:** small percentage on production orders placed through the platform.

## Hard questions

| Question | Answer |
|---|---|
| Are the quotes real? | Not yet. Simulated and labeled. Next step: sign 10 real LA shops. |
| How accurate are costs? | Ranges for early decisions, not final prices. The goal is killing bad ideas before a $10K tooling bill. |
| Why can't Xometry add this? | Their buyer is an engineer with finished CAD. Ours is a first-timer with an idea and an Etsy shop. |
| Two-sided marketplace? | The creator side is useful with zero shops. Shops join as orders route through. |
| IP? | Private by default; shops see a spec summary until the creator shares. |

## Naming

| Name | Why |
|---|---|
| **Moko** ✅ | Chosen name (2026-09-27). Logo in `public/brand/`, ring icon in `app/icon.png`. |
| **Firstrun** ⭐ | Every creator is chasing their first production run. Easy to post. |
| **Madeby** | Share cards write themselves: "made with Madeby." |
| **Idlefit** | Previous working name, from the first positioning. |
| Kilnworks · Partwise · Shopfloor | Alternatives. |

Domains and trademarks not checked yet.
