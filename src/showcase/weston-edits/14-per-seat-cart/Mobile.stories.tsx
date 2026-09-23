import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, openParty, partlyPaidNamed, seatOrder, seatsTotal, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 14 · Per-seat Cart / Mobile
 *
 * Weston, on the third call, describing how a group that splits the bill actually gets rung up:
 * *"you hit add to cart for each player, and then you hit save."*
 *
 * Until this round the reservation had one way into the order — **Check in & pay**, which takes
 * the whole booking. That is right for the common case and wrong for the one that ties up the
 * counter: a foursome where two are paying now, one is paying with the other's card, and the
 * fourth is still in the parking lot. So every editable player row carries a small **cart chip**
 * beside the ⋮, and the order is built a seat at a time.
 *
 * ## The component
 *
 * A `ControlChip` on the player row in `src/pos/mobile/screens/tee/ReservationPlayers.tsx`. It
 * dispatches `{ type: 'addSeatToOrder', bookingId, seat }` — **the terminal's reducer, unchanged**
 * (`src/pos/state/pos-store.ts`), which is what makes the two surfaces agree about what a split
 * order is.
 *
 * | | Glyph | `aria-label` | `aria-pressed` | Fill |
 * |---|---|---|---|---|
 * | Not yet added | `add_shopping_cart` | `Add {name} to the order` | `false` | transparent, `md3.outline` border |
 * | Already on it | `shopping_cart` | `{name} is on the order` | `true` | `md3.primaryContainer` |
 *
 * The label carries the state rather than a word beside the glyph: at 402 an "In order" caption
 * would cost a control's worth of width on a strip that is already **9 | 18**, fee, transport,
 * cart and ⋮. The play tests below assert on the label, because it is both the accessible name
 * and what a screen reader announces. `aria-pressed` is set too, so the chip does not read as a
 * plain button.
 *
 * Locked seats — paid or no-show — carry no chip at all. There is nothing left to charge them
 * for, which is the same rule that locks their holes, fee and transport.
 *
 * ## Where it deliberately differs from the tablet
 *
 * | | Tablet | Phone | Why |
 * |---|---|---|---|
 * | Feedback | **In order** printed beside the name | the chip's fill, glyph and label | width |
 * | The rail | adding re-expands the 56px strip | **nothing to re-expand** | `ViewOrderBar` (`screens/register/parts.tsx`) returns null while the cart is empty, so the space was never spent. The order is a screen on the Register destination, with a count badge on the navigation bar |
 * | Repricing an order | nothing dispatches `rebuildOrderSeats` | `OrderScreen` does, on mount and whenever the reservation and the order disagree | the phone leaves the reservation to look at the order, so it has to re-check on the way back |
 *
 * That third row is why **13 · Order Rail has no Mobile half**: the promise is kept, by different
 * means, and there is no rail to write about.
 *
 * ## The defect this feature turned up, and the fix
 *
 * The Weston edition treats the reservation as the source of truth for the golf and re-syncs the
 * order whenever the two disagree — which is what keeps "Edit reservation → back" honest. Built
 * before per-seat ordering, the comparison in `screens/register/OrderScreen.tsx` was made against
 * the **whole booking**:
 *
 * ```ts
 * const staleGolf = weston && booking != null && state.cart.some((i) => i.isCheckIn) &&
 *   JSON.stringify(golfLines(state.cart)) !==
 *   JSON.stringify(golfLines(cartLogic.buildTeeTimeCart(booking, state.courses, rateContext(state))));
 * useEffect(() => { if (staleGolf && booking) dispatch({ type: 'loadBooking', bookingId: booking.id }); }, …);
 * ```
 *
 * Two of four seats can never equal all four, so a split order was **stale by construction**: the
 * effect fired on mount and `loadBooking` rebuilt the whole party. Tapping Add on two rows and
 * opening the Register tab charged for four — **$196 where the operator had chosen $98**.
 *
 * It is fixed. The comparison is now built from `state.orderSeats`, so a split order is compared
 * against the seats it actually holds, and the effect dispatches `rebuildOrderSeats` rather than
 * `loadBooking` when there are seats. A split bill stays split and still reprices when the
 * reservation changes underneath it.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Frame | 402 × 797 (`mobile.frame`) |
 * | Chip | 36px tall, `radius.sm`, 16px glyph — the row's control strip, not a standalone target |
 * | ⋮ | 48px (`mobile.touchTarget`) |
 * | Reservation | `{ name: 'bookingDetail' }`, a **push**; the order is `{ name: 'order' }` on the Register destination, also a push |
 * | Order bar | `ViewOrderBar` is `null` at zero lines; the navigation bar badges Register with `orderLines` |
 * | Pinned action | `Check in & pay · {total}` on the reservation; **`Charge {total}`** on the order screen |
 * | This fixture | `openParty`, four players — two seats and the whole booking are different totals, which is what the split stories assert on |
 *
 * ## Scope
 *
 * Weston edition only, on the reservation's **Players** tab, on editable seats. `orderSeats` and
 * `selectedBookingId` live on the shared store, so a split built on the phone is the same state
 * the terminal's rail would render.
 *
 * None of the four Storybook toolbar globals change this screen.
 *
 * ## The stories
 *
 * | Story | Starting state | What it is for |
 * |---|---|---|
 * | **Add One Player** | `openParty` reservation | The booker pays for himself. Asserts the chip's label turns from an instruction into a statement of fact, and that only that seat's did |
 * | **Adding Two One At A Time** | same | Seats 1 and 3 on. Asserts all four chips afterwards: `[true, false, true, false]` |
 * | **The Order They Split** | `seatOrder(openParty(), [0, 2])`, opened on the Register destination | The regression test for the defect above. Asserts the two-seat total is **not** the whole booking's, and that **Charge** asks for the two-seat one |
 * | **Check In And Pay Tops Up** | one seat on the order | The pinned action still carries the whole booking's total; after pressing it the order asks for every seat |
 * | **Adjustments Survive The Top-Up** | `adjustedParty`, one seat on the order | The total is the *adjusted* booking's, and the test asserts it differs from the booking as booked, so it is a real claim |
 * | **Paid Seats Carry No Chip** | `partlyPaidNamed` | Exactly as many chips as there are seats still open, and fewer than there are seats |
 *
 * ## Still open
 *
 * - **A seat cannot be taken back off.** The chip only ever adds; tapping an on-the-order chip
 *   re-adds the same seat. Removing one means clearing the order.
 * - **The order screen does not say which seats it holds.** It shows the golf line and its
 *   players, so "two of four" is legible on the reservation and implied on the order — on a phone,
 *   where the two are different screens, that gap is wider than it is at the counter.
 * - **`rebuildOrderSeats` fires on a JSON comparison.** It works, and it is cheap at this size,
 *   but it is a string compare of two built carts on every render of the order screen.
 */
