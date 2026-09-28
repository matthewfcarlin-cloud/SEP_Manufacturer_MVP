# Moko Design Spec v2: "The Workshop"

The feel: a friendly, warm maker's studio for first-time creators. Think Shopify admin's calm + Airbnb's guided onboarding + Canva's studio layout. **Not** a spec sheet, not brutalist, not "AI dashboard".

Every value below is exact. Don't approximate, and don't keep old styles "for consistency". The old look is being replaced.

---

## 1. What to remove everywhere

- ALL-CAPS headings (except the Moko logo). Every heading is sentence case.
- Mono uppercase labels with wide letter-spacing ("STAGE 2 OF 6 · DESIGN · V1"). Mono is only for prices and quantities.
- Numbered eyebrows ("01 · IDEA").
- Sharp 0px corners and 1px-bordered boxes around everything.
- Orange left-border callouts.
- The dark sidebar and dark top bar.
- Giant 80px+ headings inside the app (home hero only).
- Duplicate titles (a tab name repeated as a big heading).

---

## 2. Tokens

### Fonts (via `next/font`)
| Role | Font | Weights | Use |
|---|---|---|---|
| Headings | **Bricolage Grotesque** | 600, 700 | Page titles, card titles, hero |
| Body / UI | **Geist Sans** | 400, 500, 600 | Everything else |
| Numbers | **Geist Mono** | 500 | Prices, quantities, dates in tables only |

### Type scale
| Token | Size / line-height | Font | Use |
|---|---|---|---|
| display | 64 / 1.05, -0.02em | Bricolage 700 | Home hero only (40 on phone) |
| h1 | 32 / 1.2, -0.01em | Bricolage 700 | Page title |
| h2 | 22 / 1.3 | Bricolage 600 | Section title |
| h3 | 17 / 1.4 | Geist 600 | Card title |
| body | 15 / 1.6 | Geist 400 | Paragraphs |
| small | 13 / 1.5 | Geist 400 | Meta text, helper text |
| price-lg | 28 / 1.1 | Geist Mono 500 | Main price on a card |

### Colors (light)
| Token | Hex | Use |
|---|---|---|
| bg | `#FAF8F5` | Page background (warm paper) |
| surface | `#FFFFFF` | Cards, panels, inputs |
| sidebar | `#F3F1EC` | Sidebar background |
| ink | `#1C1917` | Headings, primary text |
| ink-2 | `#57534E` | Body text |
| muted | `#A8A29E` | Meta text, placeholders |
| border | `#ECE9E4` | Hairlines (use sparingly) |
| accent | `#F25C2A` | Moko orange: primary buttons, active states, progress |
| accent-hover | `#DD4A19` | |
| accent-soft | `#FFEFE7` | Selected tiles, badges |
| green | `#16A34A` / soft `#E8F7EE` | Done, profitable, available |
| amber | `#D97706` / soft `#FEF4E2` | Needs attention |
| red | `#DC2626` / soft `#FDECEC` | Losing money, errors |
| blue | `#2563EB` / soft `#EAF1FE` | Info, links in text |

### Colors (dark)
bg `#141210`, surface `#1E1B18`, sidebar `#191714`, ink `#F5F5F4`, ink-2 `#C8C3BD`, muted `#8A847D`, border `#2E2A26`, accent `#FF6B3A`, accent-soft `#3A2218`. Soft semantic colors at 15% opacity of their base.

### Shape and depth
| Token | Value |
|---|---|
| radius-card | 16px |
| radius-control | 10px (buttons, inputs, tabs) |
| radius-pill | 999px |
| shadow-card | `0 1px 2px rgba(28,25,23,.04), 0 4px 16px rgba(28,25,23,.04)` |
| shadow-hover | `0 8px 28px rgba(28,25,23,.10)` + `translateY(-2px)` |
| shadow-pop | `0 16px 48px rgba(28,25,23,.16)` (menus, modals) |

Cards have **no border** in light mode, only shadow-card. In dark mode, a 1px border using the `border` token and no shadow.

### Spacing
4px grid. Page padding 40px desktop / 16px phone. Content max-width 1180px. Card padding 24px (20 on phone). Gap between cards 20px. Section gap 48px.

