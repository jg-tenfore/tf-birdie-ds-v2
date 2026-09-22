import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { MobileStory, mobileMeta } from '../../pos-mobile/mobile-helpers';
import { adjustedParty, at18, openParty, partlyPaidNamed, seatOrder, seatsTotal, withBookings } from '../mobile-scenarios';

/**
 * Weston Edits / 14 · Per-seat Cart / Mobile
 *
 * Weston, on the third call, describing how a group that splits the bill actually gets rung
 * up: *"you hit add to cart for each player, and then you hit save."*
 *
 * Until this round the reservation had one way into the order — **Check in & pay**, which takes
 * the whole booking. That is right for the common case and wrong for the one that ties up the
 * counter: a foursome where two are paying now, one is paying with the other's card, and the
 * fourth is still in the parking lot. So every editable player row carries a small cart chip
 * beside the ⋮, and the order is built a seat at a time.
 *
 * | | What it puts on the order |
 * |---|---|
 * | The cart chip on a row | That one seat — its holes, its rate, its ride, its tax |
 * | The chip on a second row | Both seats, on the same order |
 * | **Check in & pay** | The whole booking, topping up whatever is already there |
 *
 * It is the same reducer as the terminal's (`addSeatToOrder`), which is what makes the two
 * surfaces agree, and the same three guarantees hold here:
 *
 * - **Adding a seat never rebuilds the order.** Adding to the booking already on the order
 *   keeps the retail and F&B lines and adds the seat's golf; adding a seat from a *different*
 *   booking starts a fresh order, because two parties on one order is a receipt nobody can read.
 * - **Check in & pay tops up rather than replaces.** It clears `orderSeats` — the order is now
 *   the whole booking — and rebuilds the golf from the reservation, so seats added one at a
 *   time keep every adjustment made to them. The adjustments live on the booking, not on the
 *   order, which is what makes that true rather than lucky.
 * - **Paid and no-show seats carry no chip at all.** There is nothing left to charge them for.
 *
 * The first of those three holds on the reservation and breaks on the order screen: see **The
 * Order They Split** below, which documents a live defect — the Weston edition's golf re-sync
 * rebuilds a per-seat order into the whole booking the moment the order is opened.
 *
 * **What the phone does differently, and why 13 · Order Rail has no Mobile half.** The
 * terminal's third guarantee is that adding anything **re-expands the collapsed order rail** —
 * an order you cannot see is one nobody checks before charging it. The phone has no rail to
 * re-expand and nothing to collapse: the order is a screen on the Register destination, and
 * `ViewOrderBar` (`screens/register/parts.tsx`) simply **returns null while the cart is
 * empty**, so the space Weston wanted back on the tee sheet was never spent in the first place.
 * The same promise is kept by different means — a badge on the Register destination in the
 * navigation bar counts what is waiting, and the order is one tap from anywhere.
 *
 * The other difference is the feedback on the row itself. The terminal prints **In order** next
 * to the name; at 402 that text would cost a control's worth of width, so the chip carries the
 * state instead — a filled cart glyph, a primary-tinted fill, and a label that flips from "Add
 * Rogers, X. to the order" to "Rogers, X. is on the order". The play tests below assert on that
 * label, because it is both the accessible name and the thing a screen reader announces. (The
 * terminal's chip also carries `aria-pressed`; the phone's `ControlChip` does not, so the label
 * is the whole of the programmatic signal. It says the right thing, but a toggle that reads as
 * a plain button is worth a second look.)
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