const meta = {
  title: 'Weston Edits/14 · Per-seat Cart/Mobile',
  ...mobileMeta,
  // Inline, not only via the spread: the docs plugin injects its own `parameters` key and
  // would overwrite a spread one, silently dropping `layout: fullscreen`.
  parameters: { ...mobileMeta.parameters },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── Play-test helpers ──────────────────────────────────────────────────────

/**
 * The cart chip on every editable row, in seat order.
 *
 * Matched on the tail of the label so a chip stays in the list after it flips: "Add … **to the
 * order**" and "… is **on the order**" are the same control in two states, and a query that
 * only found the first would silently renumber the rows mid-test.
 */
const chips = (c: ReturnType<typeof within>): HTMLElement[] => c.getAllByLabelText(/ the order$/);

const reservation = (b: ReturnType<typeof openParty>) => (
  <MobileStory
    edition="weston"
    initialState={at18(withBookings(b))}
    tab="tee"
    stack={[{ name: 'bookingDetail', bookingId: b.id }]}
  />
);

// ─── Adding seats ───────────────────────────────────────────────────────────

/**
 * **One player onto the order.** The party arrives; the booker pays for himself. Tapping the
 * cart chip on his row puts that seat — his holes, his rate, his ride, his own green-fee tax —
 * on the order and leaves the rest of the party untouched on the reservation.
 *
 * The play test checks the chip's label changes from an instruction to a statement of fact, and
 * that only that one seat's did. Nothing else on the screen moves: the reservation is still
 * open, and the counter is still looking at the group.
 */
export const AddOnePlayer: Story = {
  render: () => reservation(openParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const before = await c.findAllByLabelText(/ the order$/);
    await expect(before[0].getAttribute('aria-label')).toMatch(/^Add .* to the order$/);

    await userEvent.click(before[0]);

    await waitFor(() => expect(chips(c)[0].getAttribute('aria-label')).toMatch(/ is on the order$/));
    // The seat nobody added is untouched — the order is the sum of the seats on it.
    await expect(chips(c)[1].getAttribute('aria-label')).toMatch(/^Add .* to the order$/);
  },
};

/**
 * **Two of four, one at a time.** The real case: the booker and the player in seat 3 are paying
 * together, the other two are settling up later. Tapping both chips charges exactly those two —
 * the order is the sum of the seats on it, so the others' fees, carts and tax are simply absent
 * rather than discounted away.
 *
 * The play test adds seats 1 and 3 and checks all four chips afterwards: two on the order, two
 * still offering to be added.
 */
export const AddingTwoOneAtATime: Story = {
  render: () => reservation(openParty()),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const onOrder = () => chips(c).map((el) => /is on the order$/.test(el.getAttribute('aria-label') ?? ''));
    await userEvent.click((await c.findAllByLabelText(/ the order$/))[0]);
    await waitFor(() => expect(onOrder()[0]).toBe(true));
    await userEvent.click(chips(c)[2]);
    await waitFor(() => expect(onOrder()[2]).toBe(true));

    await expect(onOrder()).toEqual([true, false, true, false]);
  },
};

