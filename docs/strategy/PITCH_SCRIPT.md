# Moko: Pitch Script

> Draft for team review, 2026-09-27. Built on the team's current idea (jack, 27 Sep): we're creators whose hobby products never got built, and Moko gives first-timers every tool in one place to take a physical product from idea to reality. Numbers come from [STRATEGY.md](STRATEGY.md), [MARKET_AND_REVENUE.md](MARKET_AND_REVENUE.md) and the pedal demo project. It follows Sam's deck at `/present` where the two agree; where they don't, see "Where Sam's deck and this script disagree" at the end. Nothing in the deck has been changed.

**Format:** about 3 minutes spoken (~450 words at a normal pace), three speakers, one short live demo. Speaker names are placeholders: swap in who takes what.

- **A** opens and tells the origin story (whoever has the best stuck hobby product).
- **B** drives the demo and covers the tech.
- **C** covers market, business model and the ask.

Timings are targets. Rehearse with a timer; if you run long, cut the tech section to its first sentence.

---

## The 3-minute script

### 1. Title (0:00–0:10) · A · slide "title"

> Hi, we're Moko. We help people who've never made a product take their idea all the way to something real they can sell.

### 2. The problem, and how we got here (0:10–0:45) · A · slides "problem", "first-timers"

> We're all creators. Every one of us has a hobby project that worked as a prototype and then just stopped. *(A: name yours in one line, e.g. "Mine is a ___ I've printed 20 of by hand.")*
>
> It isn't only us. We talked to a model maker who's built for Lucasfilm, Mattel and Sega. He pitches about 250 product ideas a year, and two land. The rest don't die on design. They die on manufacturing and cost.
>
> A first-timer hits five questions at once: can this be made, what will it cost, who makes it, will it make money, and how do I sell it. Today that's six tools that don't talk to each other.

### 3. What Moko is (0:45–1:05) · A → B · slides "journey" (moko → sell)

> **A:** Moko puts the whole path in one place: idea, design, make, money, launch, sell. Each step hands off to the next, so you never wonder what to do now.
>
> **B:** Let me show you.

### 4. Live demo (1:05–1:50) · B · slide "demo", then switch to the app

Open the pedal example (`/project/yAeM9-RDOE`). Stay on one product; click, don't type.

> A guitar pedal enclosure, 250 units. Moko found four ways to make it. Machining runs about $28 to $48 each. Molding is $4 to $9, but only after $9,000 to $20,000 of tooling.
>
> *(Money tab)* At a $32 retail price, it tells us straight that nothing makes money at 250 units yet. Better to learn that here than after a $10,000 tooling bill.
>
> *(Make tab)* It finds manufacturers, writes the request, and lines up quotes. These shops are demo data, labeled that way; signing real ones is our next step.
>
> *(Launch, then Sell)* Then a launch plan with dates and a budget, and a ready-to-paste Etsy listing.

**If the demo fails:** stay on the "journey" slide and narrate the same four beats from it. Don't debug on stage.

### 5. How it's built (1:50–2:05) · B · slide "tech"

> Under the hood, Moko measures the real 3D file in the browser. AI gives the judgment, how to make it and what to change, but margins, break-even and quote comparison come from tested code. And the CAD file itself never goes to the AI, only its measurements.

### 6. Who it's for and how we reach them (2:05–2:30) · C · slide "market"

> We start with hobby makers who already have a prototype: people with a 3D printer who've made something friends want to buy. MakerWorld alone has 10 million monthly users.
>
> We reach them by building in public: each of us takes our own project to production with Moko and posts every step where makers already ask "can this be mass produced?"

### 7. Business model (2:30–2:50) · C · slide "business"

> Designing is free. Producing and selling is a $29-a-month subscription, plus a small commission on production runs ordered through Moko. In our base case, commissions are about 40% of revenue by year three.

### 8. Close (2:50–3:00) · C · slides "close" (ask → thanks)

> We're the customer, and we built the tool we needed. Try it with your idea, and send us anyone with a product they've never made. Thank you.

---

## The 30-second version

For an elevator, a hallway, or a judge who says "give me the short version." One speaker.

> We're creators. We've all had hobby projects that worked as prototypes but never became products, because getting something manufactured is where first-timers get stuck. Moko takes your idea and tells you how to make it, what it costs, who can make it, whether it makes money, and how to sell it, all in one place. Designing is free; creators pay to produce and sell, and we take a small commission on production runs. We're starting with hobby makers who already have a prototype: MakerWorld alone has 10 million of them a month.

---

## Honesty rules for the stage

Judges forgive "not yet." They don't forgive finding out on their own.

- **Say "demo data" before they ask.** The shops, their quotes and the assemblers are fictional and badged in the app.
- **Costs are estimates.** Say "about" or "runs" and give ranges, never a single cost as fact.
- **We haven't proven anyone will pay yet.** If asked, give the test: a founding Pro offer, pass line 10 paying creators. (QA_PREP.md has the rest.)
- **No made-up traction.** The deck's traction beat shows the goal until someone fills in real numbers in `components/deck/script.ts`.

## Slides to skip in a 3-minute slot

Sam's deck runs about 5 minutes. For 3, click past these (they're still there for Q&A):

- "printify" (the Printify comparison): a strong line if you have time; otherwise skip.
- "field" (competition) and "why-now": save them for questions.
- "tech" beats "gateway" and "learning": keep only "stack".
- "business" beat "margins": keep only "model".
- "appendix": never presented.

---

## Where Sam's deck and this script disagree

These are for the team to decide. The script follows the new idea; the deck hasn't been changed.

1. **Beachhead.** The deck's market slide (`components/deck/scenes/Market.tsx`) and its speaker note make **Etsy sellers who've outgrown print-on-demand** the beachhead and list hobby makers as "Next." STRATEGY.md picks **hobby makers with a prototype**. The script says hobby makers. On that slide, either update the card order or say the line above over it.
2. **Distribution.** The deck leads with USC groups, the Iovine and Young Slack, Discord and X, plus Moko's own waitlist page. STRATEGY.md leads with building in public and maker communities (Reddit, Printables, MakerWorld). These can coexist, but the slide and the script should name the same first channel.
3. **Opening story.** The deck opens with the professional inventor. The new idea opens with the team's own stuck hobby projects. The script leads with ours and keeps the inventor as proof it's not just us.
4. **Business model.** The deck says Free, Pro and an "order fee" plus shop referral fees. That matches the new model except it doesn't mention a sales commission or manufacturer ads. STRATEGY.md holds both of those back until later, so the script leaves them out too. Worth deciding whether to mention them as "later."
5. **"A landing page with a waitlist is what we're building today"** (deck notes for "launch" and "distribution"). I couldn't find a waitlist or landing-page feature in the app. If it isn't built by pitch day, drop that line.
6. **Why-now stat.** The deck's "36% of manufacturers are reshoring" (2026 Reshoring Survey) isn't in our strategy docs, so I couldn't check it. Have the source ready if you keep that slide.
7. **Traction beat.** Still empty (`traction` in `script.ts`). Fill it with real numbers, or the slide shows the goal instead.
