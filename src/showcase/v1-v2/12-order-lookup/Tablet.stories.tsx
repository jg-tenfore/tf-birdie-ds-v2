import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { SEED_ORDERS } from '../../../pos/data/orders-seed';
import { venue } from '../../../pos/data/venues';
import { orderFromBooking } from '../../../pos/logic/booking-orders';
import { money } from '../../../pos/logic/cart';
import { refundAmount } from '../../../pos/logic/orders';
import { orderNumber } from '../../../pos/logic/reservation';
import { createInitialState, reducer } from '../../../pos/state/pos-store';
import { Screen, atVenue } from '../../pos/screen-helpers';
import { paidTwilight, sheetWithPanel } from '../../weston-edits/tablet-scenarios';

/**
 * V1 → V2 Migration / 12 · Order Lookup / Tablet
 *
 * **Find a paid order, see what was in it, and refund it.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/order-lookup.tsx`, from `references/072926/12-orderlookup/`: a
 * course and a date on the left; on the right three identical boxes — order ID, payment ID,
 * product. Nothing ran until SEARCH, and the reference stops there: no order, no refund.
 *
 * ## What was wrong with it
 *
 * Three boxes stacked in a column read as AND and behaved as OR, and nothing said which. Nothing
 * happened as you typed, so every guess was a round trip through SEARCH and BACK. And a lookup that
 * cannot refund is not what anyone opens it for — Weston's words about the reservation's order
 * number were *"a way for them to easily go to that order and refund."*
 *
 * ## What this does
 *
 * - **One box, live**, matched against the order number, payment and refund ids, products, the
 *   name on the order and a card's last four. The day, or every day.
 * - **The whole order** — lines, totals, tenders, who took it, and every refund already made.
 * - **Refund** the whole order or chosen lines and quantities, with the tax share shown, **back to
 *   the original tender**. The refund is a negative payment in Orders & Tips, and refunded stock goes
 *   back on the shelf.
 * - **The reservation's order number lands here**, with a way back to the reservation. A tee time
 *   paid before the session has a number but no rung-up order; it resolves to one built from the
 *   booking, read-only, and opens in the register to refund there.
 */
const meta = {
  title: 'V1 → V2 Migration/12 · Order Lookup/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'orderlookup', leftPanelCollapsed: true, ...extra });
const row = (el: HTMLElement, n: string) => el.querySelector<HTMLElement>(`[data-order-row="${n}"]`);
const search = async (el: HTMLElement, text: string) => {
  const box = within(el).getByRole('textbox', { name: 'Search orders' });
  await userEvent.clear(box);
  await userEvent.type(box, text);
};

/** Two sleeves of Pro V1s and a glove, on card •••• 2215 — the pro shop's refund. */
const balls = SEED_ORDERS.find((o) => o.lines.some((l) => l.name === 'Titleist Pro V1 Sleeve'))!;
/** The first order of the morning, on card •••• 4421. */
const first = SEED_ORDERS[0];

/**
 * **The morning's orders.** Every order rung this morning, and the tee times paid on the sheet,
 * newest first. Nothing to press before the list appears.
 */
export const TheMorning: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    for (const o of SEED_ORDERS) await expect(row(canvasElement, o.orderNumber)).not.toBeNull();
    // Tee times paid before the session are orders too.
    await expect(canvasElement.querySelectorAll('[data-order-row]').length).toBeGreaterThan(SEED_ORDERS.length);
    await expect(canvasElement.querySelector('[data-order-detail]')).toBeNull();
  },
};

/** **Search by product**, live. "Pro V1" finds both orders with a Pro V1 on them, as it is typed. */
export const SearchByProduct: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await search(canvasElement, 'Pro V1');
    const expected = SEED_ORDERS.filter((o) => o.lines.some((l) => l.name.includes('Pro V1')));
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-order-row]').length).toBe(expected.length));
    for (const o of expected) await expect(row(canvasElement, o.orderNumber)).not.toBeNull();
  },
};

/**
 * **Search by a card's last four.** The same box — not a fourth field. A customer holding a
 * statement line reads out four digits, and that is enough.
 */
export const SearchByCardLastFour: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await search(canvasElement, '4421');
    await waitFor(() => expect(row(canvasElement, first.orderNumber)).not.toBeNull());
    for (const r of canvasElement.querySelectorAll<HTMLElement>('[data-order-row]')) await expect(r.textContent).toContain('4421');
    await userEvent.click(row(canvasElement, first.orderNumber)!);
    const detail = canvasElement.querySelector<HTMLElement>('[data-order-detail]')!;
    await expect(detail.textContent).toContain('Card •••• 4421');
  },
};

