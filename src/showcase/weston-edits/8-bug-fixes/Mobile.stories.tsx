import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { at18, loadedOrder, memberParty, offRateParty, openParty, paidParty } from '../mobile-scenarios';

/**
 * Weston Edits / 8 · Bug Fixes / Mobile
 *
 * The bugs from Weston's recording, checked on the phone. They were fixed in shared cart
 * logic, so they hold in **every edition** — which is why most stories here render the
 * **base** edition: the phone everyone else uses gets the fix too. This page is not a copy of
 * the tablet's; it is the same fixes seen where the phone renders them, plus the two causes
 * that were phone-only.
 *
 * ## The two phone-only bugs
 *
 * **The button's amount was made up.** `BookingDetailScreen`'s **Check in & pay · $amount**
 * counted unpaid players × the booking rate and left out transport and tax, so it disagreed
 * with the order it opened. It now reads `reservationCharge(b, state).total` — the same
 * `orderTotals` the order screen, checkout and the reader charge. **All editions**;
 * `ButtonMatchesOrder` is the base-edition story for it.
 *
 * **A split order came back whole.** The order screen re-syncs its golf against the booking,
 * which is what keeps *Edit reservation → back* honest. It was written before per-seat ordering
 * and compared against the **whole** booking, so a two-of-four order could never match: the
 * comparison was stale by construction, the effect fired on mount, and `loadBooking` replaced
 * the split with the whole party. Tapping **Add** on two rows and opening the Register tab
 * charged for four — $196.00 where the operator had chosen $98.00. The comparison now builds
 * against `state.orderSeats` and dispatches `rebuildOrderSeats` rather than `loadBooking`, so a
 * split bill stays split and still reprices when the reservation changes underneath it. Weston
 * edition (per-seat Add is a Weston feature); see **14 · Per-seat Cart → Mobile**.
 *
 * ## The component
 *
 * These are logic fixes, not a component, but three phone files carry them:
 *
 * | File | What it does now |
 * |---|---|
 * | `src/pos/logic/cart.ts` | `buildTeeTimeCart` prices per seat off the booking; `orderTotals` is the one total |
 * | `src/pos/mobile/screens/tee/BookingDetailScreen.tsx` | The bar's amount is `reservationCharge(b, state).total` |
 * | `src/pos/mobile/screens/register/OrderScreen.tsx` | `staleGolf` compares against `orderSeats`; **Clear order** confirms in a bottom sheet |
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame` in `src/theme/tokens.ts`) |
 * | Tax | `orderMoney` → `orderTotals`: golf by the booking's `Taxes` line, everything else at `TAX_RATE` = **8%** |
 * | Clear order | A **bottom sheet**, not a centred dialog — *Clear this order?* with **Keep order** / **Clear order**, counting `orderLines` (which drops `isSubItem` rows, so the tax line is never counted) and adding *The booking stays on the tee sheet.* when one is attached |
 * | Detaching | Clearing an order releases `selectedBookingId` and `orderSeats` together, so the next sale starts clean |
 * | Zero subtotal | No tax on $0 — a member at the member rate reads Tax $0.00 and has nothing to charge |
 * | Demo clock | `demoNow()` — May 21 2026, 12:00 PM |
 *
 * ## Scope
 *
 * The cart and totals fixes are **all editions**, all three published phone surfaces. The
 * split-order fix is Weston-only because per-seat Add is. **WestonPaidOrder** is the one story
 * here on the Weston edition.
 *
 * ## The stories
 *
 * | Story | Edition | What it is for |
 * |---|---|---|
 * | **ReservedNotWalkIn** | base | A reserved tee time on the order reads **Tee Time 18 holes** under the booking's name, not "Walk-in" |
 * | **RateMatchesBooking** | base | `offRateParty()` — a booking whose rate is *not* the old status-table price. It arrives at the reservation's rate, with no time-of-day discount taken off |
 * | **ButtonMatchesOrder** | base | The booking screen's button carrying the order's real total — fees, transport and tax |
 * | **PaidNotChargedAgain** | base | An already-paid booking opens an order with nothing to charge |
 * | **NoTaxOnZero** | base | A member at $0: Tax $0.00, nothing to charge |
 * | **BookingDetaches** | base | The play test opens the order menu, taps **Clear order**, confirms in the sheet, and the Register is empty with no booking attached |
 * | **WestonPaidOrder** | weston | The same paid-in-full order as the golf summary renders it |
 *
 * ## Where the phone differs from the tablet, and why
 *
 * **Confirmation is a bottom sheet.** The terminal opens a centred confirm dialog; the phone
 * never does — a destructive confirm rises from the bottom, within thumb reach, and says what
 * survives (*The booking stays on the tee sheet.*) rather than only what is destroyed.
 *
 * **The order can be left running.** Each destination keeps its own back stack, so an order can
 * sit on the Register destination while the operator edits the reservation on the Tee Sheet
 * one. That is what made the split-order bug possible at all; the tablet's panel has one way
 * out and no such window.
 *
 * ## Still open
 *
 * **The split-order fix has no story on this page.** It is demonstrated in 14 · Per-seat Cart →
 * Mobile and covered by the order screen's own re-sync, but a client reading only this section
 * will not see it.
 *
 * **The re-sync is a `JSON.stringify` comparison run on every render.** Cheap at four seats,
 * and still the order asking the reservation rather than the reservation telling the order.
 */
const meta = {
  title: 'Weston Edits/8 · Bug Fixes/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * A reserved tee time loaded into the order reads **Tee Time 18 holes** under the
 * booking's name — not "Walk-in". (Base edition.)
 */
export const ReservedNotWalkIn: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(openParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * The order charges the booking's own rate. A twilight or group booking used to arrive as
 * the card's $59 with a time-of-day discount taken off; now the per-player price is the
 * rate on the reservation. (Base edition.)
 */
export const RateMatchesBooking: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(offRateParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * The booking screen's button carries the order's total — fees, transport and tax — so
 * the amount on the button is the amount on the order. (Base edition; phone-only cause.)
 */
export const ButtonMatchesOrder: Story = {
  render: () => (
    <MobileStory edition="base" initialState={at18()} tab="tee" stack={[{ name: 'bookingDetail', bookingId: openParty().id }]} />
  ),
};

/** A booking that's already paid opens an order with nothing to charge — no second payment. (Base edition.) */
export const PaidNotChargedAgain: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(paidParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/** No tax on a $0 subtotal: a member at the member rate shows tax $0.00 and nothing to charge. (Base edition.) */
export const NoTaxOnZero: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(memberParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * Leaving an order detaches its booking: clear the order and the Register is empty again —
 * no booking left attached to the next sale. (Base edition.)
 */
export const BookingDetaches: Story = {
  render: () => <MobileStory edition="base" initialState={loadedOrder(openParty())} tab="register" stack={[{ name: 'order' }]} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByLabelText('Order options'));
    await userEvent.click((await c.findAllByText('Clear order'))[0]);
    // The sheet's confirm is the last "Clear order" on screen.
    await c.findByText('Clear this order?');
    const confirm = await c.findAllByText('Clear order');
    await userEvent.click(confirm[confirm.length - 1]);
  },
};

/** The same fixes in the Weston edition: the paid-in-full order, as the golf summary shows it. */
export const WestonPaidOrder: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(paidParty())} tab="register" stack={[{ name: 'order' }]} />,
};
