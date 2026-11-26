import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { withEdition } from '../../../edition-decorator';
import { Screen } from '../../../pos/screen-helpers';
import { counterOrder, counterRound, dialog, done, find, item, payOnReader, q } from './checkout-kit';

/**
 * Pro Shop — **discounts on any line and the whole order** (Nov 26, "checkout that's right").
 *
 * All of Buck's discount kinds (Buck › Products › Discount Types), each limited to its categories:
 * **percent**, **dollars off each**, and **cost plus** where the shop knows the product's cost —
 * otherwise cost plus is not offered at all. A type Buck flags for approval needs a manager: the
 * person signed in, or a manager's PIN right there (the PIN sign-in's staff and roles). A retail line
 * whose product has Buck's **Price override** option can be re-priced. **Promo Code** is real: a small
 * code table, applied as an order discount. Every discount shows as a negative line with its name, and
 * comes off before tax.
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Discounts',
  id: 'prototypes-tablet-pro-shop-discounts',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const T = CURRENT_EDITION.tablet;
const polo = item('Golf Polo Course Logo', 55, 2);
const openLineDiscount = async (index: number) => {
  await userEvent.click(within(await find(`[data-line-discount-button="${index}"]`)).getByRole('button'));
  return dialog();
};

/** **A percent off one line.** 10% Everything on two polos: −$11.00, by name, under the line. */
export const APercentOffALine: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([polo, item('Beer Domestic', 5, 2)])} />,
  play: async () => {
    const d = await openLineDiscount(0);
    await expect(d.queryByRole('button', { name: /Shift Drink/ })).toBeNull();
    await userEvent.click(d.getByRole('button', { name: '10% Everything · 10% off' }));
    const line = await find('[data-line-discount="0"]');
    await expect(line.textContent).toBe('10% Everything · 10% off−$11.00');
  },
};

/**
 * **A manager approves it, and the card pays it.** Diego (pro shop) is signed in: Military needs a
 * manager, so it asks for a PIN. His own is refused — he is not a manager — Avery's 1111 approves it.
 * The receipt prints the discount by name.
 */
export const AManagerApprovesMilitary: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([polo], undefined, { operatorId: 's-6' })} />,
  play: async ({ canvasElement }) => {
    const d = await openLineDiscount(0);
    await userEvent.click(d.getByRole('button', { name: 'Military · 25% off, needs a manager' }));
    const pin = within(await find('[data-manager-pin]'));
    for (const k of '6666') await userEvent.click(pin.getByRole('button', { name: k }));
    await waitFor(() => expect(q('[data-pin-refused]')!.textContent).toBe('Diego R. is not a manager'));
    for (const k of '1111') await userEvent.click(pin.getByRole('button', { name: k }));
    const line = await find('[data-line-discount="0"]');
    await expect(line.textContent).toBe('Military · 25% off · approved−$27.50');
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Pay \$/ }));
    await payOnReader();
    await expect((await find('[data-receipt-discount="line-0"]')).textContent).toContain('Military · 25% off · Golf Polo Course Logo');
    await done();
  },
};

/**
 * **Cost plus, where the cost is known.** The polo cost the shop $27.50, so Employee Merch Discount
 * (cost + 15%) is offered and prices it at $31.63 each. An umbrella with no cost on file never sees it.
 */
export const CostPlusOnlyWhereTheCostIsKnown: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([polo, item('Umbrella', 10)])} />,
  play: async () => {
    let d = await openLineDiscount(1);
    await expect(d.queryByRole('button', { name: /cost \+/ })).toBeNull();
    await userEvent.click(d.getByRole('button', { name: 'Done' }));
    d = await openLineDiscount(0);
    await userEvent.click(d.getByRole('button', { name: 'Employee Merch Discount · cost + 15%' }));
    await expect((await find('[data-line-discount="0"]')).textContent).toBe('Employee Merch Discount · cost + 15%−$46.74');
  },
};

/** **A price override on retail.** Buck's Price override is on for the polo: $55 → $45 each, and the line says what it was. */
export const APriceOverride: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([polo])} />,
  play: async () => {
    const d = await openLineDiscount(0);
    const field = within(q('[data-price-override]')!).getByRole('textbox');
    await userEvent.clear(field);
    await userEvent.type(field, '45');
    await userEvent.click(d.getByRole('button', { name: 'Set price' }));
    await expect((await find('[data-price-was]')).textContent).toBe('$45.00 each · was $55.00');
  },
};

/** **Dollars off a round.** League Pass on two seats rung at the counter — Buck's Tee Fees category. */
export const LeaguePassOffTheRound: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([counterRound(2, 'walking')])} />,
  play: async () => {
    const d = await openLineDiscount(0);
    await expect(d.queryByRole('button', { name: /Employee Merch/ })).toBeNull();
    await userEvent.click(d.getByRole('button', { name: 'League Pass · 20% off' }));
    await expect((await find('[data-line-discount="0"]')).textContent).toContain('−$23.60');
  },
};

/**
 * **A discount on the whole order, only where it applies.** 20% off F&B on polos and beers comes off
 * the beers alone, as its own negative line.
 */
export const AnOrderDiscountByCategory: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([polo, item('Beer Domestic', 5, 2)])} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTitle('Order settings'));
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: /Discount Order/ }));
    const d = await dialog();
    await userEvent.click(d.getByRole('button', { name: '20% off F&B · 20% off' }));
    await expect((await find('[data-order-discount="2"]')).textContent).toContain('−$2.00');
  },
};

/**
 * **A promo code, for real.** WINTER25 has expired and says so; PROSHOP15 takes 15% off the
 * merchandise and lands on the order by name.
 */
export const APromoCode: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([polo, item('Beer Domestic', 5, 2)])} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTitle('Order settings'));
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: /Promo Code/ }));
    const d = await dialog();
    const code = within(q('[data-promo]')!).getByRole('textbox');
    await userEvent.type(code, 'winter25');
    await userEvent.click(d.getByRole('button', { name: 'Apply' }));
    await expect((await find('[data-promo-problem]')).textContent).toBe('WINTER25 expired on 02/28/2026.');
    await userEvent.clear(code);
    await userEvent.type(code, 'PROSHOP15');
    await userEvent.click(d.getByRole('button', { name: 'Apply' }));
    const line = await find('[data-order-discount="PROSHOP15"]');
    await expect(line.textContent).toContain('Promo PROSHOP15 · 15% off merchandise');
    await expect(line.textContent).toContain('−$16.50');
  },
};
