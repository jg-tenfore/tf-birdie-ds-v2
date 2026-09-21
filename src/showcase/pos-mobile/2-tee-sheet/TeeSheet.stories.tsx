import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEMO_TODAY } from '../../../pos/data/bookings';
import { emptyListFilters, timeRowKey } from '../../../pos/state/pos-store';
import { MobileStory, mobileMeta, paidFoursome, unpaidBooking } from '../mobile-helpers';

/**
 * Mobile Screens / 2 · Tee Sheet
 *
 * The terminal's 1366px courses × time grid does not shrink to a phone, so the phone draws
 * the same day as a vertical time list: one row per tee time, bookings as cards, open
 * capacity as dashed "Book" targets. The card's left stripe is the payment colour — the
 * same signal the terminal's chip fill carries, because the counter's first question is
 * always who still owes.
 *
 * The sheet is the Tee Sheet destination's root: the navigation bar shows, there is no
 * back arrow, and everything below it is one level deep — search and the day summary
 * push, filters rise as a full-screen dialog, and time or booking actions come up as a
 * bottom sheet over the list.
 */
const meta = {
  title: 'Mobile Screens/2 · Tee Sheet',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * The day, all courses. Date navigation (◀ date ▶) and the course chips live in the top
 * app bar so they stay put while the list scrolls; band headers (Early / Peak / Twilight)
 * stick as you pass them. With every course showing, open capacity collapses to one small
 * chip per course so a row stays short.
 */
export const Default: Story = {
  render: () => <MobileStory tab="tee" />,
};

/**
 * One course. Picking a course chip scopes the list — it writes `listFilters.courses`, so
 * the Filters dialog and the chip row always agree. With one course the open capacity
 * becomes a full-width "Book · N slots open" target; tapping it opens New Tee Time as a
 * full-screen dialog over the sheet.
 */
export const OneCourse: Story = {
  render: () => (
    <MobileStory tab="tee" initialState={{ listFilters: { ...emptyListFilters, courses: [paidFoursome().course] } }} />
  ),
};

/**
 * Filtered. A real filter (anything beyond the course) hides the open slots and keeps
 * only rows with a match — "find the ones that need something" rather than "what does the
 * day look like". The banner says so and clears in one tap; the filter icon carries the count.
 */
export const Filtered: Story = {
  render: () => (
    <MobileStory tab="tee" initialState={{ listFilters: { ...emptyListFilters, status: 'open', holes: '18H' } }} />
  ),
};

/**
 * Operator annotations on the first rows: a frost-delay note and a price override. Both
 * are written by the Operations dialogs reached from the time actions sheet.
 */
export const AnnotatedRows: Story = {
  render: () => (
    <MobileStory
      tab="tee"
      initialState={{
        timeNotes: { [timeRowKey(DEMO_TODAY(), 360)]: { text: 'Frost delay — first tee opens 6:30', color: 'blue' } },
        timePrices: { [timeRowKey(DEMO_TODAY(), 368)]: { label: 'Early bird', fee: 29 } },
      }}
    />
  ),
};

/**
 * Time actions — long-press a time (or tap its label). An MD3 modal bottom sheet, not a
 * screen: these are short, contextual choices. The Operations items (block, note, price,
 * league) push full-screen dialogs onto *this* stack, so ✕ lands back on the sheet at
 * the same row. Driven by `state.contextMenu`, the same slot as the terminal's right-click menu.
 *
 * When the row has parties, row-wide actions follow: check in, mark paid, and **Move
 * everyone**, which opens Move players for the whole time (scoped to the course in view,
 * as here) — the per-booking move stays on each booking's own sheet.
 */
export const TimeActionsSheet: Story = {
  render: () => {
    const b = paidFoursome();
    return (
      <MobileStory
        tab="tee"
        initialState={{
          listFilters: { ...emptyListFilters, courses: [b.course] },
          contextMenu: { kind: 'timeLabel', timeMin: b.timeMin, x: 0, y: 0 },
        }}
      />
    );
  },
};

/**
 * Booking quick actions — long-press a booking card. The shortcut to what Booking Detail
 * offers, for the operator who already knows what they want. "Check in & pay" jumps to the
 * Register destination with the order loaded; the tee sheet's own stack is untouched, so
 * the Tee Sheet tab still returns here.
 */
export const BookingActionsSheet: Story = {
  render: () => (
    <MobileStory tab="tee" initialState={{ contextMenu: { kind: 'booking', bookingId: unpaidBooking().id, x: 0, y: 0 } }} />
  ),
};

/**
 * Filters — a full-screen dialog (✕ / Apply) rather than a push, because it's a set of
 * choices you can abandon. Edits are a draft until Apply; the live count shows whether a
 * filter would empty the day before you commit it.
 */
export const Filters: Story = {
  render: () => (
    <MobileStory
      tab="tee"
      initialState={{ listFilters: { ...emptyListFilters, status: 'open' } }}
      stack={[{ name: 'teeSheetFilters' }]}
    />
  ),
};

/**
 * Search, empty. A pushed page in MD3's full-screen search style: the back arrow and the
 * field share the bar. Back returns to the sheet.
 */
export const SearchEmpty: Story = {
  render: () => <MobileStory tab="tee" stack={[{ name: 'teeSheetSearch' }]} />,
};

/**
 * Search with results across every day in the schedule, grouped by date. Opening a result
 * moves the sheet to that day and pushes Booking Detail on top of the results — so Back
 * from the booking comes back here, not to the sheet.
 */
export const SearchResults: Story = {
  render: () => (
    <MobileStory
      tab="tee"
      initialState={{ listFilters: { ...emptyListFilters, search: paidFoursome().name.split(',')[0] } }}
      stack={[{ name: 'teeSheetSearch' }]}
    />
  ),
};

/**
 * Day summary — the terminal's sidebar as a pushed page with a large top app bar. A
 * course row pops back to the sheet scoped to that course; a balance row pushes that
 * booking straight to its Financial tab.
 */
export const DaySummary: Story = {
  render: () => <MobileStory tab="tee" stack={[{ name: 'daySummary' }]} />,
};
