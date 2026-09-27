# Moko: Business Validation Strategy

> Written 2026-09-27. Companion to [PRODUCT.md](../PRODUCT.md) (what we're building) and [BACKEND.md](../BACKEND.md). This doc says how we prove the business is real before we scale it. Sizing figures and pass lines are proposals for the team to agree on.

**Where we stand:** the market signals are strong, but our own evidence is one conversation. The one customer interview we have is with a veteran inventor (Lucasfilm, Mattel, Sega), not with an Etsy seller, who is our beachhead. Nobody in the target segment has used Moko or told us they'd pay.

| | Status | Why |
|---|---|---|
| The market and the pain are real | ✅ Supported by outside data | 8.8M Etsy sellers, a channel that allows products made by production partners, and competitors earning money on subscriptions and manufacturing fees |
| Our beachhead wants this and will pay | ⚠️ Not tested | No interviews or sales with Etsy sellers yet |
| Our estimates are trustworthy, and real shops will take small runs | ❌ Biggest risk | If either fails, the product doesn't work. Both are testable in weeks |

## Contents
1. [Market evidence](#1-market-evidence)
2. [Sizing](#2-sizing)
3. [The seven tests](#3-the-seven-tests)
4. [Four-week plan](#4-four-week-plan)
5. [Interview script](#5-interview-script)
6. [If a test fails](#6-if-a-test-fails)
7. [Sources](#7-sources)

---

## 1. Market evidence

| Signal | Number | What it validates for us |
|---|---|---|
| Etsy active sellers, 2025 | **8.76M** (+7.7% vs 2024) | The beachhead is large and growing. Etsy's marketplace moved $10.46B in 2025 across 93.5M active buyers. |
| Etsy "Designed by a seller" rule | Allowed | Etsy explicitly allows "original designs … produced with the assistance of a production partner", with disclosure of the partner and ship-from location. A Moko-made product is a legal Etsy listing. |
| Etsy 3D-printing change, June 2025 | Templates banned | Sellers can no longer sell 3D prints of designs bought from third parties, so print sellers need original products, which is Moko's job. *Our inference: a tailwind for the hobby-maker segment.* |
| Printify | 10M+ users; Premium **$24.99–39/mo** | Creators pay monthly to skip the factory. This is the model we copy for original products. |
| Pietra (closest competitor) | Essentials **$29–39/mo**, Business $149–199/mo | Brands already pay a subscription for sourcing and production tools. Sets our price anchor. (Pietra labels its prices a limited-time promotion.) |
| Xometry, 2025 | **$629.6M** marketplace revenue, 34.7% gross margin, 81,821 active buyers (+20%) | A manufacturing marketplace can take a healthy margin on orders. Their buyers are engineers with finished CAD, not first-timers. |
| Print-on-demand market | ~$13B; ~368K Shopify stores use POD apps | Adjacent spend by the creators we target. |
| Kickstarter tech and design projects | **75%** missed their deadline (471 projects); ~9% of all funded projects never deliver | Manufacturing is where first-time hardware creators fail, which matches our discovery call. |

## 2. Sizing

Illustrative only. Every assumption below gets replaced by what the tests measure.

```
Etsy active sellers                                   8,760,000
× selling physical goods who want an original
  product (assume 1%)                                    87,600   ← test 1 measures this
× convert to Pro (assume 5%)                              4,380   ← test 4 measures this
× $29/mo × 12                                ≈ $1.5M a year from subscriptions

Production run: 250 units × $10 est. unit cost  = $2,500 order   ← test 6 measures this
× order fee (assume 8%, well under Xometry's ~35% margin) = $200 per run
× 2 runs a year per paying creator × 4,380     ≈ $1.75M a year from orders
```

**What this tells us:** a subscription alone makes a small business on Etsy sellers. The order fee roughly doubles it, and it grows with every repeat run and every creator who scales past 250 units. That's why the supply side (test 5) and routed orders (test 6) matter as much as sign-ups. The first numbers to replace are the 1% share with a real product idea, the 5% Pro conversion, and the typical run size and unit cost.

## 3. The seven tests

Riskiest first. Each is cheap, uses what's already built, and has a pass line decided before we run it, so we can't talk ourselves into a result.

### Test 1: Etsy sellers have an original product they're stuck on, and manufacturing is why
- **Test:** 15 interviews with Etsy sellers doing print-on-demand or 3D printing, recruited from seller subreddits, Etsy Facebook groups and local craft markets. Use the [script](#5-interview-script); don't show Moko until the end.
- **Pass:** at least 8 of 15 name a specific product they want to make, at least 5 say cost, suppliers or minimums stopped them, and at least 3 have already spent money trying (samples, a designer, Alibaba).
- **Fail:** fewer than 5 have a real idea. Run the same interviews with hobby 3D-print sellers and students before changing anything.
- **Cost / owner:** time only · Growth lane.

### Test 2: Moko's cost estimates are close enough to trust
- **Test:** run 10 real parts through Moko (interviewees' parts where possible), then get real quotes for the same part, process and quantity from Xometry's instant quote, Craftcloud, and 2–3 LA shops. Log each through `POST /api/outcomes` as a `real_quote`, which the app already stores.
- **Pass:** the real quote falls inside Moko's range, or within 25% of it, for at least 7 of 10 parts, and Moko picks the cheapest process at that quantity for at least 7 of 10.
- **Fail:** fix the prompt and calibrate (BACKEND.md B3) before recruiting users. Wrong numbers would cost creators money.
- **Cost / owner:** free quotes, a few dollars of AI · Builder.

### Test 3: A free "what would it cost to make?" analysis pulls people in
- **Test:** post one real before-and-after (the bracket going from injection molding to sheet metal) in 5 communities, linking to the live app and a waitlist. Track visits, uploads and sign-ups.
- **Pass:** 100 sign-ups in 2 weeks, 10% of visitors join, and at least 30 upload a real part (not just open an example).
- **Fail:** test a different hook ("Can my 3D print be mass produced?") before concluding there's no pull.
- **Cost / owner:** free; the $25 daily AI budget covers roughly 40 analyses a day · Growth lane.

### Test 4: Creators will pay for Pro
- **Test:** after a user's first analysis, offer "Pro, $29/mo: quotes, BOM, order plan, launch plan and listing" with a real checkout at a founding price (e.g. $19/mo for the first 3 months). Priced between Printify and Pietra.
- **Pass:** at least 10 paying founders, or at least 5% of users who finished an analysis.
- **Fail:** ask the people who clicked but didn't pay why. Try a one-off "production-ready pack" price instead of monthly.
- **Cost / owner:** a Stripe payment link; refund everyone if we stop · Builder.

### Test 5: Real LA shops will quote small runs from first-timers
- **Test:** call or visit 30 shops (machine shops, print farms, a molder, sheet-metal fabs). Show a Moko spec sheet and ask whether they'd quote 100–500 units, how fast, and whether they have idle time.
- **Pass:** at least 10 agree to quote real requests within 48 hours, and at least 3 would accept a referral fee on orders they win.
- **Fail:** keep the creator side on Alibaba and online quoting services, and drop "idle local machines" from the pitch.
- **Cost / owner:** time only · Pitch lane. This is also the "sign 10 real LA shops" step PRODUCT.md already names.

### Test 6: Creators will place a real production order through us
- **Test:** concierge. Take the 3 most serious creators from tests 1–4 and broker their first run by hand, from quote to delivery, using the app's order plan. Charge the planned fee.
- **Pass:** 3 orders placed and paid, landed cost inside Moko's estimate, and each creator says they'd use it for the next run.
- **Fail:** find out where it broke (price, trust, minimums, time) before building order routing.
- **Cost / owner:** our time; the creator pays for the parts · whole team.

### Test 7: Creators come back
- **Test:** of users who analyze a part, how many make a second version or a second product within 30 days, from the `analysis_run` and `tweak_applied` events the app already logs.
- **Pass:** at least 25% return within 30 days.
- **Fail:** Moko is a one-time tool; price it per product, not monthly.
- **Cost / owner:** free · Builder.

## 4. Four-week plan

| Week | Work | Gate at the end |
|---|---|---|
| 1 | Interviews 1–8 (Growth). Accuracy test on 10 parts (Builder). Start shop calls (Pitch). | Estimate within 25% on 7 of 10 parts. If not, fix it before any public post. |
| 2 | Interviews 9–15. Community posts and waitlist. Keep calling shops. | 8 of 15 interviewees have a stuck idea; sign-ups on track for 100. |
| 3 | Turn on the Pro founding checkout. Pick 3 creators for the concierge run. Finish 30 shop conversations. | 10 paying founders and 10 shops willing to quote. |
| 4 | Broker the 3 runs. Measure 30-day return. Write up results in this doc. | Decide: keep going, change segment, or change model ([section 6](#6-if-a-test-fails)). |

**Build only what the tests need:**
- Simple sign-in and a Stripe link, so tests 4 and 6 can take money.
- A "log a real quote" form on the Make tab, so test 2's data feeds the learning pipeline (the `POST /api/outcomes` route exists; the form doesn't).
- A funnel view (visit → upload → analysis → quote request → Pro) from events already logged.

Other new features wait until the gates are passed.

## 5. Interview script

20 minutes. Ask about what they've done, not about Moko.

**Questions**
1. What do you sell today, and how is it made?
2. Have you ever wanted to sell something you couldn't get made? Tell me about the last time.
3. What did you try? Who did you contact? What did it cost you?
4. Where did it stall: the design, finding a maker, the price, the minimum order, or something else?
5. What did you do instead?
6. If that problem went away, what would you launch first, and how many would you order?
7. What do you pay for today to run your shop (tools, subscriptions)?

**Rules**
- No pitching until the last 5 minutes. Then show the bracket example and ask what they'd do next.
- Past behavior counts; "I would definitely use that" does not.
- Write down money already spent, tools already paid for, and their exact words for the pain.
- End with: "Can I run your idea through it and send you the result?" Anyone who says yes is a candidate for tests 3 and 4.
- Log every interview in one shared sheet so the 8-of-15 count is honest.

## 6. If a test fails

| Result | What it means | Next move |
|---|---|---|
| Tests 1–4 pass | The beachhead is right and will pay | Build sign-in, billing and real quote requests; test a higher Pro price |
| Test 1 fails with Etsy sellers but passes with 3D-print hobbyists | Wrong beachhead | Lead with "turn your 3D print into a product"; Etsy's June 2025 rule pushes these sellers toward original designs |
| Test 2 fails | Estimates aren't trustworthy yet | Pause outreach; calibrate on real quotes until 7 of 10 pass |
| Test 4 fails, tests 1 and 3 pass | People want it, but not monthly | Try a per-product price, or free software plus the order fee only |
| Test 5 fails | Local idle capacity won't carry the model | Route to Alibaba and online quoting services; drop the idle-machine story |
| Tests 1 and 3 fail in every segment | First-timers aren't a market we can reach | Go back to the original inventor-and-licensing customer, where our one real interview is |

## 7. Sources

- [Etsy, Inc. Q4 and full-year 2025 results](https://investors.etsy.com/news-events/press-releases/detail/218/etsy-inc-reports-fourth-quarter-and-full-year-2025-results): active sellers, buyers, GMS
- [Etsy Creativity Standards](https://www.etsy.com/legal/creativity): "Designed by a seller" and production partners
- [TCT Magazine: Etsy's new 3D printing policy](https://www.tctmagazine.com/from-templates-to-originality-etsy-new-3d-printing-policy/): June 10, 2025 change
- [Printify pricing](https://printify.com/pricing/): plans and the 10M+ users claim
- [Pietra: what does it cost to use Pietra?](https://help.pietrastudio.com/en/articles/8568044-what-does-it-cost-to-use-pietra): plans
- [Xometry Q4 and full-year 2025 results](https://investors.xometry.com/news-releases/news-release-details/xometry-reports-record-fourth-quarter-and-strong-full-year-2025): marketplace revenue, margin, buyers
- [Printful: print-on-demand statistics](https://www.printful.com/blog/print-on-demand-statistics): market size (citing Precedence Research) and Shopify POD stores (citing StoreLeads)
- [CNNMoney: why Kickstarter projects ship late](https://money.cnn.com/2012/12/18/technology/innovation/kickstarter-ship-delay/index.html) and [Mollick, Delivery Rates on Kickstarter (SSRN)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2699251)
