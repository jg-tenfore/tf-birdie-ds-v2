import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * Weston Edits / 9 · Date Navigation / Tablet
 *
 * Round 2 was a 46-second Loom about the **phone**: *"If I'm on the tee sheet and I want to go
 * to, let's say, June — there's no way to select the month, so I just have to click."* The
 * tablet already had a month calendar, so its controls stay exactly as they are — ‹ ›, the
 * date's calendar popover, **Today** and **Weekend**. What changes here is what is *behind*
 * them: the tablet could always reach June, there was just nothing to see when it got there.
 *
 * Any date within twelve months of today now has a tee sheet — the same generated day the
 * phone shows — and the calendar dots those days and greys out the dates beyond the year.
 *
 * ## The component
 *
 * Three pieces, two of them shared with the phone:
 *
 * | File | What it does |
 * |---|---|
 * | `src/pos/components/DatePickerPopover.tsx` | The hand-built month grid (MUI X can't dot a day, which is the whole point of it). In the Weston edition it also dots **unvisited** generated days, greys dates outside the range, and disables ‹ › at the range's edge |
 * | `src/pos/state/use-demo-day-fill.ts` | `useDemoDayFill(enabled)` — one implementation for both devices. `PosApp` calls it with `useWestonEdits()` |
 * | `src/pos/state/demo-days.ts` | `missingDemoDay` (what a date still needs), `unfilledDemoDay` (what the generator *would* give, for dots), `clampToDemoRange` |
 *
 * | State | Where | Default | What it does |
 * |---|---|---|---|
 * | `state.currentDate` | `pos-store.ts` | `DEMO_TODAY()` | The day on screen; `setDate` / `shiftDate` move it |
 * | `state.generatedDates` | `pos-store.ts` | `[]` | Dates already filled. `fillDemoDay` records one, and a repeat is a no-op |
 * | `state.bookings` | `pos-store.ts` | the authored 11 days | Where generated bookings land — after the fill they are ordinary bookings |
 *
 * The fill runs as a **layout effect**, so generated bookings land before the frame paints:
 * navigating to June never flashes an empty sheet. It depends only on the date string and the
 * venue, because only those can make a day missing.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Demo today | **Thursday, May 21 2026** (`DEMO_TODAY()`), clock fixed at **12:00 PM** (`demoNow()`) |
 * | Authored window | 11 days, offsets −6…+4 — **May 15 to May 25 2026** |
 * | Generated range | `DEMO_RANGE_MONTHS` = **12** either side → May 21 2025 … May 21 2027 (`demoRange()`) |
 * | Determinism | Thinning is an FNV-1a hash of the booking id and the date, never `Math.random()`; results memoized per date. Ids are `<template id>_p<offset>` / `_m<offset>` |
 * | Density | `generatedKeepFraction`: **0.88** weekend / **0.58** weekday, times `1 − 0.45 × min(1, days-from-today ÷ 365)` — so a weekday a year out keeps about a third of the template |
 * | Placement | Generated days are seated on real grid rows with no overlaps (`placeOnRows`), so everything the day's totals count can be opened and deleted |
 * | Calendar dots | `state.bookings` for filled days, `unfilledDemoDay` for the rest — a cleared day has no dot |
 * | Out of range | Days, months **and** years outside `demoRange()` are disabled; ‹ › stop at the range's first and last month |
 * | Frame | 1366 × 840 (`shell` in `src/theme/tokens.ts`) |
 *
 * ## Scope
 *
 * **Weston edition only**, on both devices. The base tee sheet still has just its eleven
 * authored days and an unchanged calendar — **BeforeWestonEdits** is that, side by side. The
 * generated-day machinery is shared, so the phone and the tablet see the same June 12.
 *
 * ## The stories
 *
 * | Story | Starts on | What it is for |
 * |---|---|---|
 * | **GeneratedDay** | Fri, Jun 12 2026 | A date outside the authored eleven, generated on first view. The test waits for the toolbar's golfer count to go above zero — grid, list and day summary all read the same bookings |
 * | **CalendarRange** | Tue, May 18 2027 | The far edge: the test opens the calendar and asserts May 22 2027 is **disabled**, **Next month** is disabled, and May 20 2027 is enabled and dotted |
 * | **PickJuneFromCalendar** | Thu, May 21 2026 | Weston's actual journey on the tablet: open the calendar, page to June, tap the 12th, land on a populated sheet |
 * | **BeforeWestonEdits** | Fri, Jun 12 2026, base edition | The same date with nothing on it — the comparison that says what changed |
 *
 * ## Still open
 *
 * **A generated day is session state.** It is added to `state.bookings` on first view and
 * recorded in `generatedDates`, so edits stick and a day cleared of bookings stays cleared
 * (**Mobile › ClearedDayStaysEmpty** — the rule is the reducer's, so it holds here too). None
 * of it survives a reload; this is demo data, not a backend.
 *
 * **Changing club resets it.** `generatedDates` is cleared alongside `bookings` when the venue
 * changes, because a day filled at one club says nothing about another. That means revisiting a
 * date you had cleared, after switching clubs and back, refills it.
 *
 * **Twelve months is an assumption.** It covers any real booking horizon, but nobody has asked
 * Weston whether the tee sheet should stop at a year or simply keep generating.
 */
const meta = {
  title: 'Weston Edits/9 · Date Navigation/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const JUNE_12 = new Date(2026, 5, 12);

/** The toolbar's golfer count for the viewed day. */
const golferCount = (canvasElement: HTMLElement): number => {
  const pill = within(canvasElement).getByText(
    (_, el) => el?.tagName === 'DIV' && /^\s*\d+\s*golfers$/.test(el.textContent ?? ''),
  );
  return Number(pill.textContent?.match(/\d+/)?.[0] ?? 0);
};

/**
 * **What changed:** a June date has a tee sheet. Fri, Jun 12 is outside the demo's authored
 * eleven days, so it's generated on first view — grid, list, the day summary and the golfer
 * count all read it — and it's the same bookings every load and every visit.
 *
 * **Why:** Weston's case — "I want to go to, let's say, June". The tablet could always get
 * there; there was just nothing to see.
 */
export const GeneratedDay: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { currentDate: JUNE_12 })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByText(/Fri, Jun 12, 2026/);
    await waitFor(() => expect(golferCount(canvasElement)).toBeGreaterThan(0));
  },
};

