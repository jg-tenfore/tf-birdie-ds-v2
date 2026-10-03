import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { COMBOS, comboById } from '../../../pos/data/combos';
import { ALL_GOLFERS } from '../../../pos/data/golfers';
import { addCombo, giftCardLine } from '../../../pos/logic/register-extras';
import { createInitialState, reducer, type PosState } from '../../../pos/state/pos-store';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 1 · Pro Shop / Tablet
 *
 * **The four things the Pro Shop register could do in v1 and could not do here.** Each was
 * audited in v1 (`tf-birdie-ds-v1`) for what it does, and rebuilt the way this register works —
 * not ported. v1's own source comments are candid about what the shipping app gets wrong, and
 * those are the parts left behind.
 *
 * Everything on this page is gated on `useV1V2()`. The base and Weston editions show none of it
 * — the last two stories check exactly that.
 *
 * ## 1. Combos
 *
 * **v1:** a COMBOS button on the bottom bar opened a screen of its own. Tapping a combo rang up
 * each component as its own line, prefixed `[c]`. The seed data was production's, test rows and
 * all — `test1` at $0, a `Sandhill Test` at $2,074, a `Triaxiom Combo` at $100,000.
 *
 * **What was wrong:** a combo split into loose lines is not a combo any more. Remove the beer
 * from "Balls and Beers" and the balls stay at the bundle's price, with nothing on the order to
 * say so; any `[c]` line could be re-priced on its own. And a grid of test rows teaches nobody
 * what a combo is for.
 *
 * **v2:** **Combos** is a category beside the others. A combo rings as **one line at the combo
 * price**, its components listed beneath it as read-only sub-lines. Quantity steps the whole
 * combo; removing it removes the group. Six clean combos, each built from catalog items and
 * priced below the sum of its parts — the saving shows on the tile and the line ("Save $3.50").
 *
 * ## 2. Hold
 *
 * **v1:** HOLD moved the ticket into the restaurant's Tabs list, one collection with bar tabs and
 * table checks, under a ticket number.
 *
 * **What was wrong:** a pro-shop order someone stepped away from is not a bar tab, and finding it
 * again meant scanning the restaurant's list for a number nobody remembered.
 *
 * **v2:** **Hold** on the rail parks the order under a name — the booking's or golfer's, else
 * "Held order N" — and empties the rail. Held orders are their own list, reached from **Held · N**
 * on the rail (only while something is held). They keep everything: lines, golfer, booking link.
 * Resuming onto a rail that already has an order never discards it — it offers to hold that one
 * first, and there is no "replace".
 *
 * ## 3. Cash payout
 *
 * **v1:** an "Add Cash Payout" entry that put a negative line into the sale.
 *
 * **What was wrong:** a payout has no customer and sells nothing. As a line it reduced the bill of
 * whoever happened to be at the counter, printed on their receipt, and went through the order's
 * tax and discount arithmetic.
 *
 * **v2:** **Cash payout** in the rail's cog opens a dialog — amount on a keypad, a reason (Skins /
 * tournament winnings, Refund, Petty cash, Other — Other needs a note), an optional recipient and
 * note. Confirming records a `DrawerEvent` for Shift close to reconcile, and **does not touch the
 * order**.
 *
 * ## 4. Gift card
 *
 * **v1:** a full-screen form with FROM and TO parties, four separate customer lookups each (first
 * name, last name, email, phone), of which only the recipient's match was ever used.
 *
 * **What was wrong:** eight search fields to sell one card, and a second way to look people up that
 * behaved differently from the first.
 *
 * **v2:** **Gift card** opens a dialog: an amount ($25 / $50 / $100 / $200 or Custom), a recipient
 * picked with the register's own golfer picker (a new target on it, not a second picker) or typed
 * for someone not in the system, an optional "from" and message. It adds one line —
 * `Gift card · $50 → Chen, Emily` — untaxed, because a gift card is stored value. The card is
 * **issued when the order is paid**, onto the recipient's customer record; a removed line, or an
 * order never paid, issues nothing.
 */
