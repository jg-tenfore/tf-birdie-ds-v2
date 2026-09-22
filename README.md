# ⛳ Birdie POS — Design System (tf-birdie-ds-v2)

A **React 19 + MUI v9 + Emotion** design system for the TenFore golf-course point of sale, and
the working prototypes built from it: a register, a tee sheet, check-in and payments, on a
counter terminal and on a phone.

## 🔗 Live links

Everything is published to GitHub Pages from `main`, as one site:

| | Link | What it is |
|---|---|---|
| 📚 | [**Design system (Storybook)**](https://jg-tenfore.github.io/tf-birdie-ds-v2/) | Foundations, components, and every terminal and mobile screen as a story |
| 🖥️ | [**Tablet · Three nines**](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype/) | Counter-terminal POS, the original club |
| 🖥️ | [**Tablet · 18-hole course**](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype-18/) | Counter-terminal POS, a championship course |
| 🖥️ | [**Tablet · Single nine**](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype-9/) | Counter-terminal POS, one nine-hole course |
| 📱 | [**Mobile · Three nines**](https://jg-tenfore.github.io/tf-birdie-ds-v2/mobile/) | Phone POS, the original club |
| 📱 | [**Mobile · 18-hole course**](https://jg-tenfore.github.io/tf-birdie-ds-v2/mobile-18/) | Phone POS, a championship course |
| 📱 | [**Mobile · Single nine**](https://jg-tenfore.github.io/tf-birdie-ds-v2/mobile-9/) | Phone POS, one nine-hole course |
| ✏️ | [**Weston Edits · Tablet**](https://jg-tenfore.github.io/tf-birdie-ds-v2/weston-edits/) | The 18-hole terminal with Weston's golf-first reservation edits |
| ✏️ | [**Weston Edits · Mobile**](https://jg-tenfore.github.io/tf-birdie-ds-v2/weston-edits-mobile/) | The same edits on the phone |
| 📄 | [**The original**](https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/) | The single-file HTML prototype this was ported from, read-only |

### 📚 Design system: Storybook

[jg-tenfore.github.io/tf-birdie-ds-v2](https://jg-tenfore.github.io/tf-birdie-ds-v2/)

The front door, and the place to review anything in isolation. It holds:

- **Foundations**: MD3 colour roles, type, spacing, radius and elevation.
- **Components**: the MUI component library, grouped by purpose.
- **POS Screens** (69 stories, sections 1–7): the counter terminal, one story per state
  worth reviewing: register, tee sheet, booking and check-in, tee-time selection, payment,
  operations and people.
- **Mobile Screens** (84 stories, sections 0–7, numbered to match): the phone version.
  **0 · Navigation** has a click-through app and a **Navigation Map**, which lists every
  screen, how you reach it and how you get out.
- **Tee Sheet Actions** (35 stories): every action that writes to the tee sheet, before and
  after.
- **Weston Edits** (sections 1–18): an overview of Weston's three rounds of feedback and the
  decisions behind each one, then each changed component with a **Tablet** story and a
  **Mobile** one wherever the phone does it differently. **18 · Rate Catalog** is a doc page
  rather than a screen — the eligibility model the rate tiles are built on.

Every story is built from plain state, so the screen you review is exactly the one the
prototypes render.

Four questions Weston asked to *see* rather than decide from a description are on the
Storybook **toolbar** — panel width, row density, transport style and rate catalog. They feed
every story in the library, so you can flip one while looking at any screen; a story that pins
a switch itself keeps it.

### 🖥️ Tablet prototypes: the counter terminal

[Three nines](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype/) ·
[18-hole course](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype-18/) ·
[Single nine](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype-9/)

The full pro-shop POS as a running app on a fixed **1366×840** landscape terminal, built for a
mouse, with dense 12–14px controls. A persistent order panel sits on the left, with the
register catalog or the tee sheet beside it. You can ring up a walk-in, load a booking from the
sheet, check players in, block times, run a league and take a payment.

The three are the same app with a different course layout:

- **Three nines**: Ponds, Front Valley and Rolling as independent nine-hole tracks, twelve
  cells a row. The original club.
- **18-hole course**: one championship course split into its front and back nines, eight
  cells a row. An 18-hole booking crosses over at the turn.
- **Single nine**: one nine-hole course, four cells a row. The sparsest sheet.

Every screen and dialog has its own URL (see [Deep links](#deep-links)), so you can send someone
the exact state you want reviewed.

### 📱 Mobile prototypes: the phone

[Three nines](https://jg-tenfore.github.io/tf-birdie-ds-v2/mobile/) ·
[18-hole course](https://jg-tenfore.github.io/tf-birdie-ds-v2/mobile-18/) ·
[Single nine](https://jg-tenfore.github.io/tf-birdie-ds-v2/mobile-9/)

The same POS on a **402×797** phone, designed as a native Material Design 3 Android app with
touch sizing: 16px text and 48px tap targets.

- **Four destinations** on a bottom navigation bar: **Tee Sheet** (home), **Register**,
  **People** and **More**.
- **One level down** for everything else:
  - Drill-down pages slide in with a back arrow.
  - Create and edit forms open as full-screen dialogs with ✕ and Save.
  - The card reader and receipt are no-exit takeovers, so a stray swipe can't abandon a
    payment.
- **Its own back history per tab**, so a half-built order survives a trip to the tee sheet. The
  Register tab badge shows how many lines are on it.

Each prototype has an index of every Mobile Screens story (84 screens), each with its own link
and the story's description. Every screen stays fully clickable, and prev/next steps through
them in Storybook's order. A sidebar switcher moves between the three clubs and keeps you on
the same screen. The home link (`#/`) is the free-running app. The clubs differ the same way as
the tablet ones.

The phone uses the same state, data and pricing as the terminal. An order totals the same on
both, and a customer added on one exists on the other.

### ✏️ Weston Edits: golf first, order second

[Tablet](https://jg-tenfore.github.io/tf-birdie-ds-v2/weston-edits/) ·
[Mobile](https://jg-tenfore.github.io/tf-birdie-ds-v2/weston-edits-mobile/) ·
[What changed (Storybook)](https://jg-tenfore.github.io/tf-birdie-ds-v2/?path=/docs/weston-edits-overview--overview)

Weston's feedback on the tablet prototype
([Loom](https://www.loom.com/share/a54102c76bcf4bf3be4a1a3ae878501b)): clicking a tee time
shouldn't turn it straight into an order. These are the **18-hole** prototypes with his edits
switched on, across three rounds of review.

**Round 1 — golf first, order second:**

- **Clicking a tee time opens the reservation**, in a slide-over panel on the tablet so you keep
  your place on the tee sheet. On the phone it's the reservation screen.
- **You work the golf there first:** players and player count, 9 or 18 holes per player, tee
  fees, riding or walking, check-in status and an ID.me badge.
- **Only Check in & pay sends it to the register.** In the order, golf lines are a read-only
  summary with **Edit reservation**. Modifiers stay for food and beverage.

**Round 2 — date navigation** ([Loom](https://www.loom.com/share/a0d4ed98b7344746b5a4bf8a9d7ee4fb)):
a swipeable week strip and a real calendar sheet on the phone, and a deterministic demo tee
sheet on any date within a year of today.

**Round 3 — the reservation decides the money** (a call on 22 September 2026):

- **A player's fee is a rate, not a number.** Tapping the fee opens a grid of every rate *this
  tee time on this date* sells, narrowed by band, day and hole count. The system pre-picks what
  the player is owed from their own record; every other tile is dimmed but still one tap away,
  because the counter's job includes overriding it. The editor expands **in place on the row**
  on the tablet, and is a full-screen dialog on the phone.
- **Transport is a priced catalog**, including a trail fee for walking — the case a walk/ride
  toggle can't express. **Punch cards** pay for rounds, not rides: applying one settles the
  green fee and the cart is still billed. **Discounts** (comp, 50%, 25%, employee, typed) each
  carry a reason onto the row and the register line.
- **Tapping a player's name opens their customer record** over everything — the Customer *tab*
  is gone, because a customer isn't a property of a tee time. Contact details edit in place;
  memberships, punch cards, rain checks and gift cards are read-only, since taking money stays
  the register's job. An empty seat opens the same surface in assign mode.
- **A customer database behind it:** 340 records, so every name that can appear on a tee sheet
  resolves to somebody with memberships, cards, credits and history. A seat is matched by a
  linked record or the booker's phone — never by name.
- **Cart signout** over a 35-cart fleet, with availability derived from the day's bookings;
  **per-seat Add to cart** for a group splitting the bill, with Check in & pay topping the order
  up rather than rebuilding it; and **‹ n of m ›** in the panel header to step through the day's
  reservations without closing it.
- **More room to work:** the panel ships at 640 with 820 and full-cover to compare, and the
  order rail's one button clears the order (behind a confirm) and then collapses the rail to a
  56px strip once there's nothing left to clear.

Storybook's **Weston Edits** category documents each change component by component, with the
decisions and Weston's own words behind them. The bugs the first recording turned up (a reserved
tee time labelled "Walk-in", mismatched rates, a paid booking asking to be paid, tax on $0) are
fixed in every prototype, not just this one — as are round 3's confirm-before-clear and the
three icon names that were rendering as dots.

It's an *edition* of the same app, not a copy: components branch on `useEdition()`
([`src/pos/edition.tsx`](src/pos/edition.tsx)), and a build picks one with `VITE_EDITION=weston`.
When the edits are approved, making them the default is a one-line change.

### 📄 The original

[jg-tenfore.github.io/tf-birdie-ds-v2/reference](https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/)

The single-file HTML prototype this port came from, published unmodified. It's the answer to
"is this what the original did". Deliberate differences are listed under
[Known divergences](#known-divergences-from-the-original).

<details>
<summary>All URLs</summary>

| Directory | Surface |
|---|---|
| `/` | Storybook: the design system |
| `/prototype/` | Tablet: three nines (the original club) |
| `/prototype-18/` | Tablet: one 18-hole course, front and back nines |
| `/prototype-9/` | Tablet: a single nine-hole course |
| `/mobile/` | Mobile: three nines |
| `/mobile-18/` | Mobile: the 18-hole course |
| `/mobile-9/` | Mobile: a single nine |
| `/weston-edits/` | Weston Edits: tablet, 18 holes |
| `/weston-edits-mobile/` | Weston Edits: mobile, 18 holes |
| `/reference/` | The original single-file HTML prototype |

GitHub Pages serves one site per repository, so they share one tree, with Storybook at the root
and the rest in subdirectories. See [`scripts/build-site.mjs`](scripts/build-site.mjs).

</details>

## Why eight prototypes, and why they're one codebase

The tablet prototypes and Storybook import the *same* components from `src/pos`. Refining a
component changes all of them, so the design system and the things it describes can't drift.
The mobile prototypes go one step further: their screen list *is* the Mobile Screens story
files, so a new story appears in them automatically.

The three clubs differ only in **course layout**. The tee sheet renders one column group per
course, so a club's shape *is* its `courses` array — see
[`src/pos/data/venues.ts`](src/pos/data/venues.ts). Each prototype is the same build run with a
different `VITE_VENUE` (and the mobile ones with `VITE_APP=mobile` too); nothing is forked.

Any prototype can show another club without a rebuild: append `?venue=eighteen`, `?venue=nine`
or `?venue=three-nines` to a deep link. That's how you compare them side by side, and how the
Storybook stories render all three.

The original HTML prototype is published alongside them so any difference from the source
design is visible rather than assumed.

## Getting started

```bash
npm install
npm run storybook   # design system  → http://localhost:6006
npm run dev         # prototype      → http://localhost:5173
                    # mobile         → http://localhost:5173/mobile/  (?venue=eighteen / nine)
                    # Weston Edits   → add ?edition=weston, e.g.
                    #   http://localhost:5173/?edition=weston#/tee-sheet?venue=eighteen
                    #   http://localhost:5173/mobile/?edition=weston&venue=eighteen
```

Other scripts:

```bash
npm run typecheck    # tsc, no emit
npm run lint         # oxlint
npm run test         # everything below
npm run test:unit    # pure modules (pricing, scheduling, the URL codec) in node
npm run test:stories # every story mounted in Chromium; fails on any runtime error
npm run build        # prototype → dist/
npm run build:site   # the full Pages tree → site/
```

`npm run test` is the useful guard here: 911 tests across two projects — the story suite mounts
all 539 stories in a real browser and fails on any runtime error, and the unit suite covers the
pure logic (372 tests: pricing, seat rates, eligibility, scheduling, the URL codec, and a scan
of every icon name in `src` against the registry).

## Deep links

Every screen and dialog in the prototype has its own URL, so you can share the exact thing you
want reviewed:

```
#/tee-sheet?date=2026-05-23&shift=peak       a specific day and time band
#/tee-sheet/list?status=open&sort=status     the unpaid worklist
#/register?order=walkin&modal=checkout       an order mid-payment
#/tee-sheet?modal=block&t=0912               blocking the 9:12 row
```

Back and Forward step through screens and dialogs, not through every keystroke typed into a
filter. Full scheme: **Getting Started → Deep Links** in Storybook, or
[`src/pos/state/url-state.ts`](src/pos/state/url-state.ts).

Links use a hash because Pages has no SPA fallback — a real path would 404. Carts aren't
serialized; `?order=` names a scenario from
[`src/pos/state/scenarios.ts`](src/pos/state/scenarios.ts), which is the same vocabulary the
screen stories use.

## Product imagery

Item tiles carry product photography — 74 images covering **every** sellable good across
Rentals, Golf Balls, Apparel, Accessories, Snacks, Drinks and Alcohol. Categories that sell a *rate*
rather than an object (Check In, Modifiers, Packages, Membership, Services, Promotions, High
Speed) keep the compact text tile, because there is nothing to photograph.

**Nothing is externally hosted.** Images are imported from `src/assets/items/` through Vite, so
they're content-hashed, emitted alongside the bundle, and rewritten with whatever base path the
build was given — the same link works on `localhost:5173` and under
`…github.io/tf-birdie-ds-v2/prototype/`. Tiles are plain `<img loading="lazy">`, so a browser
only downloads the category on screen (~20 images, not all 71).

### Adding or replacing a photo

Images are matched to items **by filename** — the slugified catalog item name, so
`Titleist Pro V1 Box` → `titleist-pro-v1-box.png`. Either:

- drop a correctly-named PNG into `src/assets/items/`, or
- add a line to `MAP` in [`scripts/import-item-images.mjs`](scripts/import-item-images.mjs) and
  re-run `node scripts/import-item-images.mjs`, which downscales from the source folder.

`npm run test:unit` fails if a file doesn't match a real catalog item, and fails if any
sellable good has no photo — coverage is currently complete, and the test is what keeps it
that way.

The ~130MB of source screenshots lives in `pos-item-imagery/` and is **not committed** —
only the downscaled 240px versions are (3.7MB).

## Deploying, and previewing a PR

The three surfaces are built by [`scripts/build-site.mjs`](scripts/build-site.mjs) into
`site/`. Two hosts, two different builds — not one artifact deployed twice:

| Host | Serves from | Build | When |
|---|---|---|---|
| GitHub Pages | `/tf-birdie-ds-v2/` | `BASE_PATH=/tf-birdie-ds-v2/` | push to `main` |
| Netlify | `/` | `BASE_PATH=/` (see `netlify.toml`) | every PR, as a Deploy Preview |

**Asset URLs are written at build time with the base path baked in**, product photography
included. A Pages build uploaded to Netlify would 404 on every image, script and stylesheet,
which is what `BASE_PATH` exists to prevent. Both configurations are verified.

**Pages cannot preview a pull request** — it serves one site per repository and only deploys
from `main`. That's what Netlify Deploy Previews are for: every PR gets its own URL with the
imagery rendering. CI additionally builds the full site on each PR, so a build break surfaces
before merge rather than after.

No redirect rules are needed on either host. The prototype uses hash routing, so every URL
resolves to a real file and the hash never reaches the server.

### Connecting Netlify (one time)

`netlify.toml` is committed, so Netlify needs no manual build settings — link the repo in the
Netlify UI (**Add new site → Import an existing project → GitHub → tf-birdie-ds-v2**) and it
picks up the command, publish directory, and `BASE_PATH`. Deploy Previews are on by default.

## Design language

Ported from a prototype that follows **Material Design 3** role naming, so the token set is
MD3 (`primary` / `primary-container` / `on-surface` / `outline-variant` / `surface-container`)
and maps onto MUI's palette rather than living beside it.

Two decisions shape everything:

- **Light mode only.** The POS runs on a lit pro-shop counter terminal, and the source
  prototype has no dark tone set. The tokens are semantic, so adding a dark scheme later
  means adding tones, not touching components.
- **Dense, not touch-first.** Controls sit at 12–14px with 1.5px outlines and ~32–38px hit
  targets, for a mouse across a fixed **1366×840** frame. (The opposite of the Goose KDS
  system this repo was scaffolded from, where gloved kitchen use forced everything large.)

## Layout

```
src/
├── theme/
│   ├── tokens.ts          MD3 tokens, ported 1:1 from the prototype's :root block
│   ├── theme.ts           how those tokens map onto MUI
│   └── mobile-theme.ts    the same tokens at MD3 touch density, for the phone only
├── pos/
│   ├── types.ts           domain types (Booking, CartItem, Course, …)
│   ├── icons.ts           Material Symbols name → MUI icon component
│   ├── data/              catalog, golfers, courses, bookings, config — ported verbatim;
│   │                      plus the customer database (customers, roster), the rate and
│   │                      transport catalog, the cart fleet and the rain-check ledger
│   ├── logic/             cart pricing, seat pricing, booking filters, league/block/move planning
│   ├── state/             one reducer + provider; the whole app is a function of it
│   ├── components/        the shell, order panel, register, tee sheet, and the Weston
│   │                      surfaces: ReservationPanel, PlayerRows, RateExpand,
│   │                      CustomerModal, CartSignout
│   ├── modals/            22 dialogs and the host that switches between them
│   ├── mobile/            the phone app: navigation map, MD3 chrome, screens per destination
│   └── PosApp.tsx         the assembled app
├── showcase/              Storybook stories
│   ├── foundations/       colors, type, spacing, radius, icons, logos
│   ├── base/  application/  auth/     the generic MUI component library
│   ├── pos/               POS screens, in seven numbered sections
│   ├── pos-mobile/        Mobile Screens, numbered to match, plus 0 · Navigation
│   └── weston-edits/      Weston's three rounds: the overview, sections 1–17 and the
│                          Rate Catalog doc page
├── mobile-prototype/      the hosted mobile prototype — its screen list is read from pos-mobile
└── App.tsx                the hosted prototype entry
```

### State

The app is driven by a single reducer (`src/pos/state/pos-store.ts`). Everything derived —
totals, filtered bookings, player counts — is computed at render time, so there's no cache
to invalidate.

That's what makes the screen stories work. A screen is reproducible from a plain object:

```tsx
<Screen initialState={withLoadedBooking(paidFoursome(), {
  modal: { kind: 'checkout' },
})} />
```

So there are stories for states that would otherwise take a dozen interactions to reach.

### Demo data

Deterministic. `DEMO_TODAY()` is pinned to **Thursday, May 21, 2026**, and the 11-day booking
window is generated by hashing booking ids rather than calling `Math.random()` — the sheet
looks identical on every load and in every screenshot.

The customer side is the same discipline. A hundred records are **committed** to
`src/pos/data/customers.json` — households sharing a phone, three Brennevins, names long enough
to truncate — and the roster rounds that out to **340** by synthesising a record per tee-sheet
name from the name itself, so the same golfer reads the same way on every run. Only 93 of the
18-hole club's 853 demo bookings have a booker who resolves to a record: a name on a sheet is a
string until somebody links it, and the pricing is deliberately built to say so rather than
guess.

## Refining components and prototype together

1. Change a component in `src/pos/components` or `src/pos/modals`.
2. Both dev servers hot-reload — check it in Storybook (isolated) and in the prototype (in context).
3. If the change is behavioural, add or update a screen story so the state is captured.
4. Compare against `/reference/` when the question is "is this what the original did".

Pricing and scheduling rules live in `src/pos/logic/` as pure functions, so they can be
reasoned about without rendering anything.

## Known divergences from the original

Deliberate, and worth knowing:

- **Cart fee at checkout.** The original's `computeCartTotal` hard-coded transport at $20
  riding / $5 push by modifier *name*, while the displayed subtotal read the actual fee. For a
  walk-in that fee is $18, so the two disagreed. This port reads the fee, so the charge matches
  the panel. See `payableTotal` in `src/pos/logic/cart.ts`.
- **Interval and grid hours are shared across courses.** The original's Time Settings dialog
  edits `course.tracks[0]`, but `COURSES` never defines `tracks` — so the setting was global in
  practice. That's preserved, and the dialog says so.
- **Independent per-column scrolling** is not ported. The original has a second full grid
  renderer for it; the value it adds over Focus This Course didn't justify a parallel layout.
- **Round-status labels on Booking Detail.** A player's `step` is -1 not arrived, 0 checked in,
  1 teed off, 2 at the turn, 3 finished (6 on past days) — the encoding the original's own
  booking menu (All Checked In = 0 … All Finished = 3), its demo data and every "checked in"
  count use. Its Booking Detail rail alone labelled index 0 "Pending", so every player read one
  step behind (teed off showed "Checked In", a finished round "At Turn"). The rail now reads
  Not Arrived → Checked In → Teed Off → At Turn → Finished, from `ROUND_STEPS` in
  `src/pos/data/config.ts`, which the phone shares. Mark finished writes 3 (not 4), and Mark
  teed off / Mark finished leave no-show seats alone, as the original's menu did.

## Stack

React 19 · MUI v9 (+ MUI X Data Grid, Date Pickers) · Emotion · Vite 8 · Storybook 10 ·
TypeScript 6 · oxlint · Vitest (browser mode, Playwright)
