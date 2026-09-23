import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { playerName } from '../../../pos/logic/reservation';
import { Screen } from '../../pos/screen-helpers';
import {
  adjustedParty,
  openParty,
  seatsTotal,
  sheetWithPanel,
  sheetWithSeatOrder,
} from '../tablet-scenarios';

/**
 * Weston Edits / 14 · Per-seat Cart / Tablet
 *
 * Weston, on the third call, describing how a group that splits the bill actually gets rung up:
 * *"you hit add to cart for each player, and then you hit save."*
 *
 * Until this round the reservation had one way into the order — **Check in & pay**, which takes
 * the whole booking. That is right for the common case and wrong for the one that ties up the
 * counter: a foursome where two are paying now, one is paying with the other's card, and the
 * fourth is still in the parking lot. So every editable player row carries a small **Add** beside
 * the name, and the order is built a seat at a time.
 *
 * ## The component
 *
 * The chip lives on the player row in `src/pos/components/PlayerRows.tsx`; everything it does
 * happens in the reducer in `src/pos/state/pos-store.ts`.
 *
 * | | Label | `aria-label` | `aria-pressed` | Glyph |
 * |---|---|---|---|---|
 * | Not yet added | **Add** | `Add {name} to the order` | `false` | `add_shopping_cart` |
 * | Already on it | **In order** | same | `true` | `shopping_cart`, on `md3.primaryContainer` |
 *
 * Paid and no-show seats carry no chip at all — there is nothing to charge, and that is the same
 * rule that locks their holes, fee and transport.
 *
 * | State | Type | Default | What it does |
 * |---|---|---|---|
 * | `orderSeats` | `number[] \| null` | `null` | Which seats of `selectedBookingId` the order holds. **`null` means the whole booking** — that is what Check in & pay leaves behind |
 * | `selectedBookingId` | `string \| null` | `null` | Whose order this is. A chip on a *different* booking starts a fresh order |
 *
 * Three reducer cases carry the behaviour:
 *
 * | Action | What it does |
 * |---|---|
 * | `addSeatToOrder` | Unions the seat into `orderSeats`, rebuilds the golf from `buildTeeTimeCart(b, courses, rates, seats)`, **keeps** the non-golf lines when it is the same booking, drops them when it is not, and sets `leftPanelCollapsed: false` |
 * | `loadBooking` (Check in & pay) | Sets `orderSeats: null`, rebuilds the golf for the whole booking, keeps the non-golf lines, closes the panel and lands in the register |
 * | `rebuildOrderSeats` | Reprices **the seats the order already holds** after the reservation changed under it. Deliberately not `loadBooking`, which would undo a split — but nothing on the tablet dispatches it yet (see Still open) |
 *
 * ## What each route puts on the order
 *
 * | | Result |
 * |---|---|
 * | **Add** on a row | That one seat — its holes, its rate, its ride, its own green-fee tax |
 * | **Add** on a second row | Both seats, on the same order |
 * | **Add** on a row of another booking | A fresh order for that booking. Two parties on one order is a receipt nobody can read |
 * | **Check in & pay** | The whole booking, **topping up** whatever is already there |
 *
 * Three things make it safe to use mid-shift:
 *
 * - **Adding a seat never rebuilds the order.** The retail and F&B lines survive
 *   (`!isCheckIn && !isTax && name !== 'Taxes'`); only the golf is rebuilt.
 * - **Check in & pay tops up rather than replaces.** Seats added one at a time keep every
 *   adjustment made to them, because the adjustments live on the **booking** and both routes into
 *   the cart read them from there. That is what makes it true rather than lucky.
 * - **The rail comes back on its own.** `addSeatToOrder` expands the collapsed rail (13 · Order
 *   Rail). An order you cannot see is one nobody checks before charging it.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Chip glyph | 13px, `md3.primary` on `md3.primaryContainer` when pressed |
 * | Order rail | 320px expanded, 56px collapsed; adding anything expands it |
 * | Footer label | `Check in & pay · {total}` → **`Update order · {total}`** once the booking is on the order → `Open in register` when it is fully settled |
 * | Tax | Per seat. `buildTeeTimeCart` sums each chargeable seat's tax into one `Taxes` line, so two seats carry two seats' tax |
 * | This fixture | `openParty`, three players: one seat **$49.00**, the whole booking **$147.00** |
 *
 * ## Scope
 *
 * Weston edition only, on the reservation panel's **Players** tab, on editable seats. The phone
 * has the same reducer behind a cart chip on its player row — see the **Mobile** half, which also
 * records the defect this feature turned up there.
 *
 * None of the four Storybook toolbar globals change what this section is about, though **Panel
 * width** and **Row density** both change how much of the party you can see while doing it.
 *
 * ## The stories
 *
 * | Story | Starting state | What it is for |
 * |---|---|---|
 * | **Add One Player** | `sheetWithPanel(openParty())` | The booker pays for himself. Asserts three things at once: the row flips to **In order**, the collapsed rail expands, and Pay asks for **that seat's** money |
 * | **Adding Two One At A Time** | same | Seats 1 and 3 on, seat 2 off. Asserts the untouched seat is still `aria-pressed="false"` |
 * | **Splitting The Bill** | `sheetWithSeatOrder(openParty(), [0, 2])` | The same state at rest — the panel and the rail agreeing about who is on the bill |
 * | **The Rail Comes Back** | rail collapsed | Asserts the 56px strip is there before the Add and gone after it |
 * | **Check In And Pay Tops Up** | one seat on the order | The footer reads **Update order** with the *whole* booking's total; after pressing it the register asks for all three seats and the panel has closed |
 * | **Adjustments Survive The Top-Up** | `adjustedParty`, seat 3 on the order | A typed $25 on the booker, a member linked onto seat 2, seat 3 switched to 18 and walking. The register asks for the *adjusted* total, with nothing re-entered |
 *
 * ## Still open
 *
 * - **Nothing on the tablet reprices a split order.** `rebuildOrderSeats` exists and does
 *   exactly the right thing, but only the phone's order screen dispatches it. Edit a seat that is
 *   already on the order and the rail keeps the price it was added at until Check in & pay rebuilds
 *   everything. See 6 · Check In & Pay.
 * - **A seat cannot be taken back off.** The chip is a one-way toggle: pressing an **In order**
 *   chip does nothing. Removing a seat means clearing the order and re-adding the others.
 * - **The order has no per-seat labelling.** The rail shows the golf line with its players, not
 *   "these two of four", so the split is legible on the reservation and merely implied on the
 *   order.
 */