const meta = {
  title: 'V1 → V2 Migration/1 · Pro Shop/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ─── State ──────────────────────────────────────────────────────────────────

/** The 18-hole club's register, rail open — the V1 → V2 prototype's own club. */
const register = (extra: Partial<PosState> = {}): Partial<PosState> =>
  atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, ...extra });

const chen = ALL_GOLFERS.find((g) => g.name === 'Chen, Emily')!;

const retail: CartItem[] = [
  { name: 'Golf Glove Mens', price: 18, qty: 1 },
  { name: 'Water', price: 2.5, qty: 2 },
];

const withCombo = (id: string, cart: CartItem[] = []) => addCombo(cart, comboById(id)!);

/** Two orders already parked: a golfer's retail, and a combo nobody named. */
const heldTwo = (): Partial<PosState> => ({
  heldOrders: [
    {
      id: 'H-1',
      name: 'Chen, Emily',
      heldAt: '11:52 AM',
      order: { cart: retail, orderSeats: null, selectedGolfer: chen, selectedBookingId: null, flowMode: '', additionalGolfers: [], orderScenario: null },
    },
    {
      id: 'H-2',
      name: 'Held order 2',
      heldAt: '11:58 AM',
      order: { cart: withCombo('combo-cart-bucket'), orderSeats: null, selectedGolfer: null, selectedBookingId: null, flowMode: '', additionalGolfers: [], orderScenario: null },
    },
  ],
  registerSeq: { held: 2, drawer: 0, giftCard: 0 },
});

/** Dialogs portal into the scaled frame or the body, depending on the viewport. */
const page = (el: HTMLElement) => within(el.ownerDocument.body);

const railLines = (el: HTMLElement) => el.querySelectorAll('[data-combo-line], [data-gift-card-line]');

// ─── 1. Combos ──────────────────────────────────────────────────────────────

/**
 * **The Combos category.** Six combos, three to a row, each with its contents and its saving on
 * the tile. No test rows, nothing at $0.
 */
export const CombosCategory: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ currentCategory: 'COMBOS' })} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-combo-tile]').length).toBe(COMBOS.length));
    const tiles = canvasElement.querySelectorAll('[data-combo-tile]');
    for (const t of tiles) await expect(t.querySelector('[data-combo-saving]')).toBeTruthy();
    await expect(canvasElement.querySelector('[data-combo-tile="combo-range-beer"]')!.textContent).toContain('Save $3.50');
  },
};

/**
 * **A combo rings as one line.** Tapping Turn Dog twice gives one line at quantity 2 — not six
 * `[c]` lines — with its components beneath it and the saving for both.
 */
export const RingingAComboAddsOneLine: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ currentCategory: 'COMBOS' })} />,
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector<HTMLElement>('[data-combo-tile="combo-turn-dog"]')!;
    await userEvent.click(tile);
    await userEvent.click(tile);
    await waitFor(() => expect(canvasElement.querySelector('[data-combo-qty]')?.textContent).toBe('2'));
    const line = canvasElement.querySelector<HTMLElement>('[data-combo-line="combo-turn-dog"]')!;
    await expect(canvasElement.querySelectorAll('[data-combo-line]').length).toBe(1);
    await expect([...line.querySelectorAll('[data-combo-component]')].map((c) => c.textContent)).toEqual([
      '2 × Hot Dog',
      '2 × Chips',
      '2 × Soda',
    ]);
    await expect(line.textContent).toContain('$16.00');
    await expect(line.textContent).toContain('Save $5.00');
  },
};

/**
 * **Components can't be taken apart.** The line has one remove and one stepper, both for the whole
 * combo; the components have no controls at all. Removing the combo removes the group and leaves
 * the rest of the order alone.
 */
