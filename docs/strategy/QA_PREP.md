# Moko: Getting Grilled (Q&A Prep)

> Draft for team review, 2026-09-27. The hardest questions a judge, investor or professor will ask, with answers we can give today. Numbers come from [MARKET_AND_REVENUE.md](MARKET_AND_REVENUE.md) and [STRATEGY.md](STRATEGY.md). **Weak spot** marks where an honest answer today is "we haven't proven it yet," and what would fix that.

## How to answer
- **Lead with the number, then the source.** "10 million people use MakerWorld every month, per Bambu Lab's 2025 report."
- **Say "we don't know yet" out loud, then name the test.** Judges punish bluffing far more than honesty. "We haven't proven conversion yet. Our pass line is 4% of free users paying, and we'll know within 3 months."
- **Separate what's built from what's simulated.** The shops and quotes in the demo are fictional and labeled. Say so before they find it.
- **Assign one teammate to each section below**, so nobody talks over each other.

## Our 30-second answer
"We're creators. We've all had hobby projects that worked as prototypes but never became products, because getting something manufactured is where first-timers get stuck. Moko takes your prototype and tells you how to make it, what it costs, who can make it, whether it makes money, and how to sell it, all in one place. Designing is free; creators pay to produce and sell, and we take a commission on production runs ordered through us. Our first users are hobby makers with a working prototype, a group of millions that gathers in a few online communities."

---

## 1. Problem and customer

**"Is this a real problem, or just yours?"**
It started as ours, and outside data backs it up. On Kickstarter, 75% of tech and design projects missed their delivery date in Ethan Mollick's study of 471 projects, with manufacturing and scaling problems the main causes cited. Our first discovery call was with a veteran inventor (Lucasfilm, Mattel, Sega) who pitched about 250 ideas a year to land two, and whose prototypes died on manufacturing and tooling cost, not design.
**Weak spot:** we've only had one discovery conversation, and it was with a professional inventor, not a hobby maker. *Fix before being grilled:* 15 interviews with hobby makers who have a prototype. The pass line is 8 of 15 naming a product that stalled on manufacturing.

**"Who exactly is your customer?"**
A hobby maker, 24 to 40, with a 3D printer, who has made something people ask to buy and is tired of printing it by hand. They don't know whether molding makes sense, what it costs, or who makes it.

**"How many of them are there?"**
MakerWorld has 10M monthly users and 280K active designers. Over 30K of its users print 7+ hours a day, which is already small-scale production. Over 1M entry-level 3D printers shipped in Q1 2025 alone. We estimate about 500K creators we can realistically reach, and the base case needs 0.4% of them.

**"Why would someone with no experience trust software to plan manufacturing?"**
Because the alternative is guessing. We show every cost as a range labeled "estimate," explain why each design change saves money, and before anything is ordered the creator approves the plan and sends every message themselves.

## 2. Product

**"What does it actually do today?"**
Live demo: upload a 3D file, get measured geometry and 2–4 ways to manufacture it with cost ranges, design tweaks, a business case with break-even, shop matches, supplier emails, a bill of materials, an order plan, a launch timeline and an Etsy-ready listing.
**Weak spot:** the LA shops, their quotes and the assemblers are simulated demo data, and the app never places orders. *Say it first:* "The manufacturing network is simulated today; signing real shops is our next step."

**"How accurate are your cost estimates?"**
They're AI estimates grounded in the part's measured geometry, always shown as ranges.
**Weak spot:** we haven't compared them to real quotes yet. *Fix:* run 10 real parts through Moko and compare them with real quotes from Xometry and local shops. The pass line is 7 of 10 within 25%.

**"Isn't this just a ChatGPT wrapper?"**
No. The AI gives judgment (how to make it, what to change), but the numbers that matter are calculated by tested code: margins, break-even, quote comparison, shop matching and order plans. The product also measures the actual 3D file, keeps every version, and ties each design change to cost and supplier. A chatbot doesn't know your part.

**"What happens when the estimate is wrong and a creator loses money?"**
Estimates are labeled as ranges, the creator approves every order, and our terms will make clear we don't manufacture the product. Once real orders run through Moko, we hold payment until delivery, which protects the creator from a bad factory.

## 3. Market and competition

**"Why won't Xometry or Protolabs do this?"**
Their customer is an engineer with a finished CAD file who knows what they want. Ours is a first-timer with a prototype who doesn't know what to ask for. Xometry's 81,821 buyers bring in $630M a year, and none of that is aimed at creators.

**"What about Pietra?"**
Pietra helps brands source existing or private-label products; it doesn't read your design. We start from your own prototype and change the design to make it cheaper to produce.

**"What about Alibaba's AI agents, or Backflip?"**
Alibaba's tools are built for overseas, high-volume sourcing. Backflip turns a photo or text into a 3D model and stops there. We cover the whole path from prototype to first sale, including small local runs.

