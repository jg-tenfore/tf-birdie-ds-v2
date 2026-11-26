import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { withEdition } from '../../../edition-decorator';
import { Screen } from '../../../pos/screen-helpers';
import { HOLDERS, chooseCredit, counterOrder, counterRound, dialog, done, find, item, payOnReader, q } from './checkout-kit';

/**
 * Pro Shop — **credits as tenders** (Nov 26, "checkout that's right").
 *
 * Until now only a gift card paid. Buck configures four more credits, and each is now a tender at
 * checkout for the customer on the order, under checkout's **Credits** tile:
 *
 * - **Rain check** — tee times only (Buck › Booking Engine › *Rainchecks Only on Tee Times*), a year
 *   to spend it (Main Info › *Rain Check Expiration*). Staff key the amount; nothing is prorated.
 * - **Punch card** — one punch per eligible item: a seat's green fee (the ride is still billed), a cart,
 *   a product; an activity takes minutes per punch.
 * - **Credit book** — a league's or an event's account, only for what Buck says it applies to.
 * - **Lesson credit** — one lesson of its length per credit.
 *
 * What a credit cannot pay is named and stays due on another tender, as a gift card's categories
 * already work. Every credit shows its balance before and after, and the payment says which credit paid.
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Credits as tenders',
  id: 'prototypes-tablet-pro-shop-credits-as-tenders',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const T = CURRENT_EDITION.tablet;

/**
 * **A tee fee and a beer, across a league's credit book and a card.** Kelsey's Men's League Weekly Play
 * book is for merchandise, food and tee fees — not alcohol — so it pays the round and its tax, names the
 * beer it cannot pay, and the card takes the rest. The receipt lists the book's part above the card's.
 */
export const ABookPaysTheTeeFeeACardTheBeer: Story = {
  render: () => (
    <Screen edition={T} initialState={counterOrder([counterRound(1), item('Beer Domestic', 5)], HOLDERS.kelsey, { modal: { kind: 'checkout' } })} />
  ),
  play: async () => {
    await chooseCredit('Credit book');
    const d = await dialog();
    await expect(d.getByText("Men's League Weekly Play")).toBeTruthy();
    await expect(q('[data-credit-cannot-line="Beer Domestic"]')!.textContent).toMatch(/not for alcohol/);
    await expect(q('[data-credit-before]')!.textContent).toBe('$1,575.94');
    const pays = Number(q('[data-credit-pays]')!.dataset.creditPays);
    await expect(pays).toBeGreaterThan(59);
    await userEvent.click(d.getByRole('button', { name: /^Pay \$[\d.,]+ · \$[\d.,]+ left due$/ }));
    // Back at checkout, part paid: the book's line, and what is left for the card.
    const split = await find('[data-split-tender]');
    await expect(split.textContent).toContain("Paid · Credit book · Men's League Weekly Play");
    await payOnReader();
    await expect(within(await find('[data-receipt]')).getByText(/Credit book · Men's League Weekly Play/)).toBeTruthy();
    await done();
    await within(document.body).findByText(/^Paid · /);
  },
};

/**
 * **A punch pays for the bucket.** Marissa's Range Pass is one Range Bucket Large a punch: it pays the
 * bucket with its tax, the whole order, and her card goes from 7 punches to 6.
 */
export const APunchPaysForTheBucket: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([item('Range Bucket Large', 14)], HOLDERS.marissa, { modal: { kind: 'tenderCredit', credit: 'punchcard' } })} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(q('[data-credit-option="punch:CPC-10611:0"]')!);
    await expect(q('[data-credit-before]')!.textContent).toBe('7 punches');
    await expect(q('[data-credit-after]')!.textContent).toBe('6 punches');
    await expect(q('[data-credit-cannot]')).toBeNull();
    await userEvent.click(d.getByRole('button', { name: /^Pay \$[\d.]+$/ }));
    await within(document.body).findByText(/Range Pass · Range Bucket Large · 7 punches → 6 punches/);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  },
};

/**
 * **A green-fee punch pays the seat, never the ride.** Kelsey's Golf & Range Bundle punches her green
 * fee; the riding cart is named and stays due.
 */
export const AGreenFeePunchLeavesTheRide: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([counterRound(1)], HOLDERS.kelsey, { modal: { kind: 'tenderCredit', credit: 'punchcard' } })} />,
  play: async () => {
    await dialog();
    await userEvent.click(q('[data-credit-option="punch:CPC-10598:0"]')!);
    await expect(q('[data-credit-before]')!.textContent).toBe('6 punches');
    await expect(q('[data-credit-cannot-line="Guest Rate 18 Holes"]')!.textContent).toMatch(/the ride is still billed/);
  },
};

/**
 * **A rain check pays tee times only — and the amount is keyed.** Kelsey's rain check takes the round,
 * names the sleeve of balls it may not, and the counter keys $10 of it rather than a prorated share.
 */
export const ARainCheckIsKeyedAndPaysTeeTimes: Story = {
  render: () => (
    <Screen edition={T} initialState={counterOrder([counterRound(1, 'walking'), item('Titleist Pro V1 Sleeve', 16)], HOLDERS.kelsey, { modal: { kind: 'tenderCredit', credit: 'raincheck' } })} />
  ),
  play: async () => {
    const d = await dialog();
    await expect(q('[data-credit-cannot-line="Titleist Pro V1 Sleeve"]')!.textContent).toMatch(/tee times only/);
    const amount = within(q('[data-credit-amount]')!).getByRole('textbox');
    await userEvent.clear(amount);
    await userEvent.type(amount, '10');
    await waitFor(() => expect(q('[data-credit-pays]')!.dataset.creditPays).toBe('10.00'));
    await userEvent.click(d.getByRole('button', { name: /^Pay \$10\.00 · / }));
    const split = await find('[data-split-tender]');
    await expect(split.textContent).toMatch(/Paid · Rain check #\d+/);
  },
};

/** **A lesson credit pays a lesson of its own length.** Priya's 30-minute pack pays the tune-up, not the hour. */
export const ALessonCreditPaysItsLength: Story = {
  render: () => (
    <Screen edition={T} initialState={counterOrder([item('Lesson 30 Min', 55), item('Lesson 60 Min', 95)], HOLDERS.priya, { modal: { kind: 'tenderCredit', credit: 'lessoncredit' } })} />
  ),
  play: async () => {
    await dialog();
    await userEvent.click(q('[data-credit-option="lesson:bal-jp-5"]')!);
    await expect(q('[data-credit-before]')!.textContent).toBe('3 credits');
    await expect(q('[data-credit-after]')!.textContent).toBe('2 credits');
    await expect(q('[data-credit-cannot-line="Lesson 60 Min"]')!.textContent).toMatch(/60-minute lesson, not 30/);
  },
};

/** **No customer, no credits.** The dialog asks for one, and attaching Kelsey lists her rain checks. */
export const AttachTheCustomerFirst: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([counterRound(1)], undefined, { modal: { kind: 'tenderCredit', credit: 'raincheck' } })} />,
  play: async () => {
    const d = await dialog();
    await expect(q('[data-credit-no-customer]')).not.toBeNull();
    await userEvent.type(d.getByRole('textbox'), 'Kelsey');
    await userEvent.click(await find('[data-credit-attach="458349"]'));
    await waitFor(() => expect(document.querySelectorAll('[data-credit-option]').length).toBeGreaterThan(0));
  },
};