/**
 * **The order they split — and a defect it turns up.**
 *
 * Two seats are on the order; the other two are settling later. Opened on the Register
 * destination, this *should* charge those two and nobody else, exactly as the terminal's rail
 * does from the same reducer state.
 *
 * It does not. The Charge button asks for the **whole booking**, and the two seats the operator
 * chose are gone. The cause is in `screens/register/OrderScreen.tsx`: the Weston edition treats
 * the reservation as the source of truth for the golf and re-syncs the order whenever the two
 * disagree —
 *
 * ```ts
 * const staleGolf = weston && booking != null && state.cart.some((i) => i.isCheckIn) &&
 *   JSON.stringify(golfLines(state.cart)) !==
 *   JSON.stringify(golfLines(cartLogic.buildTeeTimeCart(booking, state.courses, rateContext(state))));
 * useEffect(() => { if (staleGolf && booking) dispatch({ type: 'loadBooking', bookingId: booking.id }); }, …);
 * ```
 *
 * The comparison is built from `state.orderSeats`, so a split order is compared against the
 * seats it actually holds. That is a fix, not the original design: built without them, two of
 * four seats could never equal all four, so the order was "stale" by construction — the effect
 * fired on mount and rebuilt the whole party. Tapping Add on two rows and opening the Register
 * tab charged for four.
 *
 * The re-sync itself is a good idea — it is what keeps "Edit reservation → back" honest. It
 * simply predated per-seat ordering. It now rebuilds *the same seats*, so a split bill stays
 * split while still repricing when the reservation changes underneath it.
 */
export const TheOrderTheySplit: Story = {
  render: () => (
    <MobileStory
      edition="weston"
      initialState={seatOrder(openParty(), [0, 2])}
      tab="register"
      stack={[{ name: 'order' }]}
    />
  ),
  play: async ({ canvasElement }) => {
    const b = openParty();
    const c = within(canvasElement);
    // Two seats is what the operator chose, and two is what the register charges.
    await expect(seatsTotal(b, [0, 2])).not.toBe(seatsTotal(b));
    await expect(await c.findByRole('button', { name: `Charge ${seatsTotal(b, [0, 2])}` })).toBeTruthy();
  },
};

// ─── Topping up ─────────────────────────────────────────────────────────────

/**
 * **Check in & pay tops the order up.** One seat is already rung up; the rest of the party
 * decides to settle together after all. The reservation's pinned action still reads **Check in
 * & pay** with the *whole booking's* total, because that is what it is about to charge —
 * pressing it clears the per-seat list, rebuilds the golf from the reservation, keeps anything
 * non-golf that was rung up, and opens the order on the Register destination.
 *
 * The play test starts from one seat, presses it, and checks the order's Charge button now asks
 * for every seat.
 */
export const CheckInAndPayTopsUp: Story = {
  render: () => {
    const b = openParty();
    return (
      <MobileStory
        edition="weston"
        initialState={seatOrder(b, [0])}
        tab="tee"
        stack={[{ name: 'bookingDetail', bookingId: b.id }]}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const b = openParty();
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Check in & pay/ }));
    await expect(await c.findByRole('button', { name: `Charge ${seatsTotal(b)}` })).toBeTruthy();
  },
};

/**
 * **What was done to a seat survives the top-up.** This is the party from section 2 — verified
 * customers linked onto two seats and so on the membership row, the last seat switched to the
 * other round length at the rate card's fee, the booker on a riding cart. One seat is rung up
 * on its own; then Check in & pay takes the rest.
 *
 * The total the order asks for is the *adjusted* booking's, not the booking as it was booked.
 * Nothing had to be re-entered, because per-seat ordering never moved the adjustments onto the
 * order in the first place — they belong to the reservation, and both routes into the cart read
 * them from there.
 */
export const AdjustmentsSurviveTheTopUp: Story = {
  render: () => {
    const b = adjustedParty();
    return (
      <MobileStory
        edition="weston"
        initialState={seatOrder(b, [1])}
        tab="tee"
        stack={[{ name: 'bookingDetail', bookingId: b.id }]}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const b = adjustedParty();
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole('button', { name: /^Check in & pay/ }));
    await expect(await c.findByRole('button', { name: `Charge ${seatsTotal(b)}` })).toBeTruthy();
    // The adjusted party is not the booking as booked — so this is a real assertion.
    await expect(seatsTotal(b)).not.toBe(seatsTotal(openParty()));
  },
};

// ─── Seats with nothing to charge ───────────────────────────────────────────

/**
 * **Paid seats carry no chip.** A party where the first two paid online. Their money has moved,
 * so there is nothing to put on an order and no control offered to try — the same rule that
 * locks their holes, fee and transport. Refunds live on the Financial tab.
 *
 * The play test checks there are exactly as many chips as there are seats still open.
 */
export const PaidSeatsCarryNoChip: Story = {
  render: () => reservation(partlyPaidNamed()),
  play: async ({ canvasElement }) => {
    const b = partlyPaidNamed();
    const open = b.playerStates.filter((p) => !p.paid && !p.noShow).length;
    const c = within(canvasElement);
    await waitFor(() => expect(chips(c).length).toBe(open));
    await expect(open).toBeLessThan(b.players);
  },
};
