# Birdie POS — working notes

A **React 19 + MUI v9 + Emotion** design system for the TenFore golf-course point of sale,
plus the prototype built from it. Scaffolded from `jg-tenfore/goose-kds`.

Published at https://jg-tenfore.github.io/tf-birdie-ds-v2/ — Storybook at the root, the
prototype at `/prototype/`, the original HTML prototype at `/reference/`.

## The rule that matters

**The prototypes and Storybook import the same components from `src/pos`.** There is no
second copy of anything. If you find yourself writing a component for one and not the other,
stop — that's the drift this repo exists to prevent.

That includes the **three prototypes**. They are not forks: a club is a course layout
(`src/pos/data/venues.ts`), the tee sheet renders one column group per course, and each
deployment is the same build with a different `VITE_VENUE`. Adding a fourth club is adding an
entry to `VENUES` and a line to `PROTOTYPES` in `scripts/build-site.mjs` — never a copy of the
app.

`/reference/` is the original single-file HTML prototype, unmodified. It is the answer to
"is this what the original did", and it is never edited.

## Where things live

```
src/theme/tokens.ts      MD3 tokens, ported 1:1 from the prototype's :root block.
                         Imports nothing from MUI — stories and CSS read the same values.
src/theme/theme.ts       Those tokens mapped onto MUI's palette / typography / components.

src/pos/types.ts         Domain types. Field names are the prototype's verbatim
                         (`n`/`p` on catalog items, `pay`, `timeMin`) so ported data
                         stays diffable against the source.
src/pos/icons.ts         Material Symbols ligature name → MUI icon component.
src/pos/data/            Catalog, golfers, courses, bookings, config — extracted from the
                         prototype programmatically, then typed. Do not retype by hand.
src/pos/data/venues.ts   The three clubs. Each names its courses and how the shared booking
                         fixtures are re-homed onto them, so one fixture set serves all three.
src/pos/logic/           Pure functions: cart pricing, booking filters, league/block/move
                         planning. Reason about rules here, without rendering.
src/pos/state/           One reducer + provider. The whole app is a function of it.
src/pos/components/      Shell, order panel, register, tee sheet.
src/pos/modals/          22 dialogs + the host that switches on the modal union.

src/showcase/pos/        POS screen stories, seven numbered sections.
src/showcase/{foundations,base,application,auth}/   generic component library.
```

## Conventions

- **Files are kebab-case for modules, PascalCase for components.** `pos-store.ts`,
  `LeftPanel.tsx` — matching what goose-kds does.
- **Use the token layer, never colour literals.** `md3.primary`, `payBadges.paid.bg`,
  `playerAccents[i]`. If a value isn't in `tokens.ts` and recurs, add it there.
- **`Stack` comes from `src/pos/components/Stack.tsx`, not `@mui/material`.** MUI v7+ removed
  system props, so v9's `Stack` rejects `alignItems` / `gap` / `justifyContent` / `flexWrap`.
  The wrapper accepts them and forwards into `sx`. Importing MUI's `Stack` directly will fail
  to typecheck the moment you align anything.
- **Icons by ligature name**: `<Icon name="how_to_reg" />`. The name is the shared vocabulary
  across the ported data files; `iconFor()` resolves it.

## State and stories

Everything derived is computed at render — no cached totals, no cached filters. That's what
makes a screen reproducible from a plain object, which is what the screen stories rely on:

```tsx
<Screen initialState={withLoadedBooking(paidFoursome(), {
  modal: { kind: 'checkout' },
})} />
```

Helpers are in `src/showcase/pos/screen-helpers.tsx`. When you add a dialog:

1. Add its variant to the `Modal` union in `pos-store.ts`.
2. Add a case to `ModalHost`.
3. Add a story that opens it via `initialState`.

Step 3 is not optional — a dialog with no story is a dialog nobody reviews.

## Product imagery

Matched to catalog items **by filename**: the slugified item name, so `Titleist Pro V1 Box` →
`src/assets/items/titleist-pro-v1-box.png`. `item-images.ts` globs the folder; there is no
registry to update. A mis-slugged file fails silently into a text tile, which is why
`item-images.test.ts` asserts every file maps to a real item and lists uncovered goods.

