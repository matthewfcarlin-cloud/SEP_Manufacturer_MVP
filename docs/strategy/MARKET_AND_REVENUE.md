# Moko: Market Research and Revenue Model

> Draft for team review, 2026-09-27. Based on the clarified idea: free design, a paid subscription to produce and sell, commissions, and manufacturer advertising. Beachhead: hobby makers with a prototype (see [STRATEGY.md](STRATEGY.md)). The spreadsheet [`moko-revenue-model.xlsx`](moko-revenue-model.xlsx) has every assumption as an editable input and recalculates when you change them.

## Bottom line

**It can be a real business, but only if the commissions work.** In the base case, subscriptions alone never pay for a team. Commissions on production runs, sales and manufacturer leads make up about 40% of revenue by year 3, and that's what gets Moko to break-even.

| Scenario | Year 3 revenue | Year 3 profit | Paying creators at end of year 3 | What it means |
|---|---|---|---|---|
| Low | $45K | −$577K | 168 | A side project, not a company. Stop or pivot. |
| **Base** | **$734K** | **−$85K** | **1,972** | Break-even month by month in year 3, with a team of 6. Fundable seed-stage business. |
| High | $11.0M | +$8.7M | 16,535 | A venture-scale business. |

The two numbers that decide which case we're in are **how many free users pay** (2% vs 4% vs 7%) and **how many cancel each month** (10% vs 7% vs 5%). Both are measurable within weeks of launch.

---

## 1. How big is the market?

### Where our users already are (sourced)