const meta = {
  title: 'Weston Edits/14 · Per-seat Cart/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Seat `i`'s row, scoped for queries. */
const row = (canvasElement: HTMLElement, i: number) =>
  within(canvasElement.querySelector<HTMLElement>(`[data-player-row="${i}"]`)!);

/**
 * **One player onto the order.** The party arrives; the booker pays for himself. The play test
 * presses **Add** on his row and checks three things at once: the row flips to **In order**,
 * the collapsed rail expands, and the rail's Pay button asks for *that seat's* money — green
 * fee, his ride and his own green-fee tax — not the party's.
 */
export const AddOnePlayer: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const b = openParty();
    const seat0 = row(canvasElement, 0);
    const add = seat0.getByRole('button', { name: `Add ${playerName(b, 0)} to the order` });
    await expect(add).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(add);
    await waitFor(() => expect(seat0.getByText('In order')).toBeTruthy());
    await expect(
      seat0.getByRole('button', { name: `Add ${playerName(b, 0)} to the order` }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b, [0])}` })).toBeTruthy();
  },
};

/**
 * **Two of three, one at a time.** The real case: the booker and the player in seat 3 are
 * paying together, seat 2 is settling up later. Pressing Add on both rows charges exactly
 * those two — the order is the sum of the seats on it, so the third seat's fee, cart and tax
 * are simply absent rather than discounted away.
 */
export const AddingTwoOneAtATime: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const b = openParty();
    await userEvent.click(
      row(canvasElement, 0).getByRole('button', { name: `Add ${playerName(b, 0)} to the order` }),
    );
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b, [0])}` })).toBeTruthy());
    await userEvent.click(
      row(canvasElement, 2).getByRole('button', { name: `Add ${playerName(b, 2)} to the order` }),
    );
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b, [0, 2])}` })).toBeTruthy(),
    );
    // The seat nobody added is still un-pressed — and still unpaid on the sheet.
    await expect(
      row(canvasElement, 1).getByRole('button', { name: `Add ${playerName(b, 1)} to the order` }),
    ).toHaveAttribute('aria-pressed', 'false');
  },
};

/**
 * The same state, described rather than clicked: two seats on the order, the rail open beside
 * the reservation, and the two rows showing **In order**. This is what the counter looks at
 * while the third player is still deciding — the panel and the order rail agreeing about who
 * is on the bill.
 */
export const SplittingTheBill: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithSeatOrder(openParty(), [0, 2])} />,
};

/**
 * **The rail comes back.** Weston wanted the tee sheet to get its space back when the order is
 * empty, and the rail collapses to a 56px strip to give it to him. But the moment something
 * lands in the order the rail re-expands on its own: the counter is about to charge somebody,
 * and the lines being charged have to be on screen to be checked.
 *
 * The play test asserts the collapsed strip is there before the Add and gone after it.
 */
export const TheRailComesBack: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(openParty())} />,
  play: async ({ canvasElement }) => {
    const b = openParty();
    await expect(canvasElement.querySelector('[data-order-rail="collapsed"]')).toBeTruthy();
    await userEvent.click(
      row(canvasElement, 1).getByRole('button', { name: `Add ${playerName(b, 1)} to the order` }),
    );
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-order-rail="collapsed"]')).toBeNull(),
    );
  },
};

/**
 * **Check in & pay tops the order up.** With a seat already on the order the footer's action
 * reads **Update order** and carries the *whole* booking's total, because that is what it is
 * about to charge. Pressing it clears the per-seat list, rebuilds the golf from the
 * reservation, keeps anything non-golf that was rung up, and lands in the register.
 *
 * The play test starts from one seat, presses it, and checks the register's Pay button asks
 * for all three seats.
 */
export const CheckInAndPayTopsUp: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithSeatOrder(openParty(), [0])} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const b = openParty();
    await expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b, [0])}` })).toBeTruthy();
    await userEvent.click(await canvas.findByRole('button', { name: `Update order · ${seatsTotal(b)}` }));
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b)}` })).toBeTruthy());
    // The panel closed behind it: Check in & pay ends on the register, as it always has.
    await expect(canvas.queryByRole('complementary')).toBeNull();
  },
};

/**
 * **What was done to a seat survives the top-up.** This is the party from section 2 — a member
 * linked onto seat 2 and so on the membership row, seat 3 switched to 18 and riding, the
 * booker on a typed-in $25. One seat is rung up on its own; then Check in & pay takes the rest.
 *
 * The total the register asks for is the *adjusted* booking's, not the booking as it was
 * booked. Nothing had to be re-entered, because per-seat ordering never moved the adjustments
 * onto the order in the first place — they belong to the reservation, and both routes into the
 * cart read them from there.
 */
export const AdjustmentsSurviveTheTopUp: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithSeatOrder(adjustedParty(), [2])} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const b = adjustedParty();
    await expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b, [2])}` })).toBeTruthy();
    await userEvent.click(await canvas.findByRole('button', { name: `Update order · ${seatsTotal(b)}` }));
    await waitFor(() => expect(canvas.getByRole('button', { name: `Pay ${seatsTotal(b)}` })).toBeTruthy());
  },
};
