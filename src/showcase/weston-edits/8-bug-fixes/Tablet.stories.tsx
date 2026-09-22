import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { venue } from '../../../pos/data/venues';
import { buildTeeTimeCart, money, orderTotals } from '../../../pos/logic/cart';
import type { CartItem } from '../../../pos/types';
import { Screen } from '../../pos/screen-helpers';
import { openParty, paidTwilight, registerWith, twilightNine } from '../tablet-scenarios';

/**
 * Weston Edits / 8 · Bug Fixes / Tablet
 *
 * Five bugs the Loom caught in the register, fixed in **every** edition — these stories
 * render the base POS (the one the three published prototypes run) to show it. Each JSDoc
 * says what was wrong and why. The pure-function versions are asserted in
 * `src/pos/logic/tee-time-cart.test.ts`.
 *
 * Two follow-ups, also every edition: **one tax calculation** (`orderTotals`, asserted in
 * `order-totals.test.ts`) that the register, checkout and the reader all charge; and
 * **corrected demo data** — `R-` reservations the seed marked walk-in are `booked`, so a
 * reservation reads "Reserved" and a true walk-in (`W-`) reads "Walk-in".
 */
const meta = {
  title: 'Weston Edits/8 · Bug Fixes/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/**
 * **Bug 3 · A reserved tee time labelled "Walk-in".** The round line was named from the
 * booking's *status* (`Walk-in 9 holes` for any `walkin` booking — the seed slate marked the
 * twilight nines that way even though they carry an `R-` reservation; the generator now
 * corrects that at the source, see `WalkInLabelFromCorrectedData`) and its holes came from
 * looking the course up in the three-nines `COURSES`, which has no 18-hole course: at this
 * club it found nothing, read 9 holes, and left the course name blank on the card.
 *
 * Now the line names the round — `Tee Time 9 holes` (or `18`, or `9/18` for a mixed party),
 * `Member Check-in` for members — with holes read per player off the booking, and the
 * course resolved from the club's own courses. The card says "Reserved · 9 holes".
 */
export const ReservedNotWalkIn: Story = {
  render: () => <Screen edition="base" initialState={registerWith(twilightNine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/^Tee Time 9 holes$/i).length).toBeGreaterThan(0);
    await expect(canvas.queryByText(/Walk-in 9 holes/i)).toBeNull();
    await expect(canvas.getByText(/Championship · Front 9/)).toBeTruthy();
  },
};

/** Bug 3, the 18-hole side: an 18-hole booking at this club reads 18, not 9. */
export const EighteenReadsEighteen: Story = {
  render: () => <Screen edition="base" initialState={registerWith(openParty())} />,
};

/**
 * **Bug 4 · The register charged a different price than the booking.** In the Loom, Details
 * and Financial said $29.00 a player; the cart said $59.00/ea less a −$3 Twilight discount,
 * and the Modifiers dialog offered "Twilight overrides to $29". The cart was priced from a
 * status table (`TEE_PRICES.walkin.basePrice` = $59) and then took a time-of-day discount on
 * top — neither of which is the rate the golfer booked.
 *
 * Now each seat is priced at the booking's own rate (per player, when adjusted), with no
 * discount stacked on it. The demo prices now follow the rate card too, so this twilight
 * nine is the card's $26.00/ea, $52 for the pair, plus tax.
 */
export const PriceMatchesBooking: Story = {
  render: () => <Screen edition="base" initialState={registerWith(twilightNine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(`${money(twilightNine().price)}/ea`).length).toBe(twilightNine().players);
    await expect(canvas.queryByText(/TWILIGHT DISCOUNT/i)).toBeNull();
  },
};

/**
 * **Bug 5 · A paid booking asked to be paid again.** Morris, G. — 2 paid, $0 outstanding —
 * loaded with "Pay $117.00", because the cart ignored each player's `paid` flag. Paid (and
 * no-show) seats now come across marked **Paid** at $0 with no tax, and the Pay button reads
 * "Paid in full · nothing due". Taking a payment now also marks the booking's seats paid, so
 * reloading it can't ask twice.
 */
export const PaidBookingNothingDue: Story = {
  render: () => <Screen edition="base" initialState={registerWith(paidTwilight())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Paid in full · nothing due')).toBeTruthy();
    await expect(canvas.queryByRole('button', { name: /^Pay \$/ })).toBeNull();
  },
};

/**
 * **Bug 6 · Tax with nothing to tax.** Removing the round left its hidden tax row behind:
 * Subtotal $0.00, Tax $5.00, "Pay $5.00". Removing a round now removes the tax rows that hang
 * off it, and totals ignore a stray tax row with nothing chargeable beside it. The play test
 * removes the round and checks the tax is gone.
 *
 * **Bug 7 · The booking stuck to an empty order.** After that, back on the tee sheet the
 * link still read `booking=p43` and the cart still charged $5. An order with no round left
 * no longer belongs to the booking: `selectedBookingId` clears, and the tee-time card goes.
 */
