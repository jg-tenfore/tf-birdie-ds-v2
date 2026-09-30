import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { PPM } from '../../../pos/components/ResourceSheetView';
import { SHEETS, resourcesOf, seedResourceDay } from '../../../pos/data/resources';
import { Screen, TODAY_STR, atVenue } from '../../pos/screen-helpers';
import { at, booking, panelOn, sheetWith, tapAt } from '../resource-scenarios';

/**
 * V1 → V2 Migration / 3 · Court Sheet / Tablet
 *
 * **Booking a court the way you book a tee time.**
 *
 * ## What v1 did
 *
 * The shipping app's Court Sheet (`tf-birdie-ds-v1/app/src/screens/court-sheet.tsx`, from
 * `references/072926/3-coursheet/`) was a column per court, each a stack of discrete 20-minute
 * cards with the time printed inside. Tapping a card pushed a full-screen form titled "Weekday
 * Court Schedule - 7:20 AM". A booking stored a **display name and nothing else** — no length,
 * no party size, no price — so it never reached the register at all.
 *
 * ## What was wrong with it
 *
 * - **No duration.** A 90-minute match was either one 20-minute card or several unrelated ones.
 * - **The booking screen named the court twice and the day not at all** — v1's own note.
 * - **A second scheduler for the same job.** Bay Sheet booked a person onto a bay with a
 *   completely different model: a continuous time axis with duration. Same act, two habits.
 * - **Nothing to pay.** A court was the one bookable thing in the club that could not be charged.
 *
 * ## What this does
 *
 * One scheduler for courts and bays — `pos/data/resources.ts` is the model, and the two sheets
 * are two configurations of it. A booking is a block on a continuous time axis whose height
 * **is** its length. The grid is 30 minutes on both sheets.
 *
 * - **Tap an empty stretch to book it**, at the half-hour you touched. It opens as a draft in a
 *   slide-over; closing without confirming removes it, so a stray tap leaves nothing behind.
 * - **The panel cannot make a collision.** The start moves only where the booking still fits,
 *   the length never runs into the next booking or past closing, and *Move to* lists only courts
 *   free for the whole slot.
 * - **Check in & pay**, exactly as on a tee time: the booking goes on the order and the register
 *   takes over. Payment marks the booking paid, and it turns solid green on the sheet.
 *
 * Colour matches the tee sheet — white with a green edge while owed, solid green once paid.
 *
 * ## Courts are paid for now
 *
 * v1 never charged for a court. With one model for both sheets, a court needed a price, and the
 * call was to charge it like a bay. **The rates are placeholders** — tennis $20/hr, pickleball
 * $15, basketball $25, the pool $10 — and the first thing to correct against a real club.
 *
 * ## Names
 *
 * The six courts are v1's, which are the shipping app's. Their names are normalised: production
 * has "Tennis Court 1" beside "Tennis 2" and "Basketball" beside "Basket Ball 2".
 */
const meta = {
  title: 'V1 → V2 Migration/3 · Court Sheet/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const KIND = 'court' as const;

/**
 * **An ordinary Thursday.** The seeded day: six courts, the morning before the demo's noon mostly
 * checked in and paid, the evening busier than the morning because that is when people play.
 *
 * The play test checks the six columns and that every block's height is its length — the one
 * property that makes the sheet readable at a glance.
 */
export const AnOrdinaryDay: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={sheetWith(KIND, seedResourceDay(KIND, TODAY_STR, at(12)))}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-resource-column]').length).toBe(resourcesOf(KIND).length);
    const blocks = [...canvasElement.querySelectorAll<HTMLElement>('[data-resource-booking]')];
    await expect(blocks.length).toBeGreaterThan(10);
    // A 60-minute block is twice a 30-minute one, to within the 4px inset.
    for (const el of blocks.slice(0, 8)) {
      const label = el.getAttribute('aria-label')!;
      const mins = /(\d+) hr(?: (\d+) min)?|(\d+) min/.exec(label)!;
      const duration = mins[3] ? Number(mins[3]) : Number(mins[1]) * 60 + Number(mins[2] ?? 0);
      await expect(Math.abs(el.offsetHeight - (duration * PPM - 4))).toBeLessThanOrEqual(1);
    }
  },
};

