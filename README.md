# ⛳ Birdie POS — Design System (tf-birdie-ds-v2)

A **React 19 + MUI v9 + Emotion** design system for the TenFore golf-course point of sale, and
the working prototype built from it — a register, a tee sheet, check-in, and payments.

## 🔗 Live links

### ⛳ [Open the Prototype →](https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype/)

The POS as a running React app. Ring up a walk-in, work the tee sheet, take a payment.

### 📚 [Open the Design System →](https://jg-tenfore.github.io/tf-birdie-ds-v2/)

Storybook: foundations, the component library, and all 65 POS screens as stories.

### 📄 [Open the Original →](https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/)

The single-file HTML prototype this port came from. Read-only, kept for comparison.

<details>
<summary>All URLs</summary>

| Surface | URL |
|---|---|
| Prototype | https://jg-tenfore.github.io/tf-birdie-ds-v2/prototype/ |
| Storybook | https://jg-tenfore.github.io/tf-birdie-ds-v2/ |
| Original HTML | https://jg-tenfore.github.io/tf-birdie-ds-v2/reference/ |

GitHub Pages serves one site per repository, so all three share one tree — Storybook at the
root, the other two in subdirectories. See [`scripts/build-site.mjs`](scripts/build-site.mjs).

</details>

## Why three surfaces

The prototype and Storybook import the *same* components from `src/pos`. That's the point:
refining a component changes both, so the design system and the thing it describes can't drift.
The original HTML prototype is published alongside them so any difference from the source design
is visible rather than assumed.

## Getting started

```bash
npm install
npm run storybook   # design system  → http://localhost:6006
npm run dev         # prototype      → http://localhost:5173
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

`npm run test` is the useful guard here: 254 tests across two projects — the story suite mounts
all 280 stories in a real browser and fails on any runtime error, and the unit suite covers the
pure logic.

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

Item tiles carry product photography — 71 images covering every sellable good across Rentals,
Golf Balls, Apparel, Accessories, Snacks, Drinks and Alcohol. Categories that sell a *rate*
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

`npm run test:unit` fails if a file doesn't match a real catalog item, and lists any sellable
good that has no photo.

The ~130MB of source screenshots lives in `pos-item-imagery/` and is **not committed** —
only the downscaled 240px versions are (3.5MB).

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
│   └── theme.ts           how those tokens map onto MUI
├── pos/
│   ├── types.ts           domain types (Booking, CartItem, Course, …)
│   ├── icons.ts           Material Symbols name → MUI icon component
│   ├── data/              catalog, golfers, courses, bookings, config — ported verbatim
│   ├── logic/             cart pricing, booking filters, league/block/move planning
│   ├── state/             one reducer + provider; the whole app is a function of it
│   ├── components/        the shell, order panel, register, tee sheet
│   ├── modals/            22 dialogs and the host that switches between them
│   └── PosApp.tsx         the assembled app
├── showcase/              Storybook stories
│   ├── foundations/       colors, type, spacing, radius, icons, logos
│   ├── base/  application/  auth/     the generic MUI component library
│   └── pos/               POS screens, in seven numbered sections
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

## Stack

React 19 · MUI v9 (+ MUI X Data Grid, Date Pickers) · Emotion · Vite 8 · Storybook 10 ·
TypeScript 6 · oxlint · Vitest (browser mode, Playwright)
