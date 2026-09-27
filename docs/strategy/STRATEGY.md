# Moko: Target Market, Distribution and Business Model

> Draft for team review, 2026-09-27. Built only from the team's clarified idea (jack, 27 Sep). Earlier positioning in PRODUCT.md is not used here. Anything marked **Decision** is for the team to settle.

## The idea, in one paragraph

We're all creators. We've each had an idea for a physical product and started it as a hobby project, but never got it built at scale or sold, because getting from a prototype to a manufactured, sellable product is hard. Moko is a tool for people with no manufacturing experience who have an idea and want to turn it into a real product. It puts every step in one place, from nothing to a product people can buy.

**The job Moko does:** take a hobby project past the point where it usually dies, which is getting it made and making money from it.

---

## 1. Target market

### Who it's for
The team's instinct is "the average creator who has an idea and wants to build it." That's the right long-term market. It's too broad to launch into, though: you can't find, reach or write copy for "everyone with an idea." So we keep that as the market and pick one **beachhead** inside it to win first.

| Segment | Who | Where they're stuck | Reachability | Fit |
|---|---|---|---|---|
| **Hobby makers with a prototype** (recommended beachhead) | People with a 3D printer, a workshop or a CAD hobby who've made something that works | They made one; they don't know how to make 500, what it costs, or who makes it | High: concentrated in a few communities (Printables, MakerWorld, Thingiverse, r/3Dprinting, maker Discords, YouTube) | Best. They already have a CAD file, which is what Moko reads best. This is also us. |
| Side-hustle sellers | Etsy, TikTok Shop or Shopify sellers who want an original product | They know how to sell, not how to manufacture | Medium: seller forums and groups | Good second segment. They'll pay because they already sell. |
| Students and first-time founders | Engineering, design and entrepreneurship students | Have a class or club project; no budget, no supplier contacts | High on campus, low elsewhere | Good for early users and testing, weak for revenue |
| "Idea people" with no prototype | Someone with a sketch or just a description | Everything | Low: no single place to find them | Later, once sketch-to-CAD works well |

