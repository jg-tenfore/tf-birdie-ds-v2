import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { Booking } from '../../../pos/types';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { at18, dayLine, earlyFrontNine, firstInLine, lineIndex } from '../mobile-scenarios';

/**
 * Weston Edits / 15 · Next In Line / Mobile
 *
 * **Retired on the phone, Oct 1.** The third call gave the reservation a **‹ n of m ›** stepper —
 * Justin's idea, which Weston took: after working one reservation you are usually about to work
 * the next. On the phone it sat on a line of its own between the app bar and the summary, and on
 * the Oct 1 call Weston took it back out:
 *
 * > "I think we could get rid of this. I just don't know if anyone would have enough context to
 * > know like what comes next… it like takes up a line." — Weston
 *
 * Stepping tee time to tee time is what a **league** needs — working the groups of one event in
 * order — and that moves to the league's own group view (V1 → V2 Migration / 100126 / 8). The
 * proposal was V1 → V2 Migration / 100126 / 11. Nothing replaces the stepper here: the line goes,
 * and the summary, the tabs and the first player move up into it.
 *
 * ## What changed
 *
 * `NextInLine`, the local component at the foot of
 * `src/pos/mobile/screens/tee/BookingDetailScreen.tsx`, is gone, and with it the line it took
 * inside the reservation's `TopAppBar`. It only ever rendered in the Weston edition (`weston &&
 * !holder`), so the base phone is unchanged.
 *
 * | | Before (Weston rounds 3–5) | Now |
 * |---|---|---|
 * | Under the app bar | **‹ 3 of 88 ›**, centred, on its own line | the status badge and `n players · holes · transport` |
 * | Getting to the next tee time | › | Back, then the next card on the sheet — which the sheet kept at the same scroll position |
 * | Accessible names | `Previous tee time` · `Next tee time` | — |
 *
 * **The tablet keeps its stepper** (see **Tablet**): there it sits beside the ✕ in the panel's
 * header and takes no line of its own, which was the phone's whole problem.
 *
 * ## The stories
 *
 * | Story | Starting booking | What it is for |
 * |---|---|---|
 * | **No Pager** | `earlyFrontNine` (was 3 of 88) | No counter, no arrows, and the summary sits directly under the app bar |
 * | **Not At The Start Of The Day Either** | `firstInLine` (was 1 of 88, ‹ disabled) | The ends of the day were where the stepper said the most; it is gone there too |
 * | **Back Leaves The Reservation** | `earlyFrontNine` | The way to the next tee time now: one Back lands on the tee sheet, at a destination root |
 *
 * ## Still open
 *
 * - **The league view.** Where stepping through a league's tee times lands is 100126 / 8's
 *   question, not this screen's.
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

/** What the stepper used to print for a booking: 1-based, out of the day's real bookings. */
const position = (b: Booking) => `${lineIndex(b) + 1} of ${dayLine().length}`;

const reservation = (b: Booking) => (
  <MobileStory edition="weston" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />
);

/** No stepper anywhere on the screen: no counter, and neither arrow. */
const expectNoPager = async (c: ReturnType<typeof within>, b: Booking) => {
  await c.findByRole('heading', { name: b.name });
  await expect(c.queryByText(position(b))).toBeNull();
  await expect(c.queryByRole('button', { name: 'Previous tee time' })).toBeNull();
  await expect(c.queryByRole('button', { name: 'Next tee time' })).toBeNull();
};

/**
 * **The line is gone.** Early in the morning, where the stepper used to read **‹ 3 of 88 ›**:
 * the app bar's name and time, then straight into the status badge and the party's summary, then
 * the tabs.
 *
 * The play test checks there is no counter and no arrow, and that the tabs start within one
 * summary line of the app bar — with the stepper's line back, they would be a line further down.
 */
export const NoPager: Story = {
  render: () => reservation(earlyFrontNine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const b = earlyFrontNine();
    await expectNoPager(c, b);
    const appBarRow = c.getByRole('heading', { name: b.name }).closest('div')!.parentElement!;
    const tabs = c.getByRole('tablist');
    await expect(tabs.getBoundingClientRect().top - appBarRow.getBoundingClientRect().bottom).toBeLessThan(48);
  },
};

/**
 * **Not at the start of the day either.** The first tee time was where the stepper said the most
 * — **1 of 88** with ‹ greyed — and it is gone there as well: the screen reads the same on every
 * reservation.
 */
export const NotAtTheStartOfTheDayEither: Story = {
  render: () => reservation(firstInLine()),
  play: async ({ canvasElement }) => {
    await expectNoPager(within(canvasElement), firstInLine());
  },
};

/**
 * **The way to the next tee time is Back.** The tee sheet stays mounted under the reservation at
 * the scroll position you left it, so one Back puts the next card where your thumb already is —
 * the navigation bar showing is the assertion that it landed on a destination root.
 */
export const BackLeavesTheReservation: Story = {
  render: () => reservation(earlyFrontNine()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await c.findByRole('heading', { name: earlyFrontNine().name });
    await userEvent.click(c.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(c.getByRole('navigation', { name: 'Main' })).toBeTruthy());
  },
};
