import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { venueBookings } from '../../../../pos/data/venues';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { evenParts } from '../../../../pos/state/checkout';
import { amountDue, dueNow } from '../../../../pos/state/operations';
import { createInitialState, reducer, type PosState } from '../../../../pos/state/pos-store';
import { withEdition } from '../../../edition-decorator';
import { Screen } from '../../../pos/screen-helpers';
import { chooseCredit, dialog, find, q } from './checkout-kit';

/**
 * Pro Shop — **the register's Refund and Rain check, for real** (Nov 26, "checkout that's right").
 *
 * They used to mark the booking and add a line to its financial trail, and nothing else. Now a
 * **refund** gives a seat's money back to the tenders that paid it — the same refund Order Lookup
 * makes — and a **rain check** cuts a Buck Credits rain check for the seat's customer, keyed, with
 * Buck's 365-day expiry, that shows on their record and pays at checkout.
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Refunds and rain checks',
  id: 'prototypes-tablet-pro-shop-refunds-and-rain-checks',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const T = CURRENT_EDITION.tablet;

/** Kelsey James's twosome at 18 holes, unpaid — a booker the roster knows (`v19`). */
const BOOKING = venueBookings('eighteen').find((b) => b.id === 'v19')!;

/** The register with the twosome loaded, priced as the current edition prices it. */
function loaded(extra: Partial<PosState> = {}): PosState {
  const s = createInitialState({
    venueId: 'eighteen',
    bookings: venueBookings('eighteen'),
    buckCheckout: true,
    transportFromRow: true,
    view: 'pos',
    leftPanelCollapsed: false,
    ...extra,
  });
  return reducer(s, { type: 'loadBooking', bookingId: BOOKING.id });
}

/** …paid in two halves, a card and then cash. */
function paidCardThenCash(): PosState {
  let s = loaded();
  s = reducer(s, { type: 'startSplit', split: { mode: 'even', parts: evenParts(amountDue(s), 2).map((amount, i) => ({ label: `Part ${i + 1} of 2`, amount })) } });
  s = reducer(s, { type: 'recordPayment', method: 'card', amount: dueNow(s), ref: { cardLast4: '4417' } });
  s = reducer(s, { type: 'recordPayment', method: 'cash', amount: dueNow(s) });
  return { ...s, modal: { kind: 'actionPanel', action: 'refund' } };
}

/**
 * **A refund goes back to the tenders that paid.** The twosome was paid half on a card, half in cash.
 * Refunding Kelsey's seat gives it back from the last tender first — the cash — and the toast and
 * the plan say exactly where each dollar went.
 */
export const ARefundGoesBackToTheTenders: Story = {
  render: () => <Screen edition={T} initialState={paidCardThenCash()} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(q(`[data-seat-option="${BOOKING.id}:0"]`)!.firstElementChild as HTMLElement);
    const plan = await find('[data-seat-refund]');
    await expect(plan.querySelector('[data-refund-to="cash"]')).not.toBeNull();
    await userEvent.click(d.getByRole('button', { name: /^Refund \$/ }));
    await within(document.body).findByText(/^Refunded \$[\d.]+ · Cash/);
  },
};

/** **Nothing paid, nothing to refund.** An unpaid seat says so rather than refunding money never taken. */
export const NothingPaidNothingToRefund: Story = {
  render: () => <Screen edition={T} initialState={{ ...loaded(), modal: { kind: 'actionPanel', action: 'refund' } }} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(q(`[data-seat-option="${BOOKING.id}:0"]`)!.firstElementChild as HTMLElement);
    await expect((await find('[data-seat-refund]')).textContent).toContain('Nothing has been paid for this seat yet');
    await expect(d.getByRole('button', { name: 'Refund' })).toBeDisabled();
  },
};

/**
 * **A rain check issued, then spent.** The counter cuts Kelsey a $30.00 rain check — keyed, a year to
 * spend it — and on the same order her new rain check is there at checkout, and pays.
 */
export const ARainCheckIssuedThenSpent: Story = {
  render: () => <Screen edition={T} initialState={{ ...loaded(), modal: { kind: 'actionPanel', action: 'raincheck' } }} />,
  play: async ({ canvasElement }) => {
    const d = await dialog();
    await userEvent.click(q(`[data-seat-option="${BOOKING.id}:0"]`)!.firstElementChild as HTMLElement);
    const amount = within(await find('[data-rain-check-amount]')).getByRole('textbox');
    await userEvent.clear(amount);
    await userEvent.type(amount, '30');
    await expect((await find('[data-seat-rain-check]')).textContent).toContain('expires 05/21/2027');
    await userEvent.click(d.getByRole('button', { name: 'Issue $30.00 rain check' }));
    await within(document.body).findByText(/^Rain check for Kelsey James · \$30\.00 · expires 05\/21\/2027/);
    // Spend it on the round still on the register.
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Pay \$/ }));
    await dialog();
    await chooseCredit('Rain check');
    const option = await find('[data-credit-option="raincheck:61001"]');
    await expect(option.textContent).toContain('$30.00');
    await expect(q('[data-credit-before]')!.textContent).toBe('$30.00');
    await expect(q('[data-credit-after]')!.textContent).toBe('$0.00');
    await userEvent.click((await dialog()).getByRole('button', { name: /^Pay \$30\.00 · / }));
    await waitFor(() => expect(q('[data-split-tender]')!.textContent).toContain('Paid · Rain check #61001'));
  },
};
