import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { CURRENT_EDITION } from '../../../../pos/edition';
import { money, orderTotals } from '../../../../pos/logic/cart';
import { buckPricing } from '../../../../pos/logic/pricing';
import { evenParts } from '../../../../pos/state/checkout';
import { amountDue } from '../../../../pos/state/operations';
import { createInitialState, reducer, type PosState } from '../../../../pos/state/pos-store';
import { withEdition } from '../../../edition-decorator';
import { Screen, atVenue } from '../../../pos/screen-helpers';
import { counterOrder, counterRound, dialog, done, find, item, payOnReader, q } from './checkout-kit';

/**
 * Pro Shop — **the order tools that said "coming soon"** (Nov 26, "checkout that's right").
 *
 * - **Split** — evenly (2–6 ways) or by item. Each part is paid on its own tender and recorded as its
 *   own payment under the order's number; by item, a part owes its lines with their own tax.
 * - **Service charge** — Buck's F&B or Event charge, or one typed in, as its own line.
 * - **Reprint receipt** — the last order paid here, as it printed.
 * - **Transfer to course** — the order moves to another course's register, and waits there.
 * - **Key in** — the reader takes a card typed in, checked before it is charged.
 */
const meta = {
  title: 'Prototypes/Tablet/Pro Shop/Order tools',
  id: 'prototypes-tablet-pro-shop-order-tools',
  parameters: { layout: 'fullscreen' },
  decorators: [withEdition('current-tablet')],
} satisfies Meta;

export default meta;
type Story = StoryObj;

const T = CURRENT_EDITION.tablet;
const lunch = [item('Golf Polo Course Logo', 55), item('Beer Domestic', 5, 2), item('Hot Dog', 5)];

/**
 * **Split evenly three ways.** Three cards, each a third — the last a cent more where rounding leaves
 * one. Checkout marks each part paid as it goes, and the third closes the order.
 */
export const SplitEvenlyThreeWays: Story = {
  render: () => <Screen edition={T} initialState={counterOrder(lunch, undefined, { modal: { kind: 'checkout' } })} />,
  play: async ({ canvasElement }) => {
    const parts = evenParts(orderTotals(lunch, buckPricing()).total, 3);
    await userEvent.click((await dialog()).getByRole('button', { name: 'Split' }));
    const d = await dialog();
    await userEvent.click(q('[data-split-ways="3"]')!);
    await userEvent.click(d.getByRole('button', { name: 'Split 3 ways' }));
    await find('[data-check-split="even"]');
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(q(`[data-split-part="${i}"]`)!.dataset.splitPartState).toBe('paying'));
      await payOnReader();
      await expect(within(screen.getByRole('dialog')).getAllByText(money(parts[i])).length).toBeGreaterThan(0);
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
      if (i < 2) await waitFor(() => expect(q(`[data-split-part="${i}"]`)!.dataset.splitPartState).toBe('paid'));
    }
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await within(canvasElement).findByText(`Paid · ${money(parts[2])}`);
  },
};

/** **Split by item.** The round to part 1, the beers to part 2: each part owes its lines, tax and all. */
export const SplitByItem: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([counterRound(1, 'walking'), item('Beer Domestic', 5, 2)], undefined, { modal: { kind: 'splitCheck' } })} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(d.getByRole('button', { name: 'By item' }));
    await userEvent.click(d.getByRole('button', { name: 'Guest Rate 18 Holes to part 1' }));
    await userEvent.click(d.getByRole('button', { name: 'Beer Domestic to part 2' }));
    // $59 + 8%; $10 + 8% + 6.7%.
    await expect(q('[data-split-preview="0"]')!.textContent).toContain('$63.72');
    await expect(q('[data-split-preview="1"]')!.textContent).toContain('$11.47');
    await userEvent.click(d.getByRole('button', { name: 'Split by item' }));
    await expect((await find('[data-split-part="0"]')).textContent).toContain('$63.72');
  },
};

/** **A service charge by hand.** A $25 setup fee goes on as its own line, untaxed. */
export const AServiceChargeByHand: Story = {
  render: () => <Screen edition={T} initialState={counterOrder(lunch, undefined, { modal: { kind: 'serviceCharge' } })} />,
  play: async () => {
    const d = await dialog();
    const custom = within(q('[data-custom-service-charge]')!);
    const [name, value] = custom.getAllByRole('textbox');
    await userEvent.type(name, 'Setup fee');
    await userEvent.click(custom.getByRole('button', { name: '$' }));
    await userEvent.type(value, '25');
    await userEvent.click(d.getByRole('button', { name: 'Add charge' }));
    await expect((await find('[data-service-charge-line="custom"]')).textContent).toContain('$25.00');
    await expect(q('[data-service-charge="custom-3"]')!.textContent).toContain('$25.00');
  },
};