/**
 * **Tapping an empty stretch books it.** Tennis Court 2 at 4:10 PM: the booking starts at the
 * half-hour, 4:00, runs the court default of an hour, and opens as a draft in its panel.
 */
export const TappingBooksIt: Story = {
  render: () => <Screen edition="v1v2" initialState={sheetWith(KIND, [])} />,
  play: async ({ canvasElement }) => {
    tapAt(canvasElement, KIND, 'tennis-2', at(16, 10));
    const panel = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>('[data-resource-panel]');
      if (!el) throw new Error('no panel');
      return el;
    });
    const p = within(panel);
    await expect(p.getByText('Tennis Court 2')).toBeTruthy();
    await expect(p.getByText(/4:00 PM – 5:00 PM · 1 hr/)).toBeTruthy();
    await expect(p.getByText('NEW BOOKING')).toBeTruthy();
  },
};

/**
 * **A stray tap leaves nothing behind.** The same tap, then ✕. The draft is removed rather than
 * left on the sheet as a "Walk-in" nobody meant to make — the failure that tapping-to-book invites
 * if closing does not clean up after it.
 */
export const AStrayTapLeavesNothing: Story = {
  render: () => <Screen edition="v1v2" initialState={sheetWith(KIND, [])} />,
  play: async ({ canvasElement }) => {
    tapAt(canvasElement, KIND, 'tennis-2', at(16));
    await waitFor(() => expect(canvasElement.querySelector('[data-resource-panel]')).not.toBeNull());
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-resource-panel]')).toBeNull());
    await expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBe(0);
  },
};

/**
 * **Book keeps it.** Confirming a draft clears the draft flag, so the booking stays on the sheet
 * after the panel closes.
 */
export const BookKeepsIt: Story = {
  render: () => <Screen edition="v1v2" initialState={sheetWith(KIND, [])} />,
  play: async ({ canvasElement }) => {
    tapAt(canvasElement, KIND, 'pickle-1', at(9));
    await waitFor(() => expect(canvasElement.querySelector('[data-resource-panel]')).not.toBeNull());
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Book' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-resource-panel]')).toBeNull());
    await expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBe(1);
  },
};

/**
 * **Tapping inside a booking does not start another.** The tap belongs to the booking's block,
 * which opens that booking — not a second one layered under it.
 */
export const TappingABookingOpensIt: Story = {
  render: () => (
    <Screen edition="v1v2" initialState={sheetWith(KIND, [booking(KIND, { resourceId: 'tennis-1', startMin: at(10) })])} />
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-resource-booking]')!);
    const panel = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>('[data-resource-panel]');
      if (!el) throw new Error('no panel');
      return el;
    });
    await expect(within(panel).getByText('Kim, David')).toBeTruthy();
    await expect(within(panel).queryByText('NEW BOOKING')).toBeNull();
    await expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBe(1);
  },
};

/**
 * **The length stops at the next booking.** 10:00 on Tennis Court 1 with the next booking at
 * 11:00: the hour it already has is all there is, so **+** is disabled and the panel says why.
 * The panel cannot produce a collision, so it never has to report one.
 */
export const LengthStopsAtTheNextBooking: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'tennis-1', startMin: at(10), durationMin: 60 });
    const b = booking(KIND, { resourceId: 'tennis-1', startMin: at(11), name: 'Park, Susan' });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a, b], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-resource-panel]')!);
    await expect(panel.getByRole('button', { name: 'Increase length' })).toBeDisabled();
    await expect(panel.getByText('The next booking starts right after this.')).toBeTruthy();
  },
};