| Pool | Size | Why it matters | Source |
|---|---|---|---|
| MakerWorld (Bambu Lab) monthly users | **10M** monthly active; **280K** active designers | The largest community of hobby makers, our beachhead | [3DPrint.com](https://3dprint.com/324181/bambu-lab-says-2025-was-a-breakout-year-10-million-monthly-users-and-real-business-growth/) |
| MakerWorld users printing 7+ hours a day | **30K+** | People already running small production on printers. The next step for them is getting it manufactured, which is Moko | same |
| MakerWorld users printing 6+ hours a week | **130K+** | Serious hobbyists | same |
| Entry-level 3D printers shipped | **1M+ in Q1 2025 alone**; full-year 2025 shipments up 26% | The maker base keeps growing fast | [3D ADEPT / CONTEXT](https://3dadept.com/surge-in-entry-level-3d-printer-shipments-tops-1-million-in-q1-as-industrial-sales-decline/), [Manufactur3D / CONTEXT](https://manufactur3dmag.com/entry-level-3d-printers-context-q4-2025-report/) |
| Etsy active sellers, 2025 | **8.76M** | Creators who already sell | [Etsy FY2025](https://investors.etsy.com/news-events/press-releases/detail/218/etsy-inc-reports-fourth-quarter-and-full-year-2025-results) |
| Printify users | **10M+** | Creators already paying to have products made for them | [Printify](https://printify.com/pricing/) |
| Kickstarter Design + Technology | **$3.94B** pledged across **~120K** campaigns (all time) | Proven demand for new physical products from small creators | [Expanded Ramblings](https://expandedramblings.com/index.php/kickstarter-statistics/) |

### Market size (our estimate, built on the numbers above)

| | How we get there | People | Yearly value |
|---|---|---|---|
| **Total market** | ~20M creators across these pools (they overlap). Assume 10% have a physical product they'd want produced | ~2M | ~$1B at ~$490 per creator per year (base-case revenue per paying creator, all streams) |
| **Market we can reach** | English-speaking, reachable through our channels, with a prototype or design: assume a quarter of the above | ~500K | ~$245M |
| **Our share by year 3** | From the model | 2K (base) to 16.5K (high) | $0.7M (base) to $11M (high) |

The base case needs **0.4%** of the market we can reach. The high case needs 3.3%. Both are realistic shares; the real question is how many people pay, not whether the market is big enough.

---

## 2. What people already pay

| Product | What they charge | What it tells us |
|---|---|---|
| Printify Premium | $24.99–39/month | Creators pay monthly to have products made |
| Pietra Essentials / Business | $29–39 / $149–199 per month | Brands pay for sourcing and production tools ([Pietra](https://help.pietrastudio.com/en/articles/8568044-what-does-it-cost-to-use-pietra)) |
| Xometry (manufacturing marketplace) | 34.7% gross margin on $629.6M of marketplace revenue, 81,821 active buyers | Taking a cut of manufacturing orders works at scale ([Xometry FY2025](https://investors.xometry.com/news-releases/news-release-details/xometry-reports-record-fourth-quarter-and-strong-full-year-2025)) |
| Etsy seller fees | 6.5% transaction + 3% + $0.25 payment processing + $0.20 per listing | Creators already give up about 10% per sale, so our sales commission has to stay small |

**Our price:** $29/month, or $19/month billed yearly. The model uses $25/month as the blended average.

---

## 3. The revenue model

### Revenue streams and when they start

| Stream | Starts | How it's collected |
|---|---|---|
| Subscription (produce and sell) | Month 1 | Card payment, monthly or yearly |
| Commission on production runs | Month 7 | Taken from orders placed through Moko; needs signed manufacturers and payments |
| Commission on sales | Month 13 | Moko pre-order pages (we're in the money flow) and connected stores. Etsy won't collect it for us and its API terms bar charging for features that connect to Etsy's free functions, so we bill creators ourselves. Details in the store thread's PR #7 |
| Manufacturer lead fees | Month 19 | Manufacturers pay per qualified quote request; needs steady order volume |

### Key assumptions

| Assumption | Low | Base | High | Basis |
|---|---|---|---|---|
| New free sign-ups in month 1 | 150 | 300 | 600 | Launch posts in maker communities |
| Monthly sign-up growth (years 1 / 2 / 3) | 10 / 5 / 3% | 15 / 8 / 4% | 20 / 10 / 5% | Assumption |
| Free users who pay | 2% | 4% | 7% | 3–5% is good and 6–8% is great for freemium self-serve ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion)) |
| Subscription revenue per payer per month | $22 | $25 | $27 | $29 monthly, $19 yearly, blended |
| Monthly cancellations | 10% | 7% | 5% | Assumption for consumer and prosumer tools |
| Payers placing a production run each month | 2% | 4% | 6% | About 0.25 / 0.5 / 0.7 runs per creator per year |
| Average production run | $2,000 | $3,000 | $5,000 | e.g. 250–500 units at $6–12 |
| Commission on production runs | 5% | 6% | 8% | Well under Xometry's 34.7% margin |
| Payers with a product on sale; their monthly sales | 10%; $500 | 20%; $800 | 30%; $1,500 | Assumption |
| Commission on sales | 3% | 3% | 4% | Kept small because platforms already take ~10% |
| Manufacturer quote requests per payer per month; price each | 0.1; $15 | 0.2; $20 | 0.3; $30 | Assumption |

**Costs:** AI at the app's own ceilings ($0.90 per free sign-up, $2 per payer per month); card fees (2.9% + $0.30); $1.50 of paid marketing per sign-up; $50 of support per production run; hosting ($300 → $1,500 → $4,000 a month); fixed marketing ($1K → $5K → $15K a month); team (unpaid founders in year 1, then 3 people at $60K in year 2, then 6 in year 3). Costs are the same in every scenario.

### Results

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| **Base: free sign-ups** | 8,701 | 28,606 | 54,923 |
| Base: paying creators at year end | 269 | 957 | 1,972 |
| Base: subscription revenue | $34,947 | $180,283 | $447,315 |
| Base: production commission | $7,953 | $51,922 | $128,827 |
| Base: sales commission | – | $34,614 | $85,885 |
| Base: manufacturer lead fees | – | $18,601 | $71,570 |
| **Base: total revenue** | **$42,900** | **$285,420** | **$733,597** |
| Base: total costs | $43,158 | $366,045 | $818,314 |
| **Base: profit** | **−$258** | **−$80,624** | **−$84,717** |
| Base: production runs we coordinate (value) | $132,550 | $865,360 | $2.15M |
| Base: monthly revenue at year end | $8,662 | $39,219 | $80,855 |
| Low: revenue / profit | $6,015 / −$18,239 | $23,526 / −$255,267 | $44,752 / −$576,987 |
| High: revenue / profit | $304,374 / +$191,777 | $3.46M / +$2.61M | $10.97M / +$8.75M |

In the base case, month-by-month profit turns positive in **month 23**. Year 3 as a whole is still slightly negative because of the jump to a 6-person team at the start of the year.

### What moves the answer (base case, year 3)

| Change | Year 3 revenue | Year 3 profit |
|---|---|---|
| Base as modeled | $734K | −$85K |
| 6% of free users pay (instead of 4%) | $1.10M | **+$233K** |
| Only 2% pay | $367K | −$402K |
| 5% cancel a month (instead of 7%) | $843K | +$10K |
| 10% cancel a month | $609K | −$193K |
| Price $39/month ($35 blended) | $913K | +$89K |
| **No commissions at all, subscription only** | $447K | **−$362K** |
| Slower first year (10% monthly growth) | $453K | −$276K |

**Takeaways**
1. **Conversion is the biggest lever.** Going from 4% to 6% of free users paying turns a loss into a $233K profit. The free tier must show enough value that producing and selling feels like the obvious next step.
2. **Subscriptions alone don't make a company.** Without commissions, the base case loses $362K in year 3. Commissions on production runs are the most important to get working, because they're the easiest to collect.
3. **Price has room.** $39/month still sits inside Pietra's and Printify's range and adds $179K in year 3.

---

## 4. Unit economics (base case, month 36)

| Per paying creator, per month | |
|---|---|
| Revenue, all streams | $41 |
| Variable cost (AI, card fees, marketing, support) | $12 |
| **Contribution** | **$29** |
| Average lifetime at 7% monthly cancellations | ~14 months |
| **Lifetime value** | **~$410** |
| Most we can spend to win one paying creator (keeping value 3× cost) | **~$135** |
| Paying creators needed to cover year 3 fixed costs ($49K/month) | **~1,700** |
| Paying creators needed to cover year 2 fixed costs ($21.5K/month) | ~750 |

$135 per paying creator at 4% conversion means we can spend up to about **$5 per free sign-up**. Organic channels (build in public, maker communities, share cards) should cost far less, which is why the plan leans on them.

---

## 5. Is it feasible?

**Yes, with conditions.** The market is big and growing: 10M monthly MakerWorld users, over a million printers shipped a quarter, and 8.8M Etsy sellers. Creators already pay $25–39 a month for tools like this, and manufacturing marketplaces make healthy margins. The base case needs only 0.4% of the reachable market.

It works if all three of these hold:
1. **At least 4% of free users pay**, and fewer than 7% cancel each month.
2. **We can collect commissions**, starting with production runs through Moko, which needs signed manufacturers and in-app payments.
3. **Most growth is organic.** Paid ads above ~$5 per sign-up break the model.

**Main risks**
- Makers launch one or two products a year, so subscribers may cancel between products. A yearly plan or a per-product pack protects against this.
- Sales commissions on Etsy and Amazon are hard to collect: Etsy won't do it for us, and Amazon sales aren't visible. The model starts sales commissions in month 13 and keeps them at 3%.
- The production commission depends on real manufacturers accepting small runs through us. All shops in the app are demo data today.
- AI costs are measured against the app's own per-action ceilings. Real costs are likely lower, but a price change from the AI provider would hit margins.

## 6. How to find out which case we're in

| Measure | Low | Base | High | When we'll know |
|---|---|---|---|---|
| Sign-ups in the first month | <150 | ~300 | 600+ | Month 1 |
| Free users who pay | ~2% | ~4% | 7%+ | Months 2–3 |
| Monthly cancellations | 10%+ | ~7% | ≤5% | Months 3–4 |
| Payers who place a production run | rare | ~1 in 25 a month | 1 in 16+ a month | Months 7–9 |

After three months of real numbers, put them into the spreadsheet's yellow cells to see the new forecast.