/** The glove sold on a card, the paid order still on the rail. */
function gloveSold(): PosState {
  const s = createInitialState({ ...counterOrder([item('Golf Glove Mens', 18)]), buckCheckout: true });
  return reducer(s, { type: 'recordPayment', method: 'card', amount: amountDue(s), ref: { cardLast4: '4417' } });
}

/** **Reprint receipt.** The cog's Reprint Receipt opens the last order paid here, and prints it again. */
export const ReprintTheLastReceipt: Story = {
  render: () => <Screen edition={T} initialState={gloveSold()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTitle('Order settings'));
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: /Reprint Receipt/ }));
    const d = await dialog();
    const receipt = await find('[data-receipt]');
    await expect(receipt.textContent).toContain('Golf Glove Mens');
    await expect(receipt.textContent).toContain('Card •••• 4417');
    await userEvent.click(d.getByRole('button', { name: 'Print again' }));
    await within(document.body).findByText(/^Receipt reprinted · /);
  },
};

/** **Transfer to another course.** The order goes to The Nine's register and leaves this one. */
export const TransferToAnotherCourse: Story = {
  render: () => <Screen edition={T} initialState={counterOrder(lunch, undefined, { modal: { kind: 'transferOrder' } })} />,
  play: async ({ canvasElement }) => {
    const d = await dialog();
    await userEvent.click(q('[data-transfer-to="nine"]')!);
    await userEvent.click(d.getByRole('button', { name: 'Send to The Nine · Register 1' }));
    await within(document.body).findByText('Order sent to The Nine · Register 1');
    await waitFor(() => expect(within(canvasElement).queryByText('Golf Polo Course Logo')).toBeNull());
  },
};

/** **…and it arrives there.** The Nine's register lists the order from the Championship course, and opens it. */
export const ArrivedFromAnotherCourse: Story = {
  render: () => (
    <Screen
      edition={T}
      initialState={atVenue('nine', {
        view: 'pos',
        leftPanelCollapsed: false,
        transferredOrders: [{ id: 'TR-0001', fromVenue: 'eighteen', toVenue: 'nine', cart: lunch, customer: 'Sutton, K.', total: 78.84, date: '2026-05-21', time: '12:10 PM', staffId: 's-1' }],
      })}
    />
  ),
  play: async () => {
    const bar = await find('[data-arrived-orders]');
    await expect(bar.textContent).toContain('Championship · Register 1 · Sutton, K. · $78.84');
    await userEvent.click(within(bar).getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(q('[data-arrived-orders]')).toBeNull());
    await within(document.body).findByText('Golf Polo Course Logo');
  },
};

/**
 * **Key in a card.** The reader's Key in takes a card typed in: a mistyped number fails its check
 * before anything is charged; a good one charges, and the receipt says it was keyed.
 */
export const KeyInACard: Story = {
  render: () => <Screen edition={T} initialState={counterOrder([item('Golf Glove Mens', 18)], undefined, { modal: { kind: 'paymentReader', method: 'card' } })} />,
  play: async () => {
    const d = await dialog();
    await userEvent.click(d.getByRole('button', { name: 'Key in' }));
    const form = within(await find('[data-key-in]'));
    const [num, exp, cvv, zip] = form.getAllByRole('textbox');
    await userEvent.type(num, '4242 4242 4242 4241');
    await userEvent.type(exp, '12/28');
    await userEvent.type(cvv, '123');
    await userEvent.type(zip, '78163');
    await userEvent.click(form.getByRole('button', { name: /^Charge / }));
    await expect((await find('[data-key-in-problems]')).textContent).toContain('That card number doesn’t check out.');
    await userEvent.clear(num);
    await userEvent.type(num, '4242 4242 4242 4242');
    await userEvent.click(form.getByRole('button', { name: /^Charge / }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' })).toBeTruthy(), { timeout: 4000 });
    await expect(q('[data-receipt]')!.textContent).toContain('Card •••• 4242 (keyed)');
    await done();
  },
};
