import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { buildTeeTimeCart, money, orderTotals } from '../../../pos/logic/cart';
import { venue } from '../../../pos/data/venues';
import { Screen, atVenue } from '../../pos/screen-helpers';
import {
  adjustedParty,
  noShowParty,
  paidTwilight,
  registerWith,
  sheetWithPanel,
} from '../tablet-scenarios';

/**
 * Weston Edits / 6 · Check In & Pay / Tablet
 *
 * "You're still massaging the reservation before you submit it to the cart and then check
 * it out." **Check in & pay** is that submit: the panel's primary action. It checks in the
 * players who haven't been, loads the reservation — exactly as adjusted — into the register
 * (`loadBooking`), and closes the panel. Its label carries the amount, and it is the same
 * number the register's Pay button will show, because both are built from the same cart.
 *
 * It checks **everyone** in — every player not marked no-show — whatever step they were at.
 *
 * **Walk-ins go through a reservation too.** The register's **Walk-in** (and a CHECK IN
 * rate rung with nothing on the order) no longer starts a register-first order: it puts a
 * walk-in (`W-` code, one player) on the sheet at the **next open tee time** after the demo
 * "now", on the right course for the rate's holes, and opens it here — players, holes, fees
 * and transport are set in the panel, **Walk-in · next open tee time · Change** picks
 * another time, and Check in & pay brings it to the order like any booking. The base
 * edition's fast walk-in is unchanged.
 *
 * ## The component
 *
 * `CheckInFooter` in `src/pos/components/ReservationPanel.tsx` — the panel's pinned bottom
 * bar, outside the scrolling body so it is there on all four tabs. The primary button is the
 * only place in the Weston edition where golf reaches the cart.
 *
 * | What it reads | Where from | Default | What it decides |
 * |---|---|---|---|
 * | `due` | `orderTotals(buildTeeTimeCart(b, state.courses, rateContext(state))).total` | — | The amount on the button and on the right of the summary line |
 * | `fees` | `reservationDue(b, rates)` | — | The `fees` figure; `extras` is `due − fees − tax`, shown as `carts` |
 * | `settled` | `reservationSettled(b)` — every seat `paid` or `noShow` | `false` | **Open in register**, charging nothing |
 * | `onOrder` | `state.selectedBookingId === b.id` | `null` | **Update order · $x** instead of Check in & pay |
 * | `allNoShow` | every seat `noShow` | `false` | Button reads **No-show** and is disabled |
 * | `playing` / `eighteens` | non-no-show seats, and how many are on 18 | — | `3 playing · 1 on 18` on the left |
 *
 * ## What pressing it does
 *
 * 1. Unless the booking is already settled, `patchBooking` runs `checkInPlayer` over every seat
 *    that is not a no-show — `step = max(step, ROUND_STEP.checkedIn)`, `noShow: false`. Not the
 *    arrived-only seats: everyone, which is what Weston asked for on both devices.
 * 2. `loadBooking` puts the golf on the order, selects the booking, forces `view: 'pos'`,
 *    re-expands the order rail and closes the panel.
 *
 * **Check in & pay tops the order up.** `loadBooking` sets `orderSeats: null` and rebuilds the
 * golf for the *whole* booking, keeping every non-golf line already rung up. Round 3 put an
 * **Add to cart** on each player row (section 14), so an order can hold two of four seats;
 * pressing Check in & pay after that completes the party rather than discarding what was done
 * to the seats already on it, because the rebuild reads the reservation, not the cart.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 1366 × 840 (`shell` in `src/theme/tokens.ts`); panel 640 by default |
 * | Footer | `12px 16px 14px`, `md3.onPrimary`, 1px `md3.outlineVariant` top rule, `flexShrink: 0` |
 * | Amount type | 18px / 800, `md3.primary` when settled, else `md3.onSurface` |
 * | Button labels | `Check in & pay · $x` · `Update order · $x` · `Open in register` · `No-show` (disabled) |
 * | Right-hand read-out | `$x due` · `Paid in full` · `No-show · nothing due` |
 * | Secondary actions | **Move** (`movePlayers` at this tee time), **Delete** (a confirm naming the booking and time, `onConfirm: deleteBooking:<id>`), **Close** |
 * | Tax in the amount | `orderTotals` — the booking's own tax line for golf, `TAX_RATE` (8%) on anything else |
 * | Walk-in clock | `demoNow()` — May 21 2026, 12:00 PM — so "next open tee time" is the same slot every run |
 * | Walk-in identity | `walkin-1` / `W-0001`, one player, from `planWalkIn` |
 * | Change-time menu | `openTeeTimes`, party-sized, after the demo now, on `walkInCourses`, `limit: 12`, current one ticked |
 *
 * ## Scope
 *
 * Weston edition, tablet. The base edition still goes tee time → register and keeps its fast
 * register-first walk-in. `loadBooking` itself is shared by both editions, so the "keep the
 * retail, rebuild the golf" rule holds everywhere.
 *
 * ## The stories
 *
 * | Story | Starting state | What it is for |
 * |---|---|---|
 * | **CheckInAndPay** | Panel open on `adjustedParty()` | The footer in full. The play test presses it and asserts the register's **Pay** asks for exactly the amount the button offered, and that the panel closed |
 * | **InTheRegister** | `registerWith(adjustedParty())` | Where it lands: the golf summarised, the same total to pay |
 * | **UpdateOrder** | The same order with the panel reopened on it | The **Update order** label — the booking is already `selectedBookingId` |
 * | **PaidBooking** | `paidTwilight()` — Morris, G. from the Loom | **Paid in full**, action reads **Open in register**, no second charge |
 * | **NoShowParty** | `noShowParty()` | Nothing due, nobody to check in, the action disabled |
 * | **WalkInThroughReservation** | Empty register at the 18-hole club | The whole route: Walk-in → a `W-0001` reservation over today's sheet → Check in & pay → a register showing the golf summary, with no "+ modifier" or "Guest Details" |
 * | **WalkInFromRate** | Register on the CHECK IN category | Ringing *Guest Rate 9 Holes* with an empty order lands a nine-hole walk-in at that rate |
 * | **WalkInChangeTime** | As WalkInThroughReservation | **Change** opens the list of open times that fit the party |
 *
 * ## Still open
 *
 * **Check in & pay is one button doing two things.** Weston's flow wants the party checked in
 * and the money taken in one press, which is right at the counter — but it means there is no
 * way to check a party in from the panel *without* opening an order. The phone splits them (a
 * separate **Check in** button sits beside the primary); the tablet does not, and nobody has
 * said whether it should.
 *
 * **Update order tops up to the whole booking.** That is correct after a per-seat split where
 * the rest of the party has now arrived, and wrong if the operator meant to keep charging two
 * seats. There is no "update just these seats" — `rebuildOrderSeats` exists and does exactly
 * that, but nothing in this footer calls it.
 *
 * **Taking a payment marks the seats paid; nothing un-marks them.** A refund flips `pay` but
 * leaves `playerStates[].paid` alone, so a refunded booking reopened here reads settled.
 */