export const RemovingAComboRemovesTheGroup: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ cart: withCombo('combo-range-beer', retail) })} />,
  play: async ({ canvasElement }) => {
    const line = canvasElement.querySelector<HTMLElement>('[data-combo-line]')!;
    for (const c of line.querySelectorAll('[data-combo-component]')) await expect(c.querySelector('button')).toBeNull();
    await userEvent.click(within(line).getByRole('button', { name: 'Remove Range & a Cold One' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-combo-line]')).toBeNull());
    await expect(canvasElement.textContent).toContain('Golf Glove Mens');
  },
};

// ─── 2. Hold ────────────────────────────────────────────────────────────────

/**
 * **Hold parks the order under a name.** The name is pre-filled with the golfer on the order;
 * holding empties the rail and **Held · 1** appears.
 */
export const HoldParksTheOrder: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ cart: retail, selectedGolfer: chen })} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-held-orders]')).toBeNull();
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-hold-order]')!);
    const p = page(canvasElement);
    await expect(await p.findByDisplayValue('Chen, Emily')).toBeTruthy();
    await userEvent.click(p.getByRole('button', { name: 'Hold order' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-held-orders]')?.getAttribute('data-held-orders')).toBe('1'));
    // The rail stays out: an order on hold is waiting on it.
    await expect(canvasElement.textContent).toContain('No items added yet');
    // Nothing to hold now, so Hold is off.
    await expect(canvasElement.querySelector<HTMLButtonElement>('[data-hold-order]')!.disabled).toBe(true);
  },
};

/**
 * **Resuming onto an empty rail.** Held · 2 opens the list; Resume puts Chen's order back — lines
 * and golfer — and the count drops to 1.
 */
export const ResumeOntoAnEmptyRail: Story = {
  render: () => <Screen edition="v1v2" initialState={register(heldTwo())} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-held-orders]')!);
    const p = page(canvasElement);
    await waitFor(() => expect(p.getByText('Held orders')).toBeTruthy());
    await userEvent.click(canvasElement.ownerDocument.querySelector<HTMLElement>('[data-resume="H-1"]')!);
    await waitFor(() => expect(canvasElement.textContent).toContain('Golf Glove Mens'));
    await expect(canvasElement.textContent).toContain('Chen, Emily');
    await expect(canvasElement.querySelector('[data-held-orders]')!.getAttribute('data-held-orders')).toBe('1');
  },
};

/**
 * **Resuming onto a busy rail asks first.** With an order already on the rail, Resume offers to
 * hold it and then resume — and until that is confirmed, the order on the rail is untouched.
 */
export const ResumeOverABusyRailAsksFirst: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ ...heldTwo(), cart: withCombo('combo-sleeve-glove') })} />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-held-orders]')!);
    await waitFor(() => expect(doc.querySelector('[data-resume="H-1"]')).toBeTruthy());
    await userEvent.click(doc.querySelector<HTMLElement>('[data-resume="H-1"]')!);
    await waitFor(() => expect(doc.querySelector('[data-resume-confirm]')).toBeTruthy());
    // Asked, not done: the current order is still on the rail.
    await expect(canvasElement.querySelector('[data-combo-line="combo-sleeve-glove"]')).toBeTruthy();

    await userEvent.click(page(canvasElement).getByRole('button', { name: 'Hold current & resume' }));
    await waitFor(() => expect(canvasElement.textContent).toContain('Golf Glove Mens'));
    await expect(canvasElement.querySelector('[data-combo-line="combo-sleeve-glove"]')).toBeNull();
    // H-1 left the list, the Sleeve & Glove order joined it: still two held.
    await expect(canvasElement.querySelector('[data-held-orders]')!.getAttribute('data-held-orders')).toBe('2');
  },
};

// ─── 3. Cash payout ─────────────────────────────────────────────────────────

/**
 * **Cash payout lives in the cog.** A register-level action, beside the rail's other
 * not-about-this-line actions.
 */
export const CashPayoutInTheCog: Story = {
  render: () => <Screen edition="v1v2" initialState={register()} />,
  play: async ({ canvasElement }) => {
    // An empty order keeps the rail tucked away (100226); open it on purpose to reach the cog.
    await userEvent.click(await within(canvasElement).findByRole('button', { name: 'Expand the order rail' }));
    await userEvent.click(await within(canvasElement).findByTitle('Order settings'));
    const p = page(canvasElement);
    await userEvent.click(await p.findByRole('menuitem', { name: /Cash payout/ }));
    await waitFor(() => expect(p.getByText('Cash out of the drawer — not a sale, and not part of any order')).toBeTruthy());
  },
};

