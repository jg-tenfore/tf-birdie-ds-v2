import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, loadedOrder, memberParty, paidParty, partlyPaidNamed, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 6 · Check In & Pay / Mobile
 *
 * The reservation's pinned bottom action — the one moment the golf goes to the register.
 * Its amount is what the order will charge for the reservation *as adjusted* (fees, holes,
 * transport, tax on the seats still paying). When nothing is due — paid in full, or a
 * member at $0 — it doesn't ask for money at all: it checks the party in, with the
 * register one tap away for anything they buy. Like the tablet's, it checks everyone in
 * (no-shows aside) as it opens the order.
 *
 * Two routes into it that used to skip it: the tee sheet's long-press **quick sheet** now
 * offers **Open reservation** instead of a straight-to-register Check in & pay, and the
 * Register's **Walk-in** (or a CHECK IN rate with nothing on the order) creates a walk-in
 * reservation at the next open tee time and pushes it — base edition unchanged.
 *
 * ## The component
 *
 * `ReservationActions` in `src/pos/mobile/screens/tee/BookingDetailScreen.tsx`, rendered into
 * the screen's `BottomActionBar`. It is the Weston-edition replacement for the base bar; the
 * `checkInAndPay` handler above it is shared.
 *
 * | What it reads | Where from | Default | What it decides |
 * |---|---|---|---|
 * | `total` | `reservationCharge(b, state).total` → `orderTotals(buildTeeTimeCart(…))` | — | Which of the three bars renders, and the number on the button |
 * | `closed` | `b.pay === 'no_show' \|\| 'refund'` | `open` | A single **Open in Register** button |
 * | `settled` | every seat `paid` or `noShow` | `false` | The summary line: *Paid in full — nothing to charge.* vs *No charge at this rate.* |
 * | `allIn` | `checkedInCount(b) === b.players` | `false` | Hides the outlined **Check in**, or disables it as **All checked in** |
 *
 * **Three bar shapes**, not one button with three labels:
 *
 * | Case | Left | Right |
 * |---|---|---|
 * | Something due | **Check in** (outlined, hidden once everyone is in) | **Check in & pay · $x** |
 * | Nothing due | **Register** | **Check in** / **All checked in**, over a one-line explanation |
 * | Closed (no-show, refunded) | — | **Open in Register**, full width |
 *
 * ## What pressing it does
 *
 * `patchBooking` with `checkInPlayer` over every non-no-show seat, then `loadBooking`, then
 * `nav.openIn('register', { name: 'order' })` — a **destination jump**, not a push. The
 * reservation stays where it was on the Tee Sheet stack; the order opens on the Register
 * destination with its own back stack and badge. The base edition's button skips the check-in
 * patch and only opens the order.
 *
 * Like the tablet's, `loadBooking` **tops the order up** to the whole booking (`orderSeats:
 * null`) and keeps any retail and F&B already on it, so seats added one at a time from the
 * player rows (section 14) keep their adjustments.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame`) |
 * | Screen | route `bookingDetail`, presentation **push** (`PRESENTATION`) |
 * | Action bar | `BottomActionBar`, pinned above the gesture bar (`mobile.gestureBarH` 20) |
 * | Touch floor | 48 (`mobile.touchTarget`); the outlined button takes `flexShrink: 0` so its label never wraps |
 * | Amount | `orderTotals` — the same function the order screen, checkout, tip screen and reader read |
 * | Move / Delete | Not on the bar: the app bar's **More actions** opens a bottom sheet, and Delete confirms in a second sheet rather than a centred dialog |
 * | Walk-in | `W-0001`, one player, at the next open tee time after `demoNow()` (May 21 2026, 12:00 PM) |
 * | Quick sheet | `state.contextMenu` of kind `booking` — the same slot the terminal's right-click menu uses, so a story can open it declaratively |
 *
 * ## Scope
 *
 * Weston edition, phone. The base phone's bar still reads **Check in & pay · $x** but only
 * opens the order, keeps a separate **Check in** screen for the party, and its quick sheet goes
 * straight to the register. The **amount** on the base button was fixed for every edition — see
 * 8 · Bug Fixes → *ButtonMatchesOrder*.
 *
 * ## The stories
 *
 * | Story | Booking | What it is for |
 * |---|---|---|
 * | **CheckInAndPay** | `adjustedParty()` | The ordinary case: **Check in & pay · $x** beside **Check in** |
 * | **AfterCheckInAndPay** | same | The play test taps it; the Register destination opens on the order, whose golf summary and total match the button |
 * | **PartlyPaid** | `partlyPaidNamed()` | Only the unpaid seats are charged |
 * | **PaidInFull** | `paidParty()` | No second request for money: the bar says so and offers **Check in**, with **Register** for anything else they buy |
 * | **MemberNoCharge** | `memberParty()` — $0 at the member rate | The same nothing-due bar for a reason that is not "already paid" |
 * | **PaidInFullOrder** | `loadedOrder(paidParty())` | What that reservation opens in the register: every seat struck through, nothing to charge |
 * | **QuickSheetOpensReservation** | Tee sheet with the booking's quick sheet open | **Open reservation** replaces the old straight-to-register item; the test taps it and lands on Check in & pay |
 * | **WalkInFromRegister** | Empty Register | The **Walk-in** start card creates `W-0001` and pushes its reservation, whose Check in & pay brings it to the order |
 *
 * ## Where the phone differs from the tablet, and why
 *
 * **Check-in and payment are separable here.** The tablet has one primary button; the phone
 * puts an outlined **Check in** beside it, because the phone is the device that walks the
 * sheet. Checking a group in at the first tee, with the money settled later at the counter, is
 * a real phone job and not a real terminal one.
 *
 * **The nothing-due bar explains itself.** At $0 the phone swaps the primary action for
 * **Check in** and writes a line above it — *Paid in full — nothing to charge.* or *No charge
 * at this rate.* The tablet just reads **Paid in full** and offers **Open in register**; it has
 * a whole Financial tab visible beside it, the phone has one screen at a time.
 *
 * **Leaving is a destination jump, not a close.** The tablet's panel closes onto the tee sheet
 * it was over. The phone moves you to the Register destination and leaves the reservation
 * intact on the Tee Sheet stack, so the Tee Sheet tab returns to it.
 *
 * ## Still open
 *
 * **The walk-in's tee time cannot be changed on the phone.** The tablet's panel carries
 * **Walk-in · next open tee time · Change** (`WalkInTimePicker`); the phone's reservation has
 * no equivalent, so a phone walk-in takes the slot it is given or goes through Move.
 *
 * **Nothing here un-checks a party.** `checkInPlayer` only ever advances a seat and clears its
 * no-show flag; an accidental Check in & pay is corrected on the player rows, not from the bar.
 */