### Motion
All transitions 160ms `cubic-bezier(.2,.8,.2,1)`. Hover lift on cards. Skeleton shimmer for loading. Respect `prefers-reduced-motion` (no lift, no shimmer, no confetti).

### Icons
`lucide-react`, 18px, stroke 1.75. Icons sit beside every nav item and primary action.

---

## 3. Components

**Buttons (height 44, radius 10, Geist 600 15px)**
- Primary: accent bg, white text, hover accent-hover. One per screen section.
- Secondary: surface bg, ink text, 1px border, hover bg `#F5F3EF`.
- Ghost: no bg, ink-2 text, hover bg `#F5F3EF`.
- Small variant: height 36, 14px.

**Inputs:** height 44, radius 10, surface bg, 1px border, focus = 2px accent ring (`0 0 0 3px #FFEFE7` + border accent). Label above, 14px 500. Helper text below, 13px muted.

**Status pill:** height 26, radius pill, 13px 500, soft bg + strong text of the same color (e.g. green-soft bg / green text "Ready to sell"). A 6px dot before the text.

**Progress bar:** 6px tall, radius pill, track `#ECE9E4`, fill accent, with "Step 3 of 6" in small muted text beside it.

**Stage stepper (vertical):** 28px circles. Done = green fill + white check. Current = white fill + 2px accent ring + pulsing 6px accent dot. Upcoming = `#ECE9E4` fill + muted number. 2px connector line between circles (green if done).

**Summary card ("verdict"):** surface, radius 16, padding 28. Icon in a 40px soft-color circle, verdict sentence in h2, one line of explanation, then ONE primary button. Color follows the verdict (green profitable, amber check this, red losing money).

**Details accordion:** "See the details" ghost button with chevron. Opens with a 160ms height animation. All tables and raw numbers live here.

**Empty state:** centered, 120px friendly line illustration (simple SVG of a box, a tool, or a spark), h2, one sentence, one primary button.

**Toast:** bottom-center, ink bg, white text, radius 12, 3s, with an icon. "Quote chosen", "Copied".

**Menu (⋯):** surface, radius 12, shadow-pop, items 36px tall with icons. Delete in red, separated by a divider.

**Celebration:** when a stage completes, the stepper circle animates to a green check, plus a small confetti burst (canvas-confetti, 60 particles, accent + green) and toast "Nice, Make is done. Next: plan your launch."

---

## 4. Layouts

### App shell
- **Sidebar, 248px, light (`sidebar` color).** Logo at top (24px padding). Nav items 40px tall, radius 10, icon + label, 15px 500: Home (`Home`), My products (`LayoutGrid`), Ask Moko (`Sparkles`), Manufacturers (`Factory`), Settings (`Settings`). Active item: surface bg + shadow-card + accent icon. Then "Recent" (small muted label, sentence case) with 3 products, each with a 20px render thumbnail.
- **Bottom of sidebar:** a small usage card: "Demo budget", a thin progress bar, "$2.98 left", and an "Add your key" link. Below it, the user avatar + name.
- **No dark top bar.** Each page has its own header: h1 left, primary action right ("+ New product").
- Phone: sidebar becomes a bottom tab bar (Home, Products, Ask, More).

