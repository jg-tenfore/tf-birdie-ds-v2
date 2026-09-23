import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { Booking } from '../../../pos/types';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import {
  at18,
  beforeBlock,
  dayBlocks,
  dayLine,
  earlyFrontNine,
  firstInLine,
  lastInLine,
  lineIndex,
  lineStep,
} from '../mobile-scenarios';

/**
 * Weston Edits / 15 · Next In Line / Mobile
 *
 * Justin's idea on the third call, which Weston took immediately: once you have worked one
 * reservation you are usually about to work the next one, and closing it to hunt for a chip two
 * rows down is a step that buys nothing. So the reservation's app bar carries a **‹ n of m ›**
 * stepper, and the whole day is one walk.
 *
 * > "If you're just moving fast, you're boom, boom, boom, going through." — Weston
 *
 * **The phone is arguably where this matters most.** At the counter the tee sheet is in front of
 * you the whole time and closing the panel costs a glance; on a phone the sheet is a screen you
 * have left, so getting back to it, finding your place in a 402px-wide column and tapping the
 * next chip is four or five interactions. The stepper collapses all of that into one tap on a
 * control already under your thumb.
 *
 * ## The component
 *
 * `NextInLine`, a local component at the foot of
 * `src/pos/mobile/screens/tee/BookingDetailScreen.tsx`, rendered inside the reservation's
 * `TopAppBar` — on its own line, above the status badges and the tabs, and only when
 * `weston && !holder`.
 *
 * | | |
 * |---|---|
 * | Order | `dayBookings(state)`, filtered `pay !== 'block' && pay !== 'event'`, sorted **`timeMin` → `course` → `slot`** — the terminal's sort, to the character |
 * | Position | `day.findIndex(x => x.id === booking.id)`, printed as `{at + 1} of {day.length}` |
 * | Hides itself | `at < 0 \|\| day.length < 2` |
 * | ‹ disabled | `at === 0`; **›** disabled at `at === day.length - 1` |
 * | A step | `nav.replace({ name: 'bookingDetail', bookingId: next.id })` |
 *
 * ## Where it deliberately differs from the tablet
 *
 * **It navigates instead of dispatching, and it `replace`s rather than `push`es.** The terminal
 * dispatches `stepReservation`, which patches the open panel. The phone has no panel to patch —
 * the reservation *is* the screen — so a step has to be a navigation.
 *
 * Pushing would be the obvious thing and it would be wrong: after walking nine tee times, Back
 * would have to be pressed nine times to get out, and the system back gesture would rewind the
 * morning one reservation at a time instead of returning to the sheet. **Replacing keeps the
 * stack two deep however far you walk**, so Back always means "done with reservations" — which is
 * the only thing anyone wants it to mean. **Back Still Leaves The Reservation** below is that
 * rule as an assertion.
 *
 * | | Tablet | Phone |
 * |---|---|---|
 * | Mechanism | `stepReservation` patches `reservationPanel` | `nav.replace` swaps the top of the stack |
 * | Tab reset | the reducer sets `tab: 'players'` | the replaced route carries **no `tab`**, and the screen defaults |
 * | Where it sits | between the title and the ✕ | centred on its own line under the app bar's Back and ⋮ |
 * | What tells you it landed | the sheet highlights a different chip | the app bar **re-titles itself** to the new booking's name |
 * | Position width | `min-width: 34` | `min-width: 64` — the phone's caption type is larger |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `src/theme/tokens.ts`) |
 * | Arrows | MUI `IconButton size="small"` — 34px, inside the 64px `mobile.topAppBarH` app bar |
 * | Counter | MUI `variant="caption"`, `md3.onSurfaceVariant`, `min-width: 64`, centred, so the arrows do not shuffle between "9 of 88" and "10 of 88" |
 * | Accessible names | `Previous tee time` · `Next tee time` |
 * | Stack depth | **2**, always — tee sheet + one reservation, however many steps were taken |
 * | The demo day | **88** steppable bookings at the 18-hole club |
 *
 * ## Scope
 *
 * Weston edition only, on `{ name: 'bookingDetail' }` (a **push**, `PRESENTATION.bookingDetail`).
 * It never appears on a block or league slot: those render `HolderBody`, and the stepper is
 * guarded on `!holder` — the same rule the sort's `pay !== 'block'` filter states from the other
 * end.
 *
 * None of the four Storybook toolbar globals change this screen.
 *
 * ## The stories
 *
 * | Story | Starting booking | What it is for |
 * |---|---|---|
 * | **The Stepper** | `earlyFrontNine` (3 of 88) | The control in place, both arrows live |
 * | **Stepping Forward And Back** | same | › then ‹ lands back where it started. Asserts the counter *and* the app bar heading, because the title is the phone's only "it landed" cue |
 * | **Boom Boom Boom** | `firstInLine` | Three presses forward. Worth watching for what *doesn't* happen: no screen slides in, nothing closes, the sheet is never returned to |
 * | **Back Still Leaves The Reservation** | `firstInLine` | `replace`-not-`push`, made visible: walk three, press Back once, and the navigation bar is showing — which only happens at a destination root |
 * | **Stepping Resets To Players** | `earlyFrontNine`, opened on **Activity** | The next reservation comes up on Players. Landing on somebody else's Activity tab is a screen you have to read before you can tell it is not what you wanted |
 * | **Blocks And Empty Slots Are Skipped** | `beforeBlock` | › steps **over** the day's first block, and the general rule is held so demo data cannot quietly put one back |
 * | **At The Start Of The Day** | `firstInLine` (1 of 88) | ‹ disabled. On a phone, where you cannot glance at the sheet to check, "1 of 88" is the only thing standing between "the end of the day" and "the app is broken" |
 * | **At The End Of The Day** | `lastInLine` (88 of 88) | › disabled. Moving to tomorrow is the date control's job (9 · Date Navigation) |
 *
 * ## Still open
 *
 * - **No swipe.** A horizontal swipe between tee times is the gesture a phone user would reach
 *   for first, and the reservation body does not have one. The arrows are the whole affordance.
 * - **It steps the whole day, across every course.** `dayBookings` filters on the date alone —
 *   not on `visibleCourses`, not on the tee sheet's filters — so a filtered sheet and the stepper
 *   disagree about what "next" means.
 * - **A step throws away the sub-screen you were on.** Replace resets to Players by design, but
 *   it also means a ⋮ sheet or an open dialog on the old reservation has nowhere to go; nothing
 *   currently opens one and then steps, so it has not been designed for.
 * - **88 is this demo day**, generated rather than authored; every assertion reads it from
 *   `dayLine()` rather than hard-coding it.
 */