/**
 * **A payout doesn't touch the order.** $40 of skins winnings paid out with an order on the rail:
 * the order's lines and its total are exactly what they were, and the drawer has one event.
 */
export const PayingOutLeavesTheOrderAlone: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ cart: retail, modal: { kind: 'cashPayout' } })} />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const p = page(canvasElement);
    // The rail sits behind the dialog (aria-hidden), so read the Pay button by its text.
    const payText = () => [...canvasElement.querySelectorAll('button')].find((b) => /^Pay \$/.test(b.textContent ?? ''))?.textContent;
    await waitFor(() => expect(doc.querySelector('[data-key="4"]')).toBeTruthy());
    const payBefore = payText();
    await expect(payBefore).toBe('Pay $24.84');
    for (const k of ['4', '0', '0', '0']) await userEvent.click(doc.querySelector<HTMLElement>(`[data-key="${k}"]`)!);
    await userEvent.click(doc.querySelector<HTMLElement>('[data-reason="winnings"]')!);
    await userEvent.type(p.getByPlaceholderText('Who is receiving the cash'), 'Harrington, Cole');
    await userEvent.click(p.getByRole('button', { name: 'Pay out $40.00' }));
    await waitFor(() => expect(doc.querySelector('[data-key="4"]')).toBeNull());

    await expect(payText()).toBe(payBefore);
    await expect(canvasElement.textContent).toContain('Golf Glove Mens');

    // The drawer remembers it: reopening the dialog says so.
    await userEvent.click(within(canvasElement).getByTitle('Order settings'));
    await userEvent.click(await p.findByRole('menuitem', { name: /Cash payout/ }));
    await waitFor(() => expect(doc.querySelector('[data-drawer-summary]')?.textContent).toBe('1 payout this session · $40.00'));
  },
};

/** **"Other" has to say what it is.** The confirm stays off until the note is written. */
export const OtherNeedsANote: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ modal: { kind: 'cashPayout' } })} />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const p = page(canvasElement);
    await waitFor(() => expect(doc.querySelector('[data-key="2"]')).toBeTruthy());
    for (const k of ['2', '0', '00']) await userEvent.click(doc.querySelector<HTMLElement>(`[data-key="${k}"]`)!);
    await userEvent.click(doc.querySelector<HTMLElement>('[data-reason="other"]')!);
    const confirm = p.getByRole('button', { name: 'Pay out $20.00' });
    await expect(confirm).toBeDisabled();
    await expect(doc.querySelector('[data-payout-problem]')?.textContent).toContain('Other');
    await userEvent.type(p.getByPlaceholderText('Saturday skins, 3 winners'), 'Fuel for the ranger cart');
    await waitFor(() => expect(confirm).toBeEnabled());
  },
};

// ─── 4. Gift card ───────────────────────────────────────────────────────────

/**
 * **Selling a card to someone on the roster.** Gift card → $100 → Find a customer opens the
 * register's own golfer picker, which returns to the card with the choice made. One line lands
 * on the order.
 */
export const GiftCardForACustomer: Story = {
  render: () => <Screen edition="v1v2" initialState={register()} />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const p = page(canvasElement);
    await userEvent.click(within(canvasElement).getByRole('button', { name: /Gift card/ }));
    await waitFor(() => expect(doc.querySelector('[data-amount="100"]')).toBeTruthy());
    await userEvent.click(doc.querySelector<HTMLElement>('[data-amount="100"]')!);
    await userEvent.click(doc.querySelector<HTMLElement>('[data-find-recipient]')!);
    await waitFor(() => expect(p.getByText('Gift card for…')).toBeTruthy());
    await userEvent.click(p.getAllByText('Chen, Emily')[0]);
    // Back on the card, $100 still chosen.
    await waitFor(() => expect(doc.querySelector(`[data-gift-recipient="${chen.id}"]`)).toBeTruthy());
    await expect(doc.querySelector('[data-amount="100"]')!.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(p.getByRole('button', { name: 'Add to order · $100.00' }));
    await waitFor(() => expect(railLines(canvasElement).length).toBe(1));
    await expect(canvasElement.querySelector('[data-gift-card-line]')!.textContent).toContain('Gift card · $100 → Chen, Emily');
  },
};

