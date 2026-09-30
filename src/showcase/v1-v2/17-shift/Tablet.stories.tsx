import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SEED_PAYMENTS } from '../../../pos/data/restaurant-seed';
import { SEED_OPEN_SHIFT, SEED_SHIFT_HISTORY } from '../../../pos/data/staff-seed';
import { money } from '../../../pos/logic/cart';
import { drawerWorkings } from '../../../pos/logic/shift';
import type { DrawerEvent } from '../../../pos/state/register-extras';
import { Screen, TODAY_STR, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 17 · Shift / Tablet
 *
 * **The cash drawer: what it should hold and why, dropping cash to the safe, closing and opening.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/shift.tsx`, from `references/072926/17-shift/`: the operator's
 * name and the shift's start, two fields — Ending Cash Total, Ending Check Total — a history table,
 * and a bottom bar of BACK and END SHIFT. The cash drop lived on Orders & Tips.
 *
 * ## What was wrong with it
 *
 * - **Nothing said what the drawer should hold.** The operator keyed a count and trusted that
 *   something, somewhere, compared it.
 * - **The history table was wider than its pane**, unscrollable, its last column cut off mid-word:
 *   "End Checl". And it had no variance column, so a short drawer read like any other.
 * - **No way off the screen but BACK** — no nav, no account, no log out in its app bar.
 * - Only closing was here. Opening a drawer and dropping cash were somewhere else, or nowhere.
 *
 * ## What this does
 *
 * - **Expected cash with its workings**: start cash + cash in (tips included) − cash refunds −
 *   payouts − drops. Derived from the payments and drawer events, never stored.
 * - **The drawer's events**: payouts (from the register's Cash payout) and drops, with who and why.
 * - **Cash drop** — moved here from Orders & Tips — **Close shift** and **Open shift** in the
 *   standard toolbar, with the main nav beside them like every other screen.
 * - **Close** shows the expected figure and a live variance as the count is keyed; $20 or more
 *   either way asks for a second tap.
 * - **History that fits**: expected, counted, a coloured over / short variance, checks and the note.
 */
const meta = {
  title: 'V1 → V2 Migration/17 · Shift/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra = {}) => atVenue('eighteen', { view: 'shift', leftPanelCollapsed: true, ...extra });

/** Dialogs portal into the scaled frame or the body, depending on the viewport. */
const page = (el: HTMLElement) => within(el.ownerDocument.body);
const dialog = async (el: HTMLElement) => within(await page(el).findByRole('dialog'));
const keyIn = async (el: HTMLElement, digits: string) => {
  const d = await page(el).findByRole('dialog');
  for (const k of digits) await userEvent.click(d.querySelector<HTMLElement>(`[data-key="${k}"]`)!);
};
const amount = (el: HTMLElement, k: string) => el.querySelector(`[data-working="${k}"] [data-amount]`)!.textContent;
const expected = (el: HTMLElement) => el.querySelector('[data-expected]')!.textContent;

const seedWorkings = () => drawerWorkings(SEED_OPEN_SHIFT, SEED_PAYMENTS, []);

/**
 * **The workings add up.** Every line is its own figure from the morning's cash, and the total is
 * exactly start + in − refunds − payouts − drops. Nothing to trust blindly.
 */
export const TheWorkingsAddUp: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const w = seedWorkings();
    await expect(amount(canvasElement, 'startCash')).toBe(money(200));
    await expect(amount(canvasElement, 'cashIn')).toBe(money(w.cashIn));
    await expect(w.cashIn).toBeGreaterThan(0);
    await expect(amount(canvasElement, 'cashRefunds')).toBe(money(0));
    await expect(expected(canvasElement)).toBe(money(w.startCash + w.cashIn - w.cashRefunds - w.payouts - w.drops));
  },
};

const payout: DrawerEvent = {
  id: 'DE-0001',
  kind: 'payout',
  amount: 40,
  cashDelta: -40,
  reason: 'winnings',
  recipient: 'Harrington, Cole',
  operator: 's-6',
  date: TODAY_STR,
  time: '11:00 AM',
};

/**
 * **A payout from the register comes off the drawer.** Wave 1's Cash payout is a drawer event, so it
 * appears here, with who received it, and the expected cash is $40 lower.
 */
export const APayoutComesOffTheDrawer: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ drawerEvents: [payout], registerSeq: { held: 0, drawer: 1, giftCard: 0 } })} />,
  play: async ({ canvasElement }) => {
    await expect(amount(canvasElement, 'payouts')).toBe(money(40));
    await expect(expected(canvasElement)).toBe(money(seedWorkings().expected - 40));
    await expect(canvasElement.querySelector('[data-drawer-event="DE-0001"]')!.textContent).toContain('Harrington, Cole');
  },
};

/**
 * **A cash drop lowers the expected cash.** $100 to the safe: it is listed as a drawer event, the
 * Drops line reads $100, and expected falls by exactly that.
 */
export const ACashDropLowersExpected: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const before = seedWorkings().expected;
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Cash drop' }));
    await keyIn(canvasElement, '10000');
    await userEvent.click((await dialog(canvasElement)).getByRole('button', { name: 'Drop $100.00' }));
    await waitFor(() => expect(amount(canvasElement, 'drops')).toBe(money(100)));
    await expect(expected(canvasElement)).toBe(money(before - 100));
    await expect(canvasElement.querySelectorAll('[data-drawer-event]').length).toBe(1);
  },
};

/** **A drop cannot be more than the drawer holds** — v1 took any number. */
export const ADropCannotExceedTheDrawer: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ modal: { kind: 'cashDrop' } })} />,
  play: async ({ canvasElement }) => {
    await keyIn(canvasElement, '99900');
    const d = await dialog(canvasElement);
    await expect(d.getByText(`The drawer should only hold ${money(seedWorkings().expected)}.`)).toBeTruthy();
    await expect(d.getByRole('button', { name: 'Drop $999.00' })).toBeDisabled();
  },
};

/**
 * **Closing records the variance, and the history shows it whole.** The drawer is counted $10 short;
 * SH-206 heads the history with its expected, counted and a red "$10.00 short" — every column
 * inside the pane, nothing cut off. The toolbar now offers Open shift.
 */
export const ClosingRecordsTheVariance: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const exp = seedWorkings().expected;
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close shift' }));
    await keyIn(canvasElement, String(Math.round((exp - 10) * 100)));
    const d = await dialog(canvasElement);
    await expect(d.getByText('$10.00 short')).toBeTruthy();
    await userEvent.type(d.getByPlaceholderText('What explains the difference'), 'Recounted twice');
    await userEvent.click(d.getByRole('button', { name: 'Close shift' }));

    const row = await waitFor(() => {
      const r = canvasElement.querySelector<HTMLElement>('[data-shift-row="SH-206"]');
      if (!r) throw new Error('SH-206 not in history yet');
      return r;
    });
    await expect(canvasElement.querySelector('[data-shift-row]')).toBe(row);
    await expect(row.textContent).toContain(money(exp));
    await expect(row.textContent).toContain(money(exp - 10));
    await expect(row.querySelector('[data-variance="short"]')!.textContent).toBe('$10.00 short');
    await expect(canvasElement.querySelector('[data-shift-note="SH-206"]')!.textContent).toContain('Recounted twice');
    await expect(canvasElement.querySelector('[data-drawer-status]')!.getAttribute('data-drawer-status')).toBe('closed');
    await expect(within(canvasElement).getAllByRole('button', { name: 'Open shift' }).length).toBeGreaterThan(0);
    // Fully readable: the history pane never has to scroll sideways.
    const pane = canvasElement.querySelector<HTMLElement>('[data-shift-history]')!;
    await expect(pane.scrollWidth).toBeLessThanOrEqual(pane.clientWidth);
  },
};

/**
 * **A check paid at the counter is a check expected at close.** v1 asked for a check total with
 * nothing to hold it against. Here a $54.00 check taken this shift shows as expected checks, and the
 * close holds the check count against it.
 */
export const ChecksAreExpectedToo: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={at({
        payments: [
          ...SEED_PAYMENTS,
          { id: 'P-2090', date: TODAY_STR, time: '11:50 AM', method: 'check', amount: 54, tip: 0, orderNumber: '#A-30090', staffId: 's-1', kind: 'sale', ref: { checkNumber: '1042' } },
        ],
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-expected-checks]')!.textContent).toBe('$54.00');
    // Checks are not cash: the expected cash is the seed's, unchanged.
    await expect(expected(canvasElement)).toBe(money(seedWorkings().expected));
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Close shift' }));
    const d = await dialog(canvasElement);
    await expect(d.getByText('$54.00 expected, from the checks taken this shift')).toBeTruthy();
  },
};

/**
 * **Taking a check.** Check is a tender at checkout: the amount is what is due, the number is
 * optional. Once taken, the drawer expects it.
 */
export const TakingACheck: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={atVenue('eighteen', {
        view: 'pos',
        leftPanelCollapsed: false,
        cart: [{ name: 'Titleist Pro V1 Box', price: 54, qty: 1 }],
        modal: { kind: 'tenderCheck' },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const d = await dialog(canvasElement);
    await userEvent.type(d.getByPlaceholderText('Optional — as printed on the check'), '1042');
    const due = page(canvasElement).getByText(/^Check received · /).textContent!.replace('Check received · ', '');
    await userEvent.click(d.getByRole('button', { name: /^Check received/ }));
    await page(canvasElement).findByText(`Check #1042 taken · ${due}`);
  },
};