**Recommendation: start with hobby makers who already have a prototype.**
- They're the team's own story, so our content is honest and specific ("we took our own hobby project to production").
- They already have a 3D file, so Moko's analysis works on day one.
- They gather in a handful of communities, so distribution is cheap.
- In June 2025, Etsy stopped allowing 3D prints of designs bought from other people. Makers who want to sell now need original products and a way to produce them. ([TCT Magazine](https://www.tctmagazine.com/from-templates-to-originality-etsy-new-3d-printing-policy/))
- Etsy's "Designed by a seller" category explicitly allows original designs made by a production partner, with disclosure, so a Moko-made product can be sold there. ([Etsy Creativity Standards](https://www.etsy.com/legal/creativity))

**Decision:** confirm the beachhead. Alternative: side-hustle sellers, who are faster to monetize but harder to reach and further from what the product does best.

### Persona: "Sam, the stuck maker"
- 24–40, has a 3D printer, has made something friends ask to buy (a gadget holder, a mount, a tool, a game accessory).
- Has printed 20 by hand and is tired of it. Doesn't know if injection molding makes sense, what it costs, or where to find a factory.
- Watches maker YouTube, posts on Reddit and Printables, maybe has an Etsy shop with a few sales.
- **What they want to hear:** "Here's what it costs to make 500 of yours, who can make it, and what you'd earn per sale."

---

## 2. Distribution strategy

The principle: **the free design tool is the marketing.** Every analysis produces something worth sharing, and every share brings in the next maker.

### Channels, in the order we'd start them

| # | Channel | What we do | Why it works | Measure |
|---|---|---|---|---|
| 1 | **Build in public** (TikTok, YouTube Shorts, Instagram Reels, X) | Each team member takes one of their own hobby projects from prototype to a real production run using Moko, and posts every step: the cost surprise, the design tweak, the first quote, the first sale | "We're creators too" is our strongest story; people follow a project to see if it ships | Followers, clicks to the app |
| 2 | **Maker communities** | Post useful answers and real before-and-afters in r/3Dprinting, r/functionalprint, r/Etsy, Printables and MakerWorld, and maker Discords. Answer "can this be mass produced?" threads with a free Moko analysis | The beachhead already gathers there and asks this exact question | Uploads per post |
| 3 | **Share cards from the product** | Every analysis offers a one-tap image: "Costs $4–6 to make at 500 units. Sells for $25." with the 3D render and a Moko link | Makers love sharing their numbers; each card is a free ad | Shares per analysis, sign-ups per share |
| 4 | **Campus and makerspaces** | Workshops at university makerspaces, engineering and entrepreneurship clubs, and local makerspaces: "bring your prototype, leave with a production plan" | Dense groups of makers with prototypes; we're a club, so we're already inside this channel | Sign-ups per event |
| 5 | **Creator partnerships** | Give maker YouTubers and 3D-printing creators Pro for free to take one of their designs to production on video; pay a referral fee on subscriptions they bring | Their audience is our beachhead | Referred sign-ups, paid conversions |
| 6 | **Search** | Pages for the questions makers search: "how much does injection molding cost", "3D print to mass production", "how to manufacture a product" | Long-term, compounding traffic | Organic visits |

### Sequencing
- **First 30 days:** channels 1–3. Goal: 500 sign-ups, 100 real uploads, and every team member's own product in production.
- **Days 30–90:** add campus events and 3–5 creator partnerships. Goal: first 50 paying subscribers.
- **After 90 days:** search pages, and supply-side outreach to manufacturers (below).

### The supply side
Makers need someone to make their product. Manufacturers get a steady flow of small, well-specified orders, pre-packaged by Moko (spec sheet, BOM, quantity, target price). Early on we recruit them by hand: we call shops and contract manufacturers, starting with ones that take low-volume runs. Once we route real orders, they come to us.

---

## 3. Business model

The team's model: **designing is free; producing and selling cost money** (a subscription), plus a **commission on sales**, plus **advertising** from manufacturers and product suppliers. Here's how each part would work, and what to watch out for.

### 3.1 Free: design
Everything up to "I know this can be made and what it costs":
- Upload a CAD file, photos or sketches; AI analysis; manufacturing options with cost ranges; design tweaks; versions and compare; a limited number of AI assistant questions.
- **Why free:** it's the hook for distribution and the share cards. It costs us roughly **$0.60 of AI per analysis at most** (the app's own budget ceiling, `lib/usage/budget.ts`), so we cap free analyses per month.

### 3.2 Subscription: produce and sell
Unlocks everything needed to get the product made and on sale:
- Manufacturer quotes and outreach, supplier emails, bill of materials, order plan, launch plan, sales listings, unlimited products and AI assistant.

**Suggested price:** **$29/month, or $19/month billed yearly.** Comparable tools that creators already pay for:
- Printify Premium: $24.99–39/month ([Printify pricing](https://printify.com/pricing/))
- Pietra Essentials: $29–39/month; Business $149–199/month ([Pietra](https://help.pietrastudio.com/en/articles/8568044-what-does-it-cost-to-use-pietra))

A full product journey costs us about **$2 of AI at most** (per-action ceilings in the app), so the subscription margin is high.

**Decision:** monthly subscription vs. a one-time "production pack" per product. Makers may only launch one or two products a year, which makes a monthly fee harder to keep. Worth testing both.

### 3.3 Commission on sales
This is the hard part, because sales happen on Etsy, Shopify, Amazon or TikTok Shop, not on Moko. We never touch the money, so we can't just take a cut. Four ways to do it:

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Commission on production orders** (recommended first) | The creator places and pays for the manufacturing run through Moko; we take a percentage (e.g. 5–8%) before paying the manufacturer | We're in the money flow; easy to collect; it's how Xometry makes money | Needs payments and real manufacturer partners; it's a fee on making, not selling |
| **B. Commission on sales in connected stores** | The creator connects their store. Shopify lets an app bill usage-based charges with a monthly cap ([Shopify docs](https://shopify.dev/docs/apps/launch/billing/subscription-billing/create-usage-based-subscriptions)), so we'd bill a small % of the product's sales. Etsy's API can read a shop's orders with the `transactions_r` scope ([Etsy API](https://developers.etsy.com/documentation/tutorials/fulfillment/)), and we'd invoice the creator | A true sales commission, and it scales with success | Etsy needs its commercial API approval for apps serving other sellers. Etsy already takes about 6.5% + 3% + $0.25 per sale plus $0.20 per listing, so our cut stacks on top. Invoicing after the fact means unpaid bills |
| **C. Moko pre-order and storefront pages** | Creators take pre-orders on a Moko page before paying for tooling; payments go through Stripe Connect and we take an application fee on each sale | We're in the money flow; pre-orders prove demand before the big spend, which fits the product | We become a selling platform, with payments, refunds and support |
| D. Honor system | Creators report their sales | None | Doesn't work; skip |

**Recommendation:**
1. **Launch with A** (commission on production runs). It's collectable and fits the moment we add the most value.
2. **Add C** (pre-order pages) next, which gives a real commission on sales we host and a great feature ("test demand before paying for tooling").
3. **Add B for Shopify** once creators have stores to connect; hold off on Etsy until we pass their commercial review.
4. Keep the total take small (say 3–5% on sales) so creators don't feel they're paying twice on top of Etsy or Shopify fees.

**Decision:** which commission to start with, and the percentage.

### 3.4 Advertising: manufacturers and suppliers
Manufacturers, material suppliers and tool brands pay to be seen by creators who are about to place orders. This is a valuable audience.

How to do it without breaking trust:
- **Labeled sponsored spots** ("Sponsored manufacturer") shown beside, never inside, the ranked matches. Paid placement must never change a match score or the "best value" pick; if creators think the ranking is for sale, the product's value is gone. US rules also require ads to be clearly disclosed.
- **Featured profiles** for manufacturers: photos, certifications, verified reviews and faster response badges, for a monthly fee.
- **Pay per qualified lead:** a manufacturer pays when a creator sends them a quote request. This fits better than banner ads, because both sides want the lead.
- **Tool and material placements** (3D printers, filament, packaging) in relevant steps, clearly labeled.

**Timing:** this only works once we have enough creators placing real orders, so it's a phase-two revenue stream.

### 3.5 How it adds up

| Stream | Starts | Who pays | Example |
|---|---|---|---|
| Subscription | Launch | Creators | $29/month |
| Commission on production runs | When real manufacturers are signed and payments work | Taken from the order | 6% of a $2,500 run = $150 |
| Commission on pre-orders and connected-store sales | After production commission | Taken from each sale | 4% of a $25 sale = $1 |
| Manufacturer leads and sponsored spots | Once order volume is steady | Manufacturers and suppliers | e.g. $20–50 per qualified quote request |

The numbers in the example column are placeholders to test, not research.

---

## 4. Decisions for the team

1. Beachhead: hobby makers with a prototype (recommended) or side-hustle sellers?
2. Subscription: $29/month, or a one-time pack per product?
3. First commission: production runs (recommended), pre-orders, or connected stores?
4. Advertising: are we OK with sponsored manufacturer spots if they never affect rankings?
5. Do we want a validation plan (tests with pass and fail lines) for this beachhead before launch?