/**
 * **Someone not in the system.** Type a name (and an email if there is one) instead of searching.
 * The line says the card is not going onto a record.
 */
export const GiftCardForSomeoneNew: Story = {
  render: () => <Screen edition="v1v2" initialState={register({ modal: { kind: 'giftCard' } })} />,
  play: async ({ canvasElement }) => {
    const p = page(canvasElement);
    await userEvent.type(await p.findByPlaceholderText('Name'), 'Scott, Leon');
    await userEvent.type(p.getByPlaceholderText('Who is giving it'), 'Dad');
    await userEvent.click(p.getByRole('button', { name: 'Add to order · $50.00' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-gift-card-line]')).toBeTruthy());
    const line = canvasElement.querySelector('[data-gift-card-line]')!;
    await expect(line.textContent).toContain('Gift card · $50 → Scott, Leon');
    await expect(line.textContent).toContain('Not on the roster · from Dad');
  },
};

/**
 * **Untaxed on the order.** A $50 card beside an $18 glove: tax is 8% of the glove, $1.44, and the
 * order pays $69.44. A gift card is stored value — tax is charged when it is spent.
 */
export const GiftCardIsNotTaxed: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={register({
        cart: [giftCardLine('GC-0001', { amount: 50, recipient: { name: chen.name, customerId: chen.id } }), retail[0]],
        registerSeq: { held: 0, drawer: 0, giftCard: 1 },
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Pay $69.44' })).toBeTruthy();
    await expect(canvasElement.querySelector('[data-gift-card-line]')!.textContent).toContain('Issued when this order is paid');
  },
};

/**
 * **Issued when paid — onto the customer record.** The order with Chen's $100 card has been paid;
 * her record's Gift cards section now lists it at full balance, with the UPC derived from the
 * card id and five years to expiry.
 */
export const IssuedCardOnTheRecord: Story = {
  render: () => {
    const paid = [
      { type: 'addGiftCardLine' as const, draft: { amount: 100, recipient: { name: chen.name, customerId: chen.id } } },
      { type: 'recordPayment' as const, method: 'card', amount: 100 },
    ].reduce(reducer, createInitialState(register()));
    return <Screen edition="v1v2" initialState={{ ...paid, customerModal: { customerId: chen.id } }} />;
  },
  play: async ({ canvasElement }) => {
    const p = page(canvasElement);
    await waitFor(() => expect(p.getByText('600400000001')).toBeTruthy());
    await expect(p.getByText('05/21/2031')).toBeTruthy();
  },
};

// ─── Scope ──────────────────────────────────────────────────────────────────

const assertNoneOfThis = async (canvasElement: HTMLElement) => {
  await expect(canvasElement.querySelector('[data-register-categories]')).toBeNull();
  await expect(canvasElement.querySelector('[data-hold-order]')).toBeNull();
  await expect(canvasElement.querySelector('[data-held-orders]')).toBeNull();
  await userEvent.click(within(canvasElement).getByTitle('Order settings'));
  const p = page(canvasElement);
  await expect(await p.findByRole('menuitem', { name: /Tax Exempt/ })).toBeTruthy();
  await expect(p.queryByRole('menuitem', { name: /Cash payout/ })).toBeNull();
};

/**
 * **Weston Edits has none of this.** No Combos or Gift card row, no Hold, no Held bar and no Cash
 * payout in the cog — even with held orders sitting in state, which nothing in Weston can reach.
 */
export const WestonEditionHasNoneOfThis: Story = {
  render: () => <Screen edition="weston" initialState={register({ ...heldTwo(), cart: retail })} />,
  play: async ({ canvasElement }) => assertNoneOfThis(canvasElement),
};

/** **Nor does the base edition** — the one a previous change leaked into. */
export const BaseEditionHasNoneOfThis: Story = {
  render: () => <Screen edition="base" initialState={register({ ...heldTwo(), cart: retail })} />,
  play: async ({ canvasElement }) => assertNoneOfThis(canvasElement),
};