/**
 * **Move to offers only what is free.** 10:00–11:00 with Tennis Court 2 taken at 10:30: it is
 * absent from the list, because a court free for half the slot is not free.
 */
export const MoveToOffersOnlyFreeCourts: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'tennis-1', startMin: at(10) });
    const blocker = booking(KIND, { resourceId: 'tennis-2', startMin: at(10, 30), name: 'Park, Susan' });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a, blocker], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.querySelector<HTMLElement>('[data-resource-panel]')!);
    await expect(panel.queryByRole('button', { name: 'Tennis Court 2' })).toBeNull();
    await expect(panel.getByRole('button', { name: 'Pickleball Court 1' })).toBeTruthy();
    await userEvent.click(panel.getByRole('button', { name: 'Pickleball Court 1' }));
    await waitFor(() => expect(panel.getByText('Pickleball Court 1', { selector: 'h6, p, span' })).toBeTruthy());
  },
};

/**
 * **Finding the customer.** A new booking starts as "Walk-in". Tapping it opens the same golfer
 * search the register uses — one picker, a new target — and choosing someone fills the booking.
 */
export const FindingTheCustomer: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'tennis-1', startMin: at(10), name: 'Walk-in', crmId: undefined, phone: undefined });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector<HTMLElement>('[data-resource-panel]')!;
    await expect(within(panel).getByText('Walk-in')).toBeTruthy();
    await userEvent.click(panel.querySelector<HTMLElement>('[data-resource-customer]')!);
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.type(dialog.getByPlaceholderText('Search name or phone…'), 'Farnsworth');
    const hit = await dialog.findAllByText(/Farnsworth/);
    await userEvent.click(hit[0]);
    await waitFor(() => expect(within(panel).getByText(/Farnsworth/)).toBeTruthy());
    await expect(within(panel).queryByText('Walk-in')).toBeNull();
  },
};

/**
 * **Check in & pay.** The tee time's one primary action, on a court. The booking goes onto the
 * order at its price — Tennis Court 1 for an hour, $20.00 — and the register takes over.
 */
export const CheckInAndPay: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'tennis-1', startMin: at(15), durationMin: 60 });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Check in & pay · $20.00' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-resource-sheet]')).toBeNull());
    await expect(canvas.getByText('Tennis Court 1 · 1 hr')).toBeTruthy();
  },
};

/**
 * **Cancelling asks first.** A confirmed booking is cancelled behind a confirm, because there is
 * no undo; a draft is simply discarded, because there is nothing yet to lose.
 */
export const CancellingAsksFirst: Story = {
  render: () => {
    const a = booking(KIND, { resourceId: 'bball-1', startMin: at(18) });
    return <Screen edition="v1v2" initialState={panelOn(KIND, [a], a.id)} />;
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Cancel booking' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel booking' }));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBe(0));
  },
};

/**
 * **Only in V1 → V2.** Weston Edits has no court sheet, so its nav tile stays dimmed there. The
 * screen arriving in the new prototype must not leak into the one Weston reviews.
 */
export const DimmedInWestonEdits: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { navOpen: true })} />,
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLButtonElement>('[data-nav-key="courtsheet"]')!;
    await expect(tile.disabled).toBe(true);
  },
};

/** …and live in V1 → V2, where tapping it opens the sheet. */
export const LiveInV1V2: Story = {
  name: 'Live in V1 → V2',
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { navOpen: true })} />,
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLButtonElement>('[data-nav-key="courtsheet"]')!;
    await expect(tile.disabled).toBe(false);
    await userEvent.click(tile);
    await waitFor(() => expect(canvasElement.querySelector(`[data-resource-sheet="${KIND}"]`)).not.toBeNull());
    await expect(canvasElement.querySelectorAll('[data-resource-column]').length).toBe(resourcesOf(KIND).length);
    // The sheet seeds its own day on arrival.
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-resource-booking]').length).toBeGreaterThan(0));
    await expect(SHEETS[KIND].stepMin).toBe(30);
  },
};