const meta = {
  title: 'Weston Edits/15 · Next In Line/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** How the app bar prints a position: 1-based, out of the day's real bookings. */
const position = (b: Booking) => `${lineIndex(b) + 1} of ${dayLine().length}`;

const reservation = (b: Booking, tab?: 'financial' | 'notes' | 'activity') => (
  <MobileStory
    edition="weston"
    initialState={at18()}
    tab="tee"
    stack={[{ name: 'bookingDetail', bookingId: b.id, tab }]}
  />
);

/**
 * **The stepper in place, early in the morning.** **‹ 3 of 88 ›** sits between the app bar's
 * back arrow and its ⋮, on its own line above the status badges and the tabs: close enough to
 * the thumb to be used without looking, far enough from Back not to be caught by accident.
 */
export const TheStepper: Story = {
  render: () => reservation(earlyFrontNine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(position(earlyFrontNine()))).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Next tee time' })).toBeEnabled();
    await expect(c.getByRole('button', { name: 'Previous tee time' })).toBeEnabled();
  },
};

/**
 * **Forward, and back again.** The play test steps ›, checks the screen is now the next tee time
 * on the day — a different booking, one higher on the counter — then steps ‹ and checks it is
 * back on the one it started from.
 *
 * Note what the app bar's title does: it is the booking's name, so the screen re-titles itself
 * as you walk. That is the phone's version of the terminal highlighting a different chip on the
 * sheet — the only thing that tells you the step landed.
 */
export const SteppingForwardAndBack: Story = {
  render: () => reservation(earlyFrontNine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const here = earlyFrontNine();
    const next = lineStep(here, 1);
    await c.findByRole('heading', { name: here.name });

    await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
    await waitFor(() => expect(c.getByText(position(next))).toBeTruthy());
    await expect(c.getByRole('heading', { name: next.name })).toBeTruthy();

    await userEvent.click(c.getByRole('button', { name: 'Previous tee time' }));
    await waitFor(() => expect(c.getByText(position(here))).toBeTruthy());
    await expect(c.getByRole('heading', { name: here.name })).toBeTruthy();
  },
};