const meta = {
  title: 'Weston Edits/6 · Check In & Pay/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const expected = () => money(orderTotals(buildTeeTimeCart(adjustedParty(), venue('eighteen').courses)).total);

/**
 * The footer on an adjusted party: fees, carts and tax spelled out, the total, and **Check in
 * & pay · $x**. The play test presses it and checks the register's Pay button asks for the
 * same amount.
 */
export const CheckInAndPay: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(adjustedParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const total = expected();
    await userEvent.click(await canvas.findByRole('button', { name: `Check in & pay · ${total}` }));
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${total}` })).toBeTruthy());
    await expect(canvas.queryByRole('complementary')).toBeNull();
  },
};

/** Where Check in & pay lands: the register, the golf summarised, the same total to pay. */
export const InTheRegister: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(adjustedParty())} />,
};

/**
 * Reopened from the register ("Edit reservation"): the booking is already on the order, so
 * the action reads **Update order** — it rebuilds the golf and keeps anything else rung up.
 */
export const UpdateOrder: Story = {
  render: () => {
    const b = adjustedParty();
    return (
      <Screen
        edition="weston"
        initialState={registerWith(b, { reservationPanel: { bookingId: b.id, tab: 'players', playerIndex: 0 } })}
      />
    );
  },
};

/**
 * A fully paid booking (Morris, G., from the Loom): **Paid in full**, and the action is
 * **Open in register** — no second charge.
 */
export const PaidBooking: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight())} />,
};

/** A no-show party: nothing due and no one to check in, so the action is disabled. */
export const NoShowParty: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(noShowParty())} />,
};

/**
 * **Walk-in → reservation → order.** From an empty register, **Walk-in** lands a walk-in at
 * the next open tee time and opens its reservation in the panel over today's sheet. The play
 * test presses Walk-in, checks the panel is the new walk-in (unnamed, `W-0001`), presses its
 * **Check in & pay**, and checks the register shows the golf summary — no "+ modifier" or
 * "Guest Details" — with Pay asking the panel's amount.
 */
export const WalkInThroughReservation: Story = {
  render: () => <Screen edition="weston" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Walk-in'));
    const panel = await canvas.findByRole('complementary', { name: 'Reservation · Walk-in' });
    await expect(within(panel).getByText(/W-0001/)).toBeTruthy();
    await expect(within(panel).getByRole('button', { name: 'Change walk-in tee time' })).toBeTruthy();
    const pay = within(panel).getByRole('button', { name: /^Check in & pay · / });
    const amount = pay.textContent!.replace('Check in & pay · ', '');
    await userEvent.click(pay);
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${amount}` })).toBeTruthy());
    await expect(canvas.getByRole('button', { name: /Edit reservation/ })).toBeTruthy();
    await expect(canvas.queryByText('+ modifier')).toBeNull();
    await expect(canvas.queryByText('Guest Details')).toBeNull();
  },
};

/**
 * A walk-in rung from a **CHECK IN rate**: Guest Rate 9 Holes with nothing on the order goes
 * to the sheet as a nine-hole walk-in at that rate, at the next open tee time on either nine.
 */
export const WalkInFromRate: Story = {
  render: () => (
    <Screen edition="weston" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, currentCategory: 'CHECK IN' })} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Guest Rate 9 Holes'));
    const panel = await canvas.findByRole('complementary', { name: 'Reservation · Walk-in' });
    await expect(within(panel).getAllByText(/9 holes/).length).toBeGreaterThan(0);
  },
};

/**
 * The walk-in's tee time, changed in the panel: **Change** lists the next open times that
 * fit the party, on the courses the round can start on. Picking one moves the walk-in (and
 * re-prices a rate-card price for the new band).
 */
export const WalkInChangeTime: Story = {
  render: WalkInThroughReservation.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Walk-in'));
    const panel = await canvas.findByRole('complementary', { name: 'Reservation · Walk-in' });
    await userEvent.click(within(panel).getByRole('button', { name: 'Change walk-in tee time' }));
    await within(document.body).findAllByRole('menuitem');
  },
};