/**
 * **A large variance asks twice.** $100 counted against $224: the first Close only arms it, with a
 * warning; the history is unchanged until the second tap.
 */
export const ALargeVarianceAsksTwice: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ modal: { kind: 'shiftClose' } })} />,
  play: async ({ canvasElement }) => {
    const short = money(seedWorkings().expected - 100);
    await keyIn(canvasElement, '10000');
    const d = await dialog(canvasElement);
    await userEvent.click(d.getByRole('button', { name: 'Close shift' }));
    const confirm = d.getByRole('button', { name: `Yes, close ${short} short` });
    await expect(canvasElement.querySelector('[data-shift-row="SH-206"]')).toBeNull();
    await userEvent.click(confirm);
    await waitFor(() => expect(canvasElement.querySelector('[data-shift-row="SH-206"]')).not.toBeNull());
  },
};

/**
 * **Opening a new shift.** With no drawer open, Open shift offers the last shift's $200 float; one tap
 * opens SH-207 under the signed-in person, and its workings start from $200.
 */
export const OpeningANewShift: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ drawerShift: null })} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-no-drawer]')).not.toBeNull();
    await userEvent.click(within(canvasElement).getAllByRole('button', { name: 'Open shift' })[0]);
    const d = await dialog(canvasElement);
    await userEvent.click(d.getByRole('button', { name: 'Open with $200.00' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-drawer-status]')!.getAttribute('data-drawer-status')).toBe('open'));
    await expect(canvasElement.querySelector('[data-drawer-status]')!.textContent).toContain('SH-207');
    await expect(amount(canvasElement, 'startCash')).toBe(money(200));
  },
};