export const RemovingTheRoundClearsTaxAndBooking: Story = {
  render: () => <Screen edition="base" initialState={registerWith(twilightNine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTitle('Remove round'));
    await waitFor(() => expect(canvas.getByText('No items added yet')).toBeTruthy());
    const tax = canvas.getByText('Tax').nextElementSibling as HTMLElement;
    await expect(tax.textContent).toBe('$0.00');
    await expect(canvas.queryByText(new RegExp(`Tee Time · ${twilightNine().conf}`))).toBeNull();
    await expect(canvas.queryByRole('button', { name: /^Pay \$[1-9]/ })).toBeNull();
  },
};

/**
 * The same four fixes in the Weston edition, where the golf is a summary: the booking's rate a seat,
 * "Tee Time 9 holes", tax only on what's owed.
 */
export const InWestonEdition: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(twilightNine())} />,
};

const RETAIL: CartItem[] = [
  { name: 'Golf Polo Brand', price: 65, qty: 1 },
  { name: 'Water', price: 2.5, qty: 2 },
];
const withRetail = () => {
  const s = registerWith(openParty());
  return { ...s, cart: [...(s.cart ?? []), ...RETAIL] };
};
/** The amount the card reader dialog shows, once it's open. */
async function readerAmount(): Promise<string> {
  // Dialogs portal to the body, outside the canvas.
  const tap = await screen.findByRole('button', { name: 'Simulate tap' });
  const reader = within(tap.closest<HTMLElement>('[role="dialog"]')!);
  return (await reader.findByText(/^\$[\d,]+\.\d\d$/)).textContent ?? '';
}
const expectedTotal = () => orderTotals([...buildTeeTimeCart(openParty(), venue('eighteen').courses), ...RETAIL]);

/**
 * **Tax: one calculation, everywhere.** A tee-time order with retail on it. Before, the
 * register taxed only the golf (the booking's tax line short-circuited sales tax, so the
 * $70 of retail went untaxed), checkout added the golf tax *twice* (once inside the goods,
 * once as tax), and the card reader charged goods + a flat 8% of everything, tax line
 * included — three different amounts for one order. Now all three read `orderTotals`: golf
 * by its tax line, retail at the sales-tax rate. The play test checks the register's Pay,
 * the checkout Total and the reader's amount are the same number.
 */
export const TaxConsistency: Story = {
  render: () => <Screen edition="base" initialState={withRetail()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const t = expectedTotal();
    await expect(t.salesTax).toBeGreaterThan(0);
    await userEvent.click(canvas.getByRole('button', { name: `Pay ${money(t.total)}` }));
    const dialog = await screen.findByRole('dialog');
    const total = within(dialog).getByText('Total').nextElementSibling as HTMLElement;
    await expect(total.textContent).toBe(money(t.total));
    await userEvent.click(within(dialog).getByText('card'));
    await expect(await readerAmount()).toBe(money(t.total));
  },
};

/**
 * The same order with a **$5.00 tip** keyed in at checkout and recalculated: the reader
 * charges the checkout total — tip included — not a separately computed amount.
 */
export const ReaderChargesCheckoutTotalWithTip: Story = {
  render: () => <Screen edition="base" initialState={{ ...withRetail(), modal: { kind: 'checkout' } }} />,
  play: async () => {
    const dialog = await screen.findByRole('dialog');
    const d = within(dialog);
    await userEvent.click(d.getByText('Tip'));
    for (const k of ['5', '0', '0']) await userEvent.click(d.getByRole('button', { name: k }));
    await userEvent.click(d.getByText('Recalculate'));
    const withTip = money(expectedTotal().total + 5);
    await waitFor(() => expect((d.getByText('Total').nextElementSibling as HTMLElement).textContent).toBe(withTip));
    await userEvent.click(d.getByText('card'));
    await expect(await readerAmount()).toBe(withTip);
  },
};

/**
 * **Walk-in label from corrected data.** The Loom's twilight nine carries an `R-`
 * reservation code; the seed slate marked it `walkin`, which is what made the register call
 * it a walk-in. The generator now reads an `R-` code as a reservation (`statusForConf` in
 * `data/bookings.ts`), so the base register's tee-time card says **Reserved · 9 holes** —
 * from the data, not from a label that ignores the status.
 */
export const WalkInLabelFromCorrectedData: Story = {
  render: () => <Screen edition="base" initialState={registerWith(twilightNine())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(twilightNine().status).toBe('booked');
    await expect(canvas.getByText('Reserved · 9 holes')).toBeTruthy();
  },
};

/** A true walk-in — a `W-` code, as the counter writes one — still reads **Walk-in**. */
export const TrueWalkInReadsWalkIn: Story = {
  render: () => {
    const b = { ...twilightNine(), status: 'walkin' as const, conf: 'W-0001' };
    return <Screen edition="base" initialState={registerWith(b)} />;
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Walk-in · 9 holes')).toBeTruthy();
  },
};