/**
 * **What changed:** the calendar popover knows the demo's range. Days with tee times are
 * dotted — including the generated ones not yet visited — and past May 21, 2027 (a year from
 * today) days are greyed and can't be picked; › stops at the range's last month. This story
 * starts on Tue, May 18, 2027 and opens the calendar.
 *
 * **Why:** a dot on a day that turns out empty, or a date that opens nothing, would be a
 * dead end.
 */
export const CalendarRange: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { currentDate: new Date(2027, 4, 18) })} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText(/Tue, May 18, 2027/));
    await expect(await c.findByRole('button', { name: /^Saturday, May 22, 2027/ })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await expect(c.getByRole('button', { name: /^Thursday, May 20, 2027, has tee times$/ })).toBeEnabled();
  },
};

/**
 * **What changed:** picking June 12 from the calendar — ‹ › to June, tap the day — lands on
 * its generated tee sheet.
 */
export const PickJuneFromCalendar: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen')} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText(/Thu, May 21, 2026/));
    await userEvent.click(c.getByRole('button', { name: 'Next month' }));
    await userEvent.click(await c.findByRole('button', { name: /^Friday, June 12, 2026, has tee times$/ }));
    await c.findByText(/Fri, Jun 12, 2026/);
    await waitFor(() => expect(golferCount(canvasElement)).toBeGreaterThan(0));
  },
};

/**
 * **Before Weston Edits (base edition, for comparison):** the same Fri, Jun 12 is an empty
 * sheet — the base demo only has its eleven authored days, and its calendar is unchanged.
 */
export const BeforeWestonEdits: Story = {
  render: () => <Screen edition="base" initialState={atVenue('eighteen', { currentDate: JUNE_12 })} />,
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(/Fri, Jun 12, 2026/);
    await expect(golferCount(canvasElement)).toBe(0);
  },
};