### Home (dashboard, `/studio`)
1. Greeting: "Good afternoon, Matthew" (h1) + "Here's where your products stand." (body, ink-2).
2. **Continue card** (full width): 3D render on the left in a 280px `#F3F1EC` rounded panel, and on the right: product name (h2), status pill, progress bar, "Next: Compare your 5 quotes" as a primary button.
3. **Getting started checklist** (right column on desktop, like Shopify's setup guide): "Your first product" with 5 steps, checkmarks, a progress ring (48px), and each unchecked step linking to its screen. Collapses when done.
4. **Your products grid:** 3 columns (2 tablet, 1 phone). Card = render area 200px tall on `#F3F1EC` with the model centered, then padding 20: name (h3), status pill, progress bar + "Step 3 of 6", "Edited 2h ago" (small muted), ⋯ menu top right of the card.

### New product flow (`/new`)
- Full-screen, no sidebar. Top: Moko logo left, "Save and exit" ghost right, progress bar across the top.
- Centered column 560px. One question per screen, h1 size, with a one-line helper under it.
- Screens:
  1. "What are you making?" Name input + "Describe it in a sentence" textarea.
  2. "Show us what it looks like." A 240px dashed dropzone (radius 16, 2px dashed `#D6D3CE`, hover accent), with an upload icon, "Drop a 3D file, photos or a sketch", and "Don't have any? Skip, a description is enough."
  3. "How many do you want to make?" Four 120px tiles in a 2×2 grid: "Just a few (10)", "A small batch (100)", "A real run (1,000)", "Not sure yet". Each has an icon. Selected = accent-soft bg + 2px accent border.
  4. "Do you have a budget?" A $ input + "Skip" link.
  5. Review: a summary card with edit links, and a big "Create my product" button.
- Bottom bar: Back (ghost) left, Continue (primary) right. Enter continues.
- After create: a friendly loading screen, the model slowly spinning, with rotating lines: "Measuring your part…", "Finding ways to make it…", "Estimating costs…".

### Product studio (`/project/[id]`)
- Three columns: **stage stepper 220px** | **main** | **Ask Moko 360px** (collapsible to a floating button).
- Main, top: product name (h1), status pill, ⋯ menu. Below: the 3D model in a 320px-tall `#F3F1EC` rounded panel with drag-to-rotate and a small "Rotate · Zoom" hint.
- Below the model: the current stage's **Summary card** (verdict + one button), then "See the details".
- Stage stepper items: Idea, Design, Make, Money, Launch, Sell. Clicking one shows that stage in the main column. No top tabs.

### Stage screens
- **Design:** summary "Here's the best way to make it: 3D printing, about $9–$18 each." Below, suggestions as cards: a lightbulb icon, the tweak in plain words, "Saves about $2 each", and an "Apply this" button that creates a new version.
- **Money:** a big verdict card ("At $32 you'd make about $6 per sale" in green, or "you'd lose money" in red). A price slider (retail price) that updates profit live. A simple bar chart of profit at 100 / 1,000 / 10,000 units. Details hold the full table.
- **Make:** "Get quotes" primary. Quote cards in a row: shop initials avatar (40px circle, soft color), shop name, location, price-lg "$18.62" + "each", clock icon + "Ready in 12 days", "Best pick" badge (accent pill, top right) on the best value. "Choose" button. The chosen card gets a 2px green ring and "Chosen" pill. The pipeline appears as a small horizontal stepper on the chosen card.
- **Launch (plan):** a vertical timeline. Left: date in mono. Middle: dot on a line. Right: milestone name + cost. A "Today" marker line in accent. Launch date at the bottom as a highlighted card.
- **Sell:** a preview that looks like a real Etsy listing: image carousel (renders), title, price, shop name, tags as chips. Each field has a copy icon on hover. "Copy whole listing" as the primary button.

### Ask Moko panel
- Header: 28px accent circle with a white sparkle icon, "Ask Moko", "Knows about GateTek" (small muted), collapse icon.
- Empty state: "Hi! Ask me anything about GateTek." + 3 suggestion chips (pill, 1px border, 14px, hover accent-soft).
- User messages: right-aligned bubble, ink bg, white text, radius 16 with a 4px bottom-right corner, max-width 85%.
- Moko messages: left, no bubble, 24px avatar, body text, **bold key numbers**. Action buttons inline under the answer ("Apply this tweak", "Open quotes").
- Typing: three dots bouncing.
- Input: surface, radius 14, 1px border, auto-grow up to 5 lines, 36px circular accent send button with an arrow-up icon. "Enter to send" hint.
- Footer (small muted): "Uses your demo budget · Add your key".

### Landing page
- Keep one big moment: display headline "Turn your idea into a product you can sell." with the 3D model turning beside it on a soft `#F3F1EC` circle.
- "How it works": 3 steps (Describe it → See how to make it → Start selling), each with a real app screenshot in a rounded 16 frame with shadow.
- The 6 stages as a friendly row of icon cards.
- FAQ as accordions. Final call to action on an accent-soft band.
- Header: light, logo left, "My products", "Manufacturers", and a primary "Start your product" button.

---

## 5. Copy rules

- Second person, encouraging, plain words. "You'd make about $6 per sale" not "Margin 18%".
- Max two lines per explanation. Everything else goes behind "See the details".
- Replace jargon: tooling → "one-time setup cost", lead time → "ready in", fit score → "how well it fits", MOQ → "smallest order".
- Every screen answers: where am I, what does this mean, what do I do next.
