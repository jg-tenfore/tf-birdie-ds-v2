import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { ROUND_STEP } from '../../../pos/data/config';
import { venue, venueBookings } from '../../../pos/data/venues';
import { buildTeeTimeCart, money, orderTotals, salesTax } from '../../../pos/logic/cart';
import { planWalkIn } from '../../../pos/logic/walk-in';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { adjustedParty, openParty, paidTwilight, registerWith } from '../tablet-scenarios';

/**
 * Weston Edits / 7 · Register Golf Summary / Tablet
 *
 * In the recording, "+ modifier" and "Guest Details" dominated each golf line before the golf
 * was confirmed, and "I click modifier, which — modifiers are used for food and beverage, so
 * that doesn't make sense. You're changing the rate here, it's just kind of confusing."
 *
 * Once a reservation is checked in, the register shows its golf as a **read-only summary** —
 * each player's holes, transport and charge, the tee time and course — with **Edit
 * reservation** to go back to the panel. There is no "+ modifier" or "Guest Details" on
 * golf; modifiers stay for food, beverage and retail. The summary reads the cart lines, so
 * it always agrees with Subtotal, Tax and Pay beneath it.
 *
 * Tax beneath it is the one order calculation (`orderTotals`): the golf by its booking's tax
 * line, **retail and F&B at the sales-tax rate** — including on a tee-time order, where
 * retail used to go untaxed. A walk-in reaches the register the same way as any booking
 * (through its reservation), so it gets the same summary.
 */
const meta = {
  title: 'Weston Edits/7 · Register Golf Summary/Tablet',
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'counterTerminal', isRotated: false } },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** An adjusted party checked in: a mixed 9/18 round, per-player charges, one total. */
export const AdjustedParty: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(adjustedParty())} />,
};

/** The same order with retail rung up after the golf — retail keeps its normal lines. */
export const WithRetail: Story = {
  render: () => {
    const s = registerWith(openParty());
    return (
      <Screen
        edition="weston"
        initialState={{ ...s, cart: [...(s.cart ?? []), { name: 'Titleist Pro V1 Sleeve', price: 16, qty: 1 }, { name: 'Water', price: 2.5, qty: 2 }] }}
      />
    );
  },
};

/** A paid booking in the register: every seat PAID, "Golf paid", and nothing due. */
export const PaidBooking: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(paidTwilight())} />,
};

/**
 * **Edit reservation** reopens the panel over the register, on the same booking. The play
 * test clicks it and checks the panel opened.
 */
export const EditReservation: Story = {
  render: () => <Screen edition="weston" initialState={registerWith(adjustedParty())} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('+ modifier')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: /Edit reservation/ }));
    await canvas.findByRole('complementary', { name: `Reservation · ${adjustedParty().name}` });
    await canvas.findByRole('button', { name: /^Update order/ });
  },
};

const RETAIL: CartItem[] = [
  { name: 'Titleist Pro V1 Sleeve', price: 16, qty: 1 },
  { name: 'Water', price: 2.5, qty: 2 },
];

/**
 * **Retail on a tee-time order is taxed.** The golf keeps its booking's tax line; the $21 of
 * retail adds sales tax on top, so Tax = golf tax + 8% of the retail, and Pay is the
 * checkout total. The play test reads the Tax and Pay rows.
 */
export const RetailIsTaxed: Story = {
  render: () => {
    const s = registerWith(openParty());
    return <Screen edition="weston" initialState={{ ...s, cart: [...(s.cart ?? []), ...RETAIL] }} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cart = [...buildTeeTimeCart(openParty(), venue('eighteen').courses), ...RETAIL];
    const t = orderTotals(cart);
    await expect(t.salesTax).toBe(salesTax(21));
    const tax = canvas.getByText('Tax').nextElementSibling as HTMLElement;
    await expect(tax.textContent).toBe(money(t.golfTax + t.salesTax));
    await expect(canvas.getByRole('button', { name: `Pay ${money(t.total)}` })).toBeTruthy();
  },
};

/**
 * **A walk-in in the register** — as its reservation's Check in & pay leaves it: the golf
 * summary with the walk-in's `W-` code, Edit reservation, and no "+ modifier" or "Guest
 * Details" anywhere on the golf.
 */
export const WalkInOrder: Story = {
  render: () => {
    const base = atVenue('eighteen');
    const w = planWalkIn({ bookings: base.bookings ?? venueBookings('eighteen'), courses: venue('eighteen').courses })!;
    const checkedIn = { ...w, playerStates: w.playerStates.map((p) => ({ ...p, step: ROUND_STEP.checkedIn })) };
    return (
      <Screen
        edition="weston"
        initialState={atVenue('eighteen', {
          bookings: [...(base.bookings ?? []), checkedIn],
          view: 'pos',
          leftPanelCollapsed: false,
          selectedBookingId: w.id,
          cart: buildTeeTimeCart(checkedIn, venue('eighteen').courses),
        })}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/W-0001/).length).toBeGreaterThan(0);
    await expect(canvas.queryByText('+ modifier')).toBeNull();
    await expect(canvas.queryByText('Guest Details')).toBeNull();
  },
};
