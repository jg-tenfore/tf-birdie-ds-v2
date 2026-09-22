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
 * Weston, on the third call, describing how a group that splits the bill actually gets rung
 * up: *"you hit add to cart for each player, and then you hit save."*
 *
 * Until this round the reservation had one way into the order — **Check in & pay**, which
 * takes the whole booking. That is right for the common case and wrong for the one that ties
 * up the counter: a foursome where two are paying now, one is paying with the other's card,
 * and the fourth is still in the parking lot. So every editable player row now carries a small
 * **Add** beside the name, and the order is built a seat at a time.
 *
 * | | What it puts on the order |
 * |---|---|
 * | **Add** on a row | That one seat — its holes, its rate, its ride, its tax |
 * | **Add** on a second row | Both seats, on the same order |
 * | **Check in & pay** | The whole booking, topping up whatever is already there |
 *
 * Three things make it safe to use mid-shift:
 *
 * - **Adding a seat never rebuilds the order.** Adding to the booking already on the order
 *   keeps the retail and F&B lines and adds the seat's golf (`addSeatToOrder`); adding a seat
 *   from a *different* booking starts a fresh order, because two parties on one order is a
 *   receipt nobody can read.
 * - **Check in & pay tops up rather than replaces.** It clears `orderSeats` — the order is now
 *   the whole booking — and rebuilds the golf from the reservation, so seats added one at a
 *   time keep every adjustment made to them. The adjustments live on the booking, not on the
 *   order, which is what makes that true rather than lucky.
 * - **The rail comes back on its own.** Adding anything expands the collapsed order rail. An
 *   order you cannot see is one nobody checks before charging it.
 *
 * A row that has been added reads **In order** with a full cart glyph (`aria-pressed`), so the
 * panel says who is already on the bill without looking away at the rail. Paid and no-show
 * seats carry no Add at all — there is nothing to charge.
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
