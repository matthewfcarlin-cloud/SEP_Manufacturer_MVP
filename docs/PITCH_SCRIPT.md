# Moko pitch script (5 minutes)

Open `/present`. Click / arrow / space = next line. **N** shows these notes on screen, **F** = fullscreen. Generated from `components/deck/script.ts`.

## Slide 1 · title

- **[click]** Hi, we're Moko. We help first-time product creators find the manufacturers who can actually make their idea, and reach out to them the right way.

## Slide 2 · problem (01 · Problem & origin)

- **[click]** We came to this through a customer discovery call with Kendall, a veteran model maker who's built for Lucasfilm, Mattel and Sega. He pitches about 250 product ideas a year.
- **[click]** Two land. Two out of two hundred and fifty.
- **[click]** And the rest mostly don't die because the design was bad. They die on manufacturing: nobody could make them at a price that worked. His advice: design around what real factories make, and find the one who can take your run early.

## Slide 3 · first-timers (01 · Problem & origin)

- **[click]** If that happens to a pro, imagine a first-timer. They hit the same wall: can this be made, who can make it, what do I even ask them, is the quote fair, and will it make money?
- **[click]** Today they piece it together from Google, Alibaba, supplier directories and Reddit threads, cold-email factories with a vague ask, and wait. Nothing tells them who's right for this part or what a fair price is.

## Slide 4 · product (What we built)

- **[click]** So we built Moko. It takes an idea all the way to the right manufacturer, and then on to launch and a first sale.
- **[click]** You bring whatever you have: a CAD file, photos, notes. Here's a real one, a guitar pedal enclosure, 250 units.
- **[click]** Moko measures the part and lays out every way to make it, priced for your quantity, with specific tweaks that make it cheaper to manufacture.
- **[click]** Then the core: it finds the manufacturers who can make it, ranked by process, size, material, run size and how soon they can start. Local shops are fictional demo data today, and labeled that way.
- **[click]** And it does the outreach. It writes a spec sheet that shares only what a shop needs, requests quotes, and compares them on all-in cost and lead time. For overseas suppliers it plans the Alibaba search and drafts each email; you send it yourself. Quotes here are simulated.
- **[click]** Before you commit, the business case. At $32 retail it says plainly that this doesn't make money at 250 units yet. Better to learn that here than after a $10,000 tooling bill.
- **[click]** Then a dated launch plan and an Etsy-ready listing, priced from that business case.

## Slide 5 · tech (02 · Tech stack)

- **[click]** The stack: Next.js 16, React 19 and three.js, with STEP files read through OpenCascade in WebAssembly. Every AI call goes through one gateway. It picks the key, the creator's own, encrypted with AES-256-GCM, or our capped house budget; routes each task to a model; validates structured output against a schema with one retry; and meters tokens without storing any content.
- **[click]** And it learns from real results, only from creators who opt in, and never from files or notes. Real quotes calibrate the cost ranges, tweaks are ranked by what actually worked, and a 12-part eval harness scores every prompt change.

## Slide 6 · market (03 · Market & distribution)

- **[click]** Who it's for. Our beachhead is Etsy sellers who've outgrown print-on-demand and want a product that's really theirs. Then students and first-time founders, and hobby makers with a 3D printer. Manufacturers are the other side: they get clear, ready-to-quote requests instead of vague cold emails. We reach creators where they already are: USC groups, Discord and maker subreddits, with a free five-minute 'see who can make it'.
- **[click]** Here's where we are today. (Read the numbers, or today's goal if they're not in yet.)

## Slide 7 · field (03 · Market & distribution)

- **[click]** Everyone else covers one piece. Design tools stop at the model. Alibaba and Thomasnet are directories: you still find, vet and write to suppliers yourself. Xometry and Craftcloud need finished CAD. Printify only does catalog products. Etsy and Shopify only sell.
- **[click]** We're the only one taking a first-timer from an idea to the right manufacturer, with manufacturability and profit checked before they spend.

## Slide 8 · business (04 · Business plan)

- **[click]** How we make money: free to find out if your idea can be made and who can make it. A Pro subscription for outreach, quotes, plans and listings. And once real shops are connected, a small fee on production orders routed through Moko, Printify's model for original products.
- **[click]** The margins hold because AI is our only real variable cost, and it's small: the whole trip from idea to first supplier email is about a dollar of AI at our conservative estimates. Creators can bring their own key, and the free budget is capped per browser and per day.

## Slide 9 · close

- **[click]** Next: sign our first ten real LA shops, send requests from inside Moko with the creator's approval, let real quotes feed the cost calibration, and add checkout and direct Etsy publishing.
- **[click]** Our ask: try it with your idea, and introduce us to anyone with a product they've never made, or a shop that wants small-run work.
- **[click]** Thank you. Happy to take questions.

## Slide 10 · appendix (Appendix)

- **[click]** Backup for Q&A. Don't present this slide.
