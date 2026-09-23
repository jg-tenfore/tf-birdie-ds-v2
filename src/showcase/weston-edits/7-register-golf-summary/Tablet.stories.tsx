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
 *
 * ## The component
 *
 * `src/pos/components/RegisterGolfSummary.tsx`. `LeftPanel` renders it in place of
 * `TeeTimeSummaryCard` when the edition is Weston **and** the order has a booking attached,
 * and suppresses the per-player `CheckInLines` underneath — so golf appears exactly once, as
 * the summary. Retail and F&B lines below it are untouched.
 *
 * | Prop / read | Value | What it does |
 * |---|---|---|
 * | `booking` | `selectedBooking(state)` | The conf code, the course, the member dot, the group note |
 * | `lines` | `state.cart.filter(i => i.isCheckIn)` | Every seat on the order — **the cart, not the booking**, so the summary cannot disagree with Pay |
 * | per-seat money | `cart.playerBreakdown(unitPrice, player)` | Fee + transport − discount for that seat |
 * | `total` | `Σ cart.playerPrice(unit, p)` | The `Golf $x` / `Golf paid` read-out at the bottom right |
 * | **Edit reservation** | `dispatch({ type: 'openReservation', bookingId })` | Reopens the panel over the register, on this booking |
 *
 * Because `lines` is the cart, a **split order** (section 14 · per-seat Add) summarises only
 * the seats that were added — the summary is a view of the bill, not a roster of the party.
 *
 * ## Specs
 *
 * | | |
 * |---|---|
 * | Container | `md3.surfaceContainer`, `radius.md`, a **3px left border in `md3.primary`**, `11px 12px`, `data-golf-summary` |
 * | Header | `{round name} · {conf}` in `md3.primary`, with a `golf_course` glyph |
 * | Second line | `schedule` glyph, the tee-time label, then `· {course name}` |
 * | Seat row | member dot · name · `{holes}H` · transport glyph (`TRANSPORT_META`) · amount, right-aligned in a 64px column |
 * | Settled seat | a `payBadges` pill — **PAID** or **NO SHOW**; a no-show row drops to `opacity: 0.6` |
 * | Footer | **Edit reservation** — a 1.5px `md3.primary` outline pill, `edit` glyph — and `Golf $x`, or `Golf paid` at zero |
 * | Group note | `b.note` printed beneath with a `sticky_note_2` glyph, when there is one |
 * | Tax | `orderTotals`: `golfTax` from the booking's `Taxes` line, `salesTax` at `TAX_RATE` (**8%**) on everything else |
 * | Round label | `roundLabel(b)` — `Tee Time 9 holes`, `Tee Time 9/18 holes` for a mixed party, `Member Check-in` |
 *
 * ## Scope
 *
 * The summary is **Weston edition only**, and only for an order that came from a booking: a
 * rate rung up at the counter with no reservation behind it still gets the editable check-in
 * lines. The `orderTotals` change underneath it is **all editions** — see 8 · Bug Fixes.
 *
 * ## The stories
 *
 * | Story | Order | What it is for |
 * |---|---|---|
 * | **AdjustedParty** | `registerWith(adjustedParty())` | A mixed 9/18 party: per-player charges, one total, nothing editable |
 * | **WithRetail** | `openParty()` + a sleeve and two waters | Retail keeps its ordinary lines and steppers beneath the summary |
 * | **PaidBooking** | `registerWith(paidTwilight())` | Every seat **PAID** and the read-out **Golf paid** |
 * | **EditReservation** | `registerWith(adjustedParty())` | Asserts no "+ modifier" anywhere, clicks **Edit reservation**, and checks the panel reopens on the booking with **Update order** in its footer |
 * | **RetailIsTaxed** | `openParty()` + $21 of retail | Reads the Tax and Pay rows against `orderTotals` — golf tax + 8% of the retail |
 * | **WalkInOrder** | A `planWalkIn` walk-in, checked in, its cart built | A walk-in gets the same summary as any booking: the `W-` code, Edit reservation, no "+ modifier", no "Guest Details" |
 *
 * ## Still open
 *
 * **Edit reservation is the only way back into the golf.** That is the point, but it means a
 * one-seat correction at the counter — "actually he's walking" — costs a panel open, an edit,
 * and a return through Check in & pay. Nobody has asked for an in-place override yet; if one is
 * wanted, it has to write to the reservation, not to the cart line, or the two diverge again.
 *
 * **A discount's reason does not reach this card.** Round 3's per-seat discounts carry a reason
 * onto the player row (section 12), and a punch card names itself there; this summary prints
 * only the resulting amount, so a seat that is cheap on the order does not say why. The phone's
 * order summary has the same gap — it breaks the amount into `Tee fee` and `cart`, not into a
 * reason. That is worth closing on both, since the register is where an owner asks the question.
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
