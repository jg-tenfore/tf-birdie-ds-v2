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
 *
 * Nov 26 decisions, in the last stories:
 *
 * - **A rain check always belongs to someone.** A walk-in seat with no customer record asks staff to
 *   find the guest or add them (name and phone) first, and the seat is linked to them.
 * - **The manager PIN follows Buck's switches.** "Allow refunds without manager pin" and "Order Cancels
 *   Require Manager" decide whether a refund or clearing an order asks for a manager's PIN. This club
 *   asks nobody, as in October; a club that sets them the other way gets the PIN pad.
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

/** Someone at the pro shop counter, not a manager (Diego, PIN 6666). */
const AT_THE_COUNTER = { operatorId: 's-6' } as const;
/** A club that sets Buck's two manager switches the strict way. */
const STRICT = { managerSwitches: { refundsWithoutManagerPin: false, orderCancelsRequireManager: true } };

async function typePin(pin: string) {
  const pad = within(await find('[data-manager-pin]'));
  for (const k of pin) await userEvent.click(pad.getByRole('button', { name: k }));
}

/**
 * **A walk-in guest is added first.** Kelsey's second seat has no customer record. The rain check asks
 * who the guest is: staff add them — name and phone — and the rain check goes on the new record, which
 * the seat is now linked to. Opening it again, the seat is theirs.
 */
export const AWalkInGuestIsAddedFirst: Story = {
  render: () => <Screen edition={T} initialState={{ ...loaded(), modal: { kind: 'actionPanel', action: 'raincheck' } }} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(q(`[data-seat-option="${BOOKING.id}:1"]`)!.firstElementChild as HTMLElement);
    await expect((await find('[data-rain-check-customer]')).dataset.rainCheckCustomer).toBe('find');
    await expect(d.getByRole('button', { name: /^Issue .*rain check$/ })).toBeDisabled();
    await userEvent.click(d.getByRole('button', { name: 'Add a new one' }));
    await userEvent.type(within(q('[data-new-first]')!).getByRole('textbox'), 'Rowan');
    await userEvent.type(within(q('[data-new-last]')!).getByRole('textbox'), 'Ashby');
    await userEvent.type(within(q('[data-new-phone]')!).getByRole('textbox'), '(555) 010-7788');
    await expect((await find('[data-seat-rain-check]')).textContent).toContain('For Rowan Ashby (new customer)');
    await userEvent.click(d.getByRole('button', { name: /^Issue \$[\d.]+ rain check$/ }));
    await within(document.body).findByText(/^Rain check for Rowan Ashby · \$[\d.]+ · expires 05\/21\/2027 · new customer added$/);
  },
};

/**
 * **…or found.** The same seat, and the guest is someone the club knows: a search finds Marissa Chen,
 * the rain check goes on her record, and the seat is linked to her.
 */
export const AGuestFoundForTheSeat: Story = {
  render: () => <Screen edition={T} initialState={{ ...loaded(), modal: { kind: 'actionPanel', action: 'raincheck' } }} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(q(`[data-seat-option="${BOOKING.id}:1"]`)!.firstElementChild as HTMLElement);
    await userEvent.type(within(await find('[data-rain-check-find]')).getByRole('textbox'), 'Marissa');
    await userEvent.click((await find('[data-rain-check-match="458346"]')).firstElementChild as HTMLElement);
    await userEvent.click(d.getByRole('button', { name: /^Issue \$[\d.]+ rain check$/ }));
    await within(document.body).findByText(/^Rain check for Marissa Chen · \$[\d.]+ · expires 05\/21\/2027 · linked to the seat$/);
  },
};

/** **At this club nobody is asked.** Diego, at the counter, clears an order with no manager in sight. */
export const ClearingAnOrderAtThisClub: Story = {
  render: () => <Screen edition={T} initialState={loaded(AT_THE_COUNTER)} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear order' }));
    const d = await dialog();
    await expect(q('[data-needs-manager]')).toBeNull();
    await userEvent.click(d.getByRole('button', { name: 'Clear order' }));
    await within(document.body).findByText('Order cleared');
  },
};

/**
 * **A club that requires a manager to cancel.** The same tap asks for a manager's PIN. Diego's own PIN
 * is refused — he is not a manager — and Avery's approves it; the toast says who did.
 */
export const ClearingAnOrderAsksAManager: Story = {
  render: () => <Screen edition={T} initialState={loaded({ ...AT_THE_COUNTER, ...STRICT })} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Clear order' }));
    const d = await dialog();
    await expect(q('[data-needs-manager]')!.textContent).toContain('asks a manager to approve');
    await userEvent.click(d.getByRole('button', { name: 'Clear order' }));
    await typePin('6666');
    await expect((await find('[data-pin-refused]')).textContent).toBe('Diego R. is not a manager');
    await typePin('1111');
    await within(document.body).findByText('Order cleared · approved by Avery R.');
  },
};

/** **A club that refunds only with a PIN.** The seat refund waits on the pad, then goes back as before. */
export const ARefundAsksAManager: Story = {
  render: () => <Screen edition={T} initialState={{ ...paidCardThenCash(), ...AT_THE_COUNTER, ...STRICT }} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(q(`[data-seat-option="${BOOKING.id}:0"]`)!.firstElementChild as HTMLElement);
    await find('[data-seat-refund]');
    await userEvent.click(d.getByRole('button', { name: /^Refund \$/ }));
    await typePin('1111');
    await within(document.body).findByText(/^Refunded \$[\d.]+ · Cash.* · approved by Avery R\.$/);
  },
};