const meta = {
  title: 'Weston Edits/6 · Check In & Pay/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const detail = (b: ReturnType<typeof adjustedParty>) => (
  <MobileStory edition="weston" initialState={at18(withBookings(b))} tab="tee" stack={[{ name: 'bookingDetail', bookingId: b.id }]} />
);

/** An adjusted, unpaid reservation: **Check in & pay · $amount**, with the amount the order will show. */
export const CheckInAndPay: Story = {
  render: () => detail(adjustedParty()),
};

/**
 * Tapping it: the reservation is loaded into the register and the Register destination
 * opens on the order — its golf summary and total match the button.
 */
export const AfterCheckInAndPay: Story = {
  render: CheckInAndPay.render,
  play: async ({ canvasElement }) => {
    await userEvent.click(await within(canvasElement).findByRole('button', { name: /^Check in & pay/ }));
  },
};

/** Partly paid: the button charges only the players who haven't paid. */
export const PartlyPaid: Story = {
  render: () => detail(partlyPaidNamed()),
};

/**
 * Paid in full: no second request for money. The bar says so and offers **Check in**, with
 * **Register** for anything else they buy.
 */
export const PaidInFull: Story = {
  render: () => detail(paidParty()),
};

/** A member at $0: check-in only, no "pay". */
export const MemberNoCharge: Story = {
  render: () => detail(memberParty()),
};

/** The order a paid-in-full reservation opens: every seat struck through, nothing to charge. */
export const PaidInFullOrder: Story = {
  render: () => <MobileStory edition="weston" initialState={loadedOrder(paidParty())} tab="register" stack={[{ name: 'order' }]} />,
};

/**
 * **Quick sheet → Open reservation.** Long-pressing a booking on the tee sheet used to offer
 * "Check in & pay", which went straight to the register past the reservation. In the Weston
 * edition it offers **Open reservation** (players, holes, tee fees, transport) — Check in &
 * pay lives on the reservation. The play test checks the item, taps it, and lands on the
 * reservation's Check in & pay.
 */
export const QuickSheetOpensReservation: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={at18(withBookings(adjustedParty()), { contextMenu: { kind: 'booking', bookingId: adjustedParty().id, x: 0, y: 0 } })}
      tab="tee"
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText('Open reservation'));
    await waitFor(() => expect(c.queryByText('Open reservation')).toBeNull());
    await c.findByRole('button', { name: /^Check in & pay · / });
  },
};

/**
 * **Walk-in → reservation.** On an empty Register, the **Walk-in** start card puts a walk-in
 * (`W-0001`, one player) at the next open tee time and pushes its reservation screen, where
 * the party is set up; its Check in & pay brings it to the order.
 */
export const WalkInFromRegister: Story = {
  render: () => <MobileStory edition="weston" initialState={at18()} tab="register" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByText('Walk-in'));
    await waitFor(() => expect(c.getAllByText(/W-0001/).length).toBeGreaterThan(0));
    await c.findByRole('button', { name: /^Check in & pay · / });
  },
};