/**
 * **Three in a row.** What Weston described — boom, boom, boom. Three presses of › walk three
 * tee times forward, and the counter and the title agree at every step. Worth watching for the
 * thing that *doesn't* happen: no screen slides in, nothing closes, and the tee sheet is never
 * returned to.
 */
export const BoomBoomBoom: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const start = firstInLine();
    for (let step = 1; step <= 3; step++) {
      await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
      const landed = lineStep(start, step);
      await waitFor(() => expect(c.getByText(position(landed))).toBeTruthy());
      await expect(c.getByRole('heading', { name: landed.name })).toBeTruthy();
    }
  },
};

/**
 * **Back still means "done", however far you walked.** This is the `replace`-not-`push` rule,
 * made visible: after three steps the navigation stack is still exactly two deep — the tee sheet
 * and one reservation — so one Back lands on the tee sheet with the navigation bar showing,
 * rather than unwinding three tee times one at a time.
 *
 * The play test walks three, presses Back once, and checks the app is at a destination root.
 */
export const BackStillLeavesTheReservation: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    for (let step = 1; step <= 3; step++) {
      await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
      await waitFor(() => expect(c.getByText(position(lineStep(firstInLine(), step)))).toBeTruthy());
    }
    await userEvent.click(c.getByRole('button', { name: 'Back' }));
    // The navigation bar only shows on a destination root, so finding it is the assertion.
    await waitFor(() => expect(c.getByRole('navigation', { name: 'Main' })).toBeTruthy());
  },
};

/**
 * **A step resets to Players.** Open on Activity, press ›, and the next reservation comes up on
 * **Players** — the replaced route carries no `tab`, and the screen defaults.
 *
 * Deliberate rather than incidental: you are moving to new golf, and the reason you were reading
 * the last party's activity log does not travel with you. Landing on somebody else's Activity
 * tab is a screen you have to read before you can tell it is not what you wanted.
 */
export const SteppingResetsToPlayers: Story = {
  render: () => reservation(earlyFrontNine(), 'activity'),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(c.getByRole('button', { name: 'Next tee time' }));
    await waitFor(() =>
      expect(c.getByRole('tab', { name: 'Players' })).toHaveAttribute('aria-selected', 'true'),
    );
  },
};

/**
 * **Blocks are not tee times.** Course Maintenance, Shift Change and league events sit on the
 * sheet like bookings and are deliberately absent from the walk: there is no party, no rate and
 * nothing to check in. Opening one directly gets the holder body and no stepper at all
 * (`weston && !holder`), which is the same rule read from the other end.
 *
 * This story opens the last reservation before the day's first block. Pressing › steps over the
 * block to the next real tee time. The test also holds the general rule — no entry in the
 * stepper's order is a block — so a change to the demo data can't quietly put one back.
 */
export const BlocksAndEmptySlotsAreSkipped: Story = {
  render: () => reservation(beforeBlock()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(dayBlocks().length).toBeGreaterThan(0);
    await expect(dayLine().some((b) => b.pay === 'block' || b.pay === 'event')).toBe(false);
    const landed = lineStep(beforeBlock(), 1);
    await userEvent.click(await c.findByRole('button', { name: 'Next tee time' }));
    await waitFor(() => expect(c.getByText(position(landed))).toBeTruthy());
    await expect(landed.pay).not.toBe('block');
  },
};

/**
 * **The first tee time of the day: ‹ is off.** Rather than wrapping round to the evening, which
 * would read as the screen losing its place. The counter says **1 of 88**, which is the
 * explanation — and on a phone, where you cannot glance at the sheet to check, that sentence is
 * the only thing standing between "the end of the day" and "the app is broken".
 */
export const AtTheStartOfTheDay: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(position(firstInLine()))).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Previous tee time' })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Next tee time' })).toBeEnabled();
  },
};

/**
 * **The last tee time: › is off.** The end of the day is a real place to be, and the stepper
 * says so instead of starting the morning over. Moving to tomorrow is the date control's job
 * (9 · Date Navigation), which is a decision, not a keystroke.
 */
export const AtTheEndOfTheDay: Story = {
  render: () => reservation(lastInLine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(position(lastInLine()))).toBeTruthy();
    await expect(c.getByRole('button', { name: 'Next tee time' })).toBeDisabled();
    await expect(c.getByRole('button', { name: 'Previous tee time' })).toBeEnabled();
  },
};