Two tile shapes, and which one you get is decided by whether the item has a photo — image
tiles are ~210px tall, text tiles ~64px. Don't add a blank image panel to make them uniform;
rates and modifiers have nothing to photograph and a blank panel reads as missing content.

Source screenshots (`pos-item-imagery/`, ~130MB) are gitignored. `scripts/import-item-images.mjs`
downscales them to 240px into `src/assets/items/`, and *those* are committed. Never commit the
source folder.

## Deep links

The prototype mirrors state into the address bar (`src/pos/state/url-state.ts`,
`useUrlSync.ts`). Storybook does **not** — it owns its own URL, so `PosApp` takes `syncUrl` and
only `App.tsx` passes it.

Two rules when you touch the `Modal` union:

1. Add a slug to `MODAL_SLUGS` and encode/decode its arguments, or the dialog silently stops
   being linkable.
2. Add it to the round-trip table in `url-state.test.ts`. That test asserts encode→decode→encode
   is stable, which is the only property that makes a shared link trustworthy.

Carts are never serialized into a URL — `?order=` names a scenario from `scenarios.ts`. If a
particular order needs to be linkable, add it there and both the prototype and the stories get it.

## Venues

Three published prototypes, one app. `venueId` seeds `courses` and `bookings`; nothing else
reads it except the register's top bar.

- Bookings are authored once against the three-nines club and **re-homed** per venue via
  `courseMap`. Mapping is 1:1 per source course — two sources must never collapse onto one
  target, or two bookings land in the same cell. `venues.test.ts` asserts this.
- A booking pointing at a course the venue doesn't have renders **nowhere** rather than
  erroring, which is why the test checks for orphans explicitly.
- `Course.holeCount` is the round length; `Course.holes` is only a label. The 18-hole club's
  front nine displays "FRONT 9" but counts 18. Never parse the label — the original did, and
  it breaks the moment a course isn't named "N HOLES".
- Mixed 9H/18H bookings on the 18-hole club are correct, not a bug: an 18-hole course sells
  nine-hole rounds too.

## Demo data is deterministic

`DEMO_TODAY()` is pinned to **Thursday, May 21, 2026**. The 11-day booking window is generated
by hashing booking ids (FNV-1a), not `Math.random()`, so the tee sheet is byte-identical on
every load and in every screenshot. Don't introduce `Date.now()` or `Math.random()` into data
generation — it breaks visual review.

## Commands

```bash
npm run storybook    # → :6006 (the design system)
npm run dev          # → :5173 (the prototype)
npm run typecheck    # tsc --noEmit; keep this green
npm run lint         # oxlint
npm run test         # both projects: unit (node) + storybook (chromium)
npm run test:unit    # fast — pure logic and the URL codec
npm run test:stories # slow — mounts all 280 stories
npm run build:site   # the full Pages tree → site/
```

`npm run build:site` is what CI runs. If it passes locally, the deploy will too.

Two deploy targets, and they need **different builds**: Pages serves from
`/tf-birdie-ds-v2/`, Netlify from `/`. Asset URLs — images included — have the base baked in
at build time, so the wrong one 404s everything. `BASE_PATH` is set per target
(`deploy-pages.yml` and `netlify.toml`); don't hard-code a base anywhere else.

Pages has no per-PR preview (one site per repo, deploys from `main` only). Netlify Deploy
Previews are the way to look at a branch.

`vite.config.ts` pre-bundles a handful of CJS-only test deps (`aria-query`, `lz-string`,
`dom-accessibility-api`, …) via `optimizeDeps.include`. Without it the whole story suite dies
on import before a single story renders — which is the state goose-kds is still in. Don't
remove those entries when tidying.

## Known divergences from the original

Three, all deliberate:

1. **Walk-in cart fee at checkout.** The original's `computeCartTotal` hard-coded transport at
   $20 riding / $5 push by modifier *name*, while the displayed subtotal read the actual fee —
   $18 for a walk-in. They disagreed. `payableTotal` reads the fee, so the charge matches the
   panel.
2. **Grid interval and hours are global**, not per-course. The original's Time Settings dialog
   edits `course.tracks[0]`, but `COURSES` never defines `tracks`, so it was global in practice.
   Preserved, and the dialog says so.
3. **Independent per-column scrolling is not ported.** The original carries a second full grid
   renderer for it; Focus This Course covers the same need.

Anything else that differs from `/reference/` is a bug, not a decision.