/**
 * **The history, readable.** Five closed shifts, each with expected, counted and variance — one over,
 * one short, the rest exact — and the notes that explain them. The pane fits every column.
 */
export const HistoryFitsItsPane: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-shift-row]').length).toBe(SEED_SHIFT_HISTORY.length);
    await expect(canvasElement.querySelector('[data-shift-row="SH-204"] [data-variance]')!.getAttribute('data-variance')).toBe('short');
    await expect(canvasElement.querySelector('[data-shift-row="SH-202"] [data-variance]')!.getAttribute('data-variance')).toBe('over');
    await expect(canvasElement.querySelector('[data-shift-row="SH-205"] [data-variance]')!.getAttribute('data-variance')).toBe('exact');
    const pane = canvasElement.querySelector<HTMLElement>('[data-shift-history]')!;
    await expect(pane.scrollWidth).toBeLessThanOrEqual(pane.clientWidth);
    const last = [...pane.querySelectorAll('th')].at(-1)!;
    await expect(last.textContent).toBe('Checks');
    await expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(pane.getBoundingClientRect().right + 0.5);
  },
};

/** **Weston Edits has no Shift** — the route falls back to the tee sheet. */
export const WestonEditionHasNone: Story = {
  render: () => <Screen edition="weston" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-shift]')).toBeNull();
  },
};