/**
 * **An order, whole.** What was bought and for how much, the tax, the tender and who took it —
 * and how many of each stocked item are on the shelf now.
 */
export const OpenAnOrder: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(row(canvasElement, balls.orderNumber)!);
    const detail = await waitFor(() => canvasElement.querySelector<HTMLElement>(`[data-order-detail="${balls.orderNumber}"]`)!);
    await expect(detail.textContent).toContain('Titleist Pro V1 Sleeve');
    await expect(detail.textContent).toContain('Card •••• 2215');
    await expect(detail.querySelector('[data-taken-by]')!.textContent).toContain('Taken by Diego Ramos');
    await expect(detail.querySelector('[data-total="Total"]')!.textContent).toContain(money(balls.total));
    await expect(detail.querySelector('[data-stock]')).not.toBeNull();
  },
};

/**
 * **Refund one line.** Both sleeves of balls, not the glove: the dialog shows the goods and their
 * share of the tax, and says where the money goes — back to the card that paid. After it, the line
 * reads Refunded, the sleeves are back on the shelf, and a second refund cannot take them again.
 */
export const RefundOneLine: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedOrderNumber: balls.orderNumber })} />,
  play: async ({ canvasElement }) => {
    const i = balls.lines.findIndex((l) => l.name === 'Titleist Pro V1 Sleeve');
    const line = () => canvasElement.querySelector<HTMLElement>(`[data-order-line="${i}"]`)!;
    const shelf = Number(line().querySelector('[data-stock]')!.getAttribute('data-stock'));

    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-refund]')!);
    let dialog = within(await screen.findByRole('dialog'));
    await expect(dialog.getByText(/Goes back to Card •••• 2215/)).toBeTruthy();
    await userEvent.click(dialog.getByText('Choose lines'));
    for (let n = 0; n < balls.lines[i].qty; n++) await userEvent.click(dialog.getByRole('button', { name: 'One more Titleist Pro V1 Sleeve' }));
    const amount = refundAmount(balls, [{ index: i, qty: balls.lines[i].qty }]);
    await userEvent.click(dialog.getByRole('button', { name: `Refund ${money(amount)}` }));

    await waitFor(() => expect(line().querySelector('[data-refunded]')).not.toBeNull());
    await expect(Number(line().querySelector('[data-stock]')!.getAttribute('data-stock'))).toBe(shelf + balls.lines[i].qty);
    await expect(canvasElement.querySelector('[data-refund-record]')!.textContent).toContain(money(-amount));

    // The sleeves cannot go back twice; the glove still can.
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-refund]')!);
    dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByText('Choose lines'));
    const dialogEl = await screen.findByRole('dialog');
    await expect(dialogEl.querySelector(`[data-refund-line="${i}"]`)!.getAttribute('data-refundable')).toBe('0');
    await expect(dialog.queryByRole('button', { name: 'One more Titleist Pro V1 Sleeve' })).toBeNull();
    await expect(dialog.getByRole('button', { name: 'One more Golf Glove Mens' })).toBeTruthy();
  },
};

/** **Refund the whole order.** One tap, the full total back to the card, and the order reads Refunded. */
export const RefundTheWholeOrder: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedOrderNumber: first.orderNumber })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-refund]')!);
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: `Refund ${money(first.total)}` }));
    await waitFor(() => expect(canvasElement.querySelector<HTMLButtonElement>('[data-refund]')!.disabled).toBe(true));
    await expect(canvasElement.querySelector('[data-refund]')!.textContent).toContain('Fully refunded');
    await expect(row(canvasElement, first.orderNumber)!.textContent).toMatch(/Refunded/i);
    await expect(canvasElement.querySelector('[data-total="Kept"]')!.textContent).toContain('$0.00');
  },
};

/** The morning with the first order refunded — built by the reducer, so it is the real record. */
const refunded = () => {
  const s = reducer(createInitialState({ venueId: 'eighteen' }), { type: 'refundOrder', orderNumber: first.orderNumber, reason: 'Charged twice' });
  return { orders: s.orders, payments: s.payments, stock: s.stock, restaurantSeq: s.restaurantSeq, opsSeq: s.opsSeq };
};

/**
 * **A refund in Orders & Tips.** A negative payment on the order it came from, marked as a refund,
 * with no tip to adjust — and the day's sales net it out. Its order number opens the order here.
 */
