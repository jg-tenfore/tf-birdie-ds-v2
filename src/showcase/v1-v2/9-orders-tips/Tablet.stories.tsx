import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { SEED_PAYMENTS } from '../../../pos/data/restaurant-seed';
import { dayTotals } from '../../../pos/logic/tips';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 9 · Orders & Tips / Tablet
 *
 * **The day's payments, and the tips changed after the fact.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/orders-tips.tsx`, from `references/072926/9-ordersTips/`: a navy
 * totals band, a table of tippable payments, and a bottom bar mixing navigation, a cash drop, a
 * date picker and two print jobs.
 *
 * ## What was wrong with it
 *
 * Two things v1 recorded faithfully and that are simply wrong: the totals band printed its seven
 * labels **with no values** until the day had activity — a quiet morning read as broken, not empty
 * — and the table declared eight columns and filled seven. Less obviously, the bottom bar put a
 * *cash drop* beside the tip jobs, as though moving money to the safe were a tips task.
 *
 * ## What this does
 *
 * - **Totals that are always numbers.** $0.00 on an empty day, never a blank.
 * - **Every payment**, newest first, from the payment ledger this wave added — the store used to
 *   remember only the last payment. The tip and its percentage sit on every row.
 * - **Adjust** on card payments only; a cash tip is already paid out. Percentages are one tap, and
 *   a tip over half the sale — nearly always a slipped digit — needs a second confirm.
 * - **Tips by person**, which is what v1's "Tip out" was for. Tap one to see only their payments.
 * - The **average tip** is over *tipped* sales, so pro-shop sales, which nobody tips on, do not drag
 *   a restaurant's 19% down to 14.
 * - **No cash drop.** It moves to closing the till, with Shift, in wave 3.
 */
const meta = {
  title: 'V1 → V2 Migration/9 · Orders & Tips/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'orderstips', leftPanelCollapsed: true, ...extra });

/** **The morning so far.** Fifteen payments, their totals, and tips by the person who took them. */
export const TheMorning: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-payment]').length).toBe(SEED_PAYMENTS.length);
    const band = within(canvasElement.querySelector<HTMLElement>('[data-day-totals]')!);
    const t = dayTotals(SEED_PAYMENTS);
    await expect(band.getByText(`$${t.tips.toFixed(2)}`)).toBeTruthy();
    // Newest first: the last payment of the morning heads the list.
    const first = canvasElement.querySelector('[data-payment]')!;
    await expect(first.getAttribute('data-payment')).toBe(SEED_PAYMENTS.at(-1)!.id);
  },
};

/**
 * **A day with nothing in it still reads as numbers.** v1's band printed its labels with no values
 * until the day had activity. Here an empty day is $0.00 across the board, and the list says it is a
 * quiet day rather than showing an empty frame.
 */
export const AnEmptyDay: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ payments: [] })} />,
  play: async ({ canvasElement }) => {
    const band = canvasElement.querySelector<HTMLElement>('[data-day-totals]')!;
    for (const label of ['Sales', 'Tips', 'Card', 'Cash']) {
      await expect(band.querySelector(`[data-stat="${label}"]`)!.textContent).toContain('$0.00');
    }
    await expect(canvasElement.querySelector('[data-no-payments]')).not.toBeNull();
  },
};

/**
 * **Adjusting a tip.** 20% of the last lunch, one tap. The row updates, says it was adjusted, and
 * the day's tips follow.
 */
export const AdjustingATip: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const last = SEED_PAYMENTS.at(-1)!;
    await userEvent.click(within(canvasElement).getByRole('button', { name: `Adjust the tip on ${last.orderNumber}` }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(dialog.querySelector<HTMLElement>('[data-tip-preset="20"]')!);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save tip' }));
    const row = canvasElement.querySelector<HTMLElement>(`[data-payment="${last.id}"]`)!;
    const expected = (Math.round(last.amount * 20) / 100).toFixed(2);
    await waitFor(() => expect(row.querySelector('[data-tip]')!.textContent).toContain(`$${expected}`));
    await expect(row.textContent).toContain('ADJUSTED');
  },
};

/**
 * **A slipped digit asks twice.** $80 on a $73.20 lunch is more than half the sale: the dialog
 * warns, and the first Save only arms it. The tip is unchanged until the second.
 */
export const ASlippedDigitAsksTwice: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const last = SEED_PAYMENTS.at(-1)!;
    await userEvent.click(within(canvasElement).getByRole('button', { name: `Adjust the tip on ${last.orderNumber}` }));
    const dialog = within(await screen.findByRole('dialog'));
    const field = dialog.getByDisplayValue(last.tip.toFixed(2));
    await userEvent.clear(field);
    await userEvent.type(field, '80');
    await expect(document.querySelector('[data-tip-warning]')).not.toBeNull();
    await userEvent.click(dialog.getByRole('button', { name: 'Save tip' }));
    // Armed, not saved.
    await expect(dialog.getByRole('button', { name: 'Yes, tip $80.00' })).toBeTruthy();
    const row = canvasElement.querySelector<HTMLElement>(`[data-payment="${last.id}"]`)!;
    await expect(row.querySelector('[data-tip]')!.textContent).toContain(`$${last.tip.toFixed(2)}`);
    await userEvent.click(dialog.getByRole('button', { name: 'Yes, tip $80.00' }));
    await waitFor(() => expect(row.querySelector('[data-tip]')!.textContent).toContain('$80.00'));
  },
};

/** **A cash tip cannot be adjusted** — it is already in someone's pocket. The row offers nothing to press. */
export const CashCannotBeAdjusted: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const cash = SEED_PAYMENTS.find((p) => p.method === 'cash')!;
    const row = canvasElement.querySelector<HTMLElement>(`[data-payment="${cash.id}"]`)!;
    await expect(within(row).queryByRole('button', { name: /Adjust/ })).toBeNull();
  },
};

/** **Tips by person, and filtering to one.** Tapping a server narrows the list to their payments. */
export const FilterByPerson: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-staff-tips="s-2"]')!);
    const mine = SEED_PAYMENTS.filter((p) => p.staffId === 's-2').length;
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-payment]').length).toBe(mine));
  },
};

/**
 * **A payment taken now shows up here.** Checkout's tip travels apart from its amount, so the ledger
 * can store the sale and the tip separately — which is what makes the tip adjustable at all.
 */
export const APaymentLandsInTheLedger: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={at({
        payments: [
          ...SEED_PAYMENTS,
          { ...SEED_PAYMENTS[0], id: 'P-9999', time: '12:04 PM', amount: 42, tip: 8, orderNumber: '#A-39999' },
        ],
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-payment="P-9999"]')!;
    await expect(row).toBeTruthy();
    await expect(row.textContent).toContain('#A-39999');
    await expect(row.querySelector('[data-tip]')!.textContent).toContain('$8.00');
  },
};