**"What stops a big company copying you?"**
Two things. First, focus: first-time creators are too small a customer for industrial platforms. Second, data: every real quote and completed run makes our cost estimates more accurate, and a copycat starts without that history.
**Weak spot:** that data advantage doesn't exist until we have real orders.

## 4. Business model

**"How do you make money?"**
Design is free. The Pro subscription ($29 a month, or $19 billed yearly) unlocks quotes, sourcing, the bill of materials, the order plan, the launch plan and listings. We take a commission on production runs ordered through Moko, and later manufacturers pay for qualified quote requests.

**"Why would someone pay monthly if they launch one product a year?"**
Good question, and it's our biggest pricing risk. We're testing a one-time per-product launch pack alongside the monthly plan.

**"How do you take a commission if sales happen on Etsy?"**
We don't rely on Etsy sales. The commission is on production runs, because creators pay for those through Moko. Etsy won't collect a fee for us, and creators already pay Etsy about 10% per sale, so stacking another cut would feel like double charging. We'd only charge a sales commission on Moko's own pre-order pages.

**"What are your unit economics?"**
In the base case, each paying creator brings in about $41 a month across all streams and costs about $12 (AI, card fees, marketing, support), leaving $29. At 7% of subscribers cancelling a month they stay about 14 months, so each is worth about $410. That means we can spend up to about $135 to win a paying creator.

**"How much revenue in 3 years?"**
Base case $734K in year 3, low case $45K, high case $11M. Every model input is in a spreadsheet, and the growth and cancellation figures are our assumptions until we have launch data.
**Weak spot:** zero revenue and zero paying users today. *Fix:* a founding Pro offer with a real payment link. The pass line is 10 paying creators.

**"What's your biggest assumption?"**
That 4% of free users will pay. At 2% the business loses money; at 6% it's profitable in year 3.

## 5. Go to market

**"How will you get users?"**
We build in public: each of us takes our own hobby project to production with Moko and posts every step. We post in the communities where makers already ask "can this be mass produced?", give every analysis a shareable cost card, and run workshops at campus makerspaces.

**"What does it cost you to get a user?"**
Our target is under $5 per free sign-up, mostly organic. We don't have real data yet.

**"How do you get manufacturers on board?"**
By hand at first: a partner agreement, a referral fee on orders they win, and small, well-specified jobs that fill their idle time. The creator side works even before any shop joins, because the analysis and plan are useful on their own.
**Weak spot:** no real manufacturer has signed. *Fix:* call 30 shops. The pass line is 10 willing to quote within 48 hours.

## 6. Team and execution

**"Why you?"**
We're the customer: every one of us has a hobby product stuck at the prototype stage. We built a working product end to end in days: 3D analysis, AI manufacturing paths, sourcing, order planning and listings.

**"What have you validated so far?"**
Say it straight: "One discovery call, a working product and market data. The next four weeks are customer interviews, an accuracy test, a paid founding offer, and manufacturer calls, each with a pass line decided in advance."

**"How much money do you need, and for what?"**
In the base case, about $80–90K covers losses until we're profitable month to month, around month 23. It pays for a small team in year 2, real manufacturer onboarding, and payments infrastructure.

## 7. Legal, risk and trust

**"Who owns the creator's design? Do manufacturers see it?"**
The creator owns it. Projects are private by default, and manufacturers see only a spec summary (size, material, quantity, process) until the creator chooses to share more. We'll offer NDAs before full files are shared.

**"What data do you send to AI, and who sees it?"**
Photos, notes and measurements go to Anthropic's API for analysis. The CAD file itself isn't sent, only its measurements, and creators can turn photos and notes off.

**"What if a manufacturer delivers bad parts?"**
Today the creator deals with the manufacturer directly, and our terms need to say that clearly. Once orders run through Moko, we hold payment until delivery and add a dispute process.

**"Have you checked the name?"**
Not yet. Trademark and domain checks for Moko are on our list.

---

## Weak spots to close before the next grilling

| Question we can't fully answer today | What closes it | Pass line |
|---|---|---|
| Do hobby makers really have this problem? | 15 interviews | 8 of 15 have a product stalled on manufacturing |
| Are our cost estimates right? | 10 parts vs real quotes | 7 of 10 within 25% |
| Will anyone pay? | Founding Pro offer with a real payment link | 10 paying creators |
| Will real manufacturers join? | Call 30 LA shops | 10 willing to quote in 48 hours |
| Will creators order through us? | Broker 3 runs by hand | 3 paid orders |
| Is the name safe? | Trademark and domain search | Clear, or pick a new name |

Even one or two of these closed turns "we believe" into "we measured," which is what judges and investors are listening for.