export const ARefundInOrdersAndTips: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ view: 'orderstips', ...refunded() })} />,
  play: async ({ canvasElement }) => {
    const r = canvasElement.querySelector<HTMLElement>('[data-payment-kind="refund"]')!;
    await expect(r).toBeTruthy();
    await expect(r.textContent).toContain(money(-first.total));
    await expect(r.textContent).toContain('REFUND');
    await expect(within(r).queryByRole('button', { name: /Adjust/ })).toBeNull();
    await userEvent.click(within(r).getByRole('button', { name: `Open order ${first.orderNumber} in Order Lookup` }));
    const detail = await waitFor(() => canvasElement.querySelector<HTMLElement>(`[data-order-detail="${first.orderNumber}"]`)!);
    await expect(detail.querySelector('[data-refund-record]')!.textContent).toContain('Charged twice');
  },
};

/**
 * **From a reservation, and back.** The paid tee time's order number opens Order Lookup on that
 * order. The rail — where the register keeps its breadcrumb — is collapsed here, so the way back is
 * on this screen; it returns to the tee sheet with the reservation open, and is then spent.
 */
export const FromAReservationAndBack: Story = {
  render: () => <Screen edition="v1v2" initialState={sheetWithPanel(paidTwilight())} />,
  play: async ({ canvasElement }) => {
    const n = orderNumber(paidTwilight())!;
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-order-number]')!);
    await waitFor(() => expect(canvasElement.querySelector(`[data-order-detail="${n}"]`)).not.toBeNull());
    const back = canvasElement.querySelector<HTMLElement>('[data-back-to-reservation]')!;
    await expect(back.textContent).toContain(paidTwilight().name);
    await userEvent.click(back);
    await waitFor(() => expect(canvasElement.querySelector('[data-player-row="0"]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-order-lookup]')).toBeNull();
    await expect(canvasElement.querySelector('[data-back-to-reservation]')).toBeNull();
  },
};

/** V1 → V2 prices each seat's transport from its row (100226), so the order as sold does too. */
const V1V2_RATES = { transportFromRow: true };

/**
 * **A tee time paid before the session.** Its number has no rung-up order behind it, so the screen
 * builds one from the booking — the same seats, fees and tax the register would charge — and says
 * so. It refunds like any order; **Open in register** is still there for a rain check.
 */
export const ATeeTimePaidBeforeTheSession: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedOrderNumber: orderNumber(paidTwilight()) })} />,
  play: async ({ canvasElement }) => {
    const b = paidTwilight();
    const built = orderFromBooking(b, venue('eighteen').courses, V1V2_RATES)!;
    const detail = await waitFor(() => canvasElement.querySelector<HTMLElement>(`[data-order-detail="${built.orderNumber}"]`)!);
    await expect(detail.textContent).toContain('Paid on the tee sheet');
    await expect(detail.textContent).toContain(built.lines[0].name);
    await expect(detail.querySelector('[data-total="Total"]')!.textContent).toContain(money(built.total));
    await expect(canvasElement.querySelector<HTMLButtonElement>('[data-refund]')!.disabled).toBe(false);
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-open-in-register]')!);
    // The register, with the booking loaded and its breadcrumb back to the reservation.
    await waitFor(() => expect(canvasElement.querySelector('[data-return-to-reservation]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-order-lookup]')).toBeNull();
  },
};

/**
 * **Refunding it.** The whole tee time goes back to the card, and from then on the order is a real
 * record: it reads Refunded, and cannot be refunded again.
 */
export const RefundATeeTimePaidBeforeTheSession: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedOrderNumber: orderNumber(paidTwilight()) })} />,
  play: async ({ canvasElement }) => {
    const built = orderFromBooking(paidTwilight(), venue('eighteen').courses, V1V2_RATES)!;
    await waitFor(() => expect(canvasElement.querySelector(`[data-order-detail="${built.orderNumber}"]`)).not.toBeNull());
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-refund]')!);
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: `Refund ${money(built.total)}` }));
    await waitFor(() => expect(canvasElement.querySelector<HTMLButtonElement>('[data-refund]')!.disabled).toBe(true));
    await expect(canvasElement.querySelector('[data-refund]')!.textContent).toContain('Fully refunded');
  },
};

/** **A number nobody paid under** says so, rather than showing an empty frame. */
export const ANumberWithNoOrder: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ selectedOrderNumber: '#A-00000' })} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-order-missing]')!.textContent).toContain('#A-00000');
  },
};

/**
 * **Weston's edition has none of it.** The same reservation's order number loads the order into the
 * register, as it did in round 5 — Order Lookup is V1 → V2's.
 */
export const WestonHasNone: Story = {
  render: () => <Screen edition="weston" initialState={sheetWithPanel(paidTwilight())} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-order-number]')!);
    await waitFor(() => expect(canvasElement.querySelector('[data-return-to-reservation]')).not.toBeNull());
    await expect(canvasElement.querySelector('[data-order-lookup]')).toBeNull();
  },
};
