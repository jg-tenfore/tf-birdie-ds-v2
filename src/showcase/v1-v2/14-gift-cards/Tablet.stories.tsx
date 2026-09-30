import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { customers } from '../../../pos/data/customers';
import { orderTotals } from '../../../pos/logic/cart';
import { giftCardCanPay } from '../../../pos/logic/customer-search';
import { allGiftCards } from '../../../pos/state/operations';
import type { PosState } from '../../../pos/state/pos-store';
import type { CartItem } from '../../../pos/types';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 14 · Gift Cards / Tablet
 *
 * **Every card the course has out, what is left on each, what each may pay for — and checkout holding
 * a card to it.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/gift-cards.tsx` and `create-gift-card.tsx`, from
 * `references/072926/14-giftcards/` and `createGiftCard/`: a search field and SEARCH button over eight
 * equal columns, opening on a bare canvas. Selling a card chose a type and four spend categories —
 * all four ticked by default, alcohol included.
 *
 * ## What was wrong with it
 *
 * - **A spent card was only a dimmer row.** No badge, no column — it read as disabled as easily as empty.
 * - **The categories were a label.** Chosen at sale, never shown again, never checked at checkout: a
 *   card "not for alcohol" paid for the beer anyway. And the default card was good for alcohol.
 * - **It opened empty**, with no "no results" copy, so empty and missing looked the same.
 *
 * ## What this does
 *
 * - **Opens on every card**, searched live by holder, number or UPC; a **SPENT** badge and a filter.
 * - **Good for** on every card. New cards default to **everything but alcohol** (Justin's decision),
 *   and the sale dialog carries v1's type and categories.
 * - **Checkout enforces them.** A card pays the lines it is good for, with their share of the tax,
 *   capped at its balance; the lines it can't pay are named and stay due. When it can't cover the
 *   order it pays part, and checkout shows each tender and the balance due.
 * - None of it exists in Weston Edits.
 */
const meta = {
  title: 'V1 → V2 Migration/14 · Gift Cards/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'giftcards', leftPanelCollapsed: true, ...extra });

/** Chris Moreno's $25 card, spent to nothing. */
const moreno = customers.find((c) => c.id === '458348')!;
const spentMoreno: PosState['customerEdits'] = {
  [moreno.id]: { giftCards: moreno.giftCards.map((g) => (g.id === '261906' ? { ...g, spent: g.awarded, balance: 0 } : g)) },
};

/** Two burgers and two beers. The beers are alcohol; a default card is not good for them. */
const burgersAndBeers: CartItem[] = [
  { name: 'Hamburger', price: 8, qty: 2 },
  { name: 'Beer Domestic', price: 5, qty: 2 },
];
const atCheckout = (cart: CartItem[], modal: PosState['modal'], extra: Partial<PosState> = {}) =>
  atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, cart, modal, ...extra });

const option = async (id: string) =>
  waitFor(() => {
    const el = document.querySelector<HTMLElement>(`[data-gift-card-option="${id}"]`);
    if (!el) throw new Error(`no card ${id}`);
    return el;
  });

/** **Every card, on open.** v1 opened on a bare canvas; this is the whole list, with the totals over it. */
export const EveryCard: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const all = allGiftCards({ customerEdits: {}, issuedGiftCards: [] });
    await expect(canvasElement.querySelectorAll('[data-gift-card-row]').length).toBe(all.length);
    await expect(canvasElement.querySelector('[data-stat="Cards"]')!.textContent).toContain(String(all.length));
    // A card issued before categories reads as the default — everything but alcohol.
    const row = canvasElement.querySelector<HTMLElement>('[data-gift-card-row="261902"]')!;
    await expect(row.querySelector('[data-good-for]')!.textContent).toBe('MerchandiseF&BTee fees');
  },
};

/** **Search is live** — holder, card number or UPC, no SEARCH button. */
export const SearchByHolder: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByRole('textbox', { name: 'Search gift cards' }), 'Brennevin');
    const expected = allGiftCards({ customerEdits: {}, issuedGiftCards: [] }).filter((x) => x.holder.toLowerCase().includes('brennevin')).length;
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-gift-card-row]').length).toBe(expected));
    await userEvent.clear(within(canvasElement).getByRole('textbox', { name: 'Search gift cards' }));
    await userEvent.type(within(canvasElement).getByRole('textbox', { name: 'Search gift cards' }), 'zzzz');
    await waitFor(() => expect(canvasElement.querySelector('[data-no-gift-cards]')).not.toBeNull());
  },
};

/**
 * **A spent card is badged**, not just dimmed — and the Spent filter finds every one. Chris Moreno's
 * $25 card has nothing left on it.
 */
export const ASpentCardIsBadged: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ customerEdits: spentMoreno })} />,
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-gift-card-row="261906"]')!;
    await expect(row.querySelector('[data-spent]')!.textContent).toBe('SPENT');
    await expect(canvasElement.querySelector('[data-gift-card-row="261907"] [data-spent]')).toBeNull();
    await userEvent.click(canvasElement.querySelector<HTMLElement>('[data-gift-filter="spent"]')!);
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-gift-card-row]').length).toBe(1));
    await expect(canvasElement.querySelector('[data-stat="Spent"]')!.textContent).toContain('1');
  },
};

/** **…and on the customer record**, where "do I still have that gift card" is usually asked. */
export const SpentOnTheCustomerRecord: Story = {
  render: () => <Screen edition="v1v2" initialState={at({ customerEdits: spentMoreno, customerModal: { customerId: moreno.id } })} />,
  play: async () => {
    const d = await screen.findByRole('dialog');
    await expect(d.querySelectorAll('[data-spent]').length).toBe(1);
    await expect(d.textContent).toContain('Good for merchandise, f&b, tee fees');
  },
};

/**
 * **A gift card, and a beer on the order.** Rufus's $200 card is on the default — everything but
 * alcohol. Against two burgers and two beers it pays the burgers and their share of the tax, names the
 * beers it can't pay, and pays part. Checkout comes back with the card's payment and the balance due —
 * the beers, for the next tender.
 */
export const APartPaymentWithABeerOnIt: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout(burgersAndBeers, { kind: 'tenderGiftCard' })} />,
  play: async () => {
    const d = within(await screen.findByRole('dialog'));
    await userEvent.type(d.getByRole('textbox'), '261902');
    await userEvent.click(await option('261902'));

    const total = orderTotals(burgersAndBeers).total;
    const pays = giftCardCanPay({ balance: 200 }, burgersAndBeers, total, null);
    const left = Math.round((total - pays) * 100) / 100;
    await expect(document.querySelector('[data-card-pays]')!.getAttribute('data-card-pays')).toBe(pays.toFixed(2));
    await expect(document.querySelector('[data-cannot-line="Beer Domestic"]')!.textContent).toContain('alcohol');
    await expect(document.querySelector('[data-cannot-line="Hamburger"]')).toBeNull();

    await userEvent.click(d.getByRole('button', { name: `Pay $${pays.toFixed(2)} · $${left.toFixed(2)} left due` }));
    const split = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-split-tender]');
      if (!el) throw new Error('checkout has not come back');
      return el;
    });
    await expect(split.textContent).toContain('Paid · Gift card');
    await expect(split.textContent).toContain(`Balance due$${left.toFixed(2)}`);
  },
};

/** **A card that covers the order pays it**, and checkout closes. Two burgers and a Gatorade are all things a default card buys. */
export const ACardThatCoversItAll: Story = {
  render: () => (
    <Screen
      edition="v1v2"
      initialState={atCheckout(
        [
          { name: 'Hamburger', price: 8, qty: 2 },
          { name: 'Gatorade', price: 3.5, qty: 1 },
        ],
        { kind: 'tenderGiftCard' },
      )}
    />
  ),
  play: async () => {
    const d = within(await screen.findByRole('dialog'));
    await userEvent.type(d.getByRole('textbox'), 'Rufus');
    await userEvent.click(await option('261902'));
    await expect(document.querySelector('[data-card-cannot-pay]')).toBeNull();
    const total = orderTotals([
      { name: 'Hamburger', price: 8, qty: 2 },
      { name: 'Gatorade', price: 3.5, qty: 1 },
    ]).total.toFixed(2);
    await userEvent.click(d.getByRole('button', { name: `Pay $${total}` }));
    await screen.findByText(`Paid $${total} with gift card #261902`);
  },
};

/** **A spent card can't be chosen.** It is listed — so nobody wonders whether it was found — badged, and disabled. */
export const ASpentCardCannotPay: Story = {
  render: () => <Screen edition="v1v2" initialState={atCheckout(burgersAndBeers, { kind: 'tenderGiftCard' }, { customerEdits: spentMoreno })} />,
  play: async () => {
    const d = within(await screen.findByRole('dialog'));
    await userEvent.type(d.getByRole('textbox'), 'Moreno');
    const spent = await option('261906');
    await expect(spent.querySelector('[data-spent]')).not.toBeNull();
    await expect(spent).toBeDisabled();
    await expect(await option('261907')).not.toBeDisabled();
  },
};

/**
 * **Selling a card: type, and what it is good for.** The register's gift-card dialog carries v1's four
 * types and four categories. Alcohol starts **off** — turn it on for this card if it is meant to buy a
 * drink.
 */
export const SellingACard: Story = {
  render: () => <Screen edition="v1v2" initialState={atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, modal: { kind: 'giftCard' } })} />,
  play: async () => {
    await screen.findByRole('dialog');
    const pressed = (sel: string) => document.querySelector(sel)!.getAttribute('aria-pressed');
    await expect(pressed('[data-card-type="Purchased"]')).toBe('true');
    await expect(pressed('[data-card-category="merchandise"]')).toBe('true');
    await expect(pressed('[data-card-category="fnb"]')).toBe('true');
    await expect(pressed('[data-card-category="tee"]')).toBe('true');
    await expect(pressed('[data-card-category="alcohol"]')).toBe('false');
    await userEvent.click(document.querySelector<HTMLElement>('[data-card-category="alcohol"]')!);
    await userEvent.click(document.querySelector<HTMLElement>('[data-card-type="Promotional"]')!);
    await expect(pressed('[data-card-category="alcohol"]')).toBe('true');
    await expect(pressed('[data-card-type="Promotional"]')).toBe('true');
    await expect(pressed('[data-card-type="Purchased"]')).toBe('false');
  },
};

/**
 * **None of this is in Weston Edits.** `#/gift-cards` falls back to the tee sheet, the customer record
 * shows no spent badge, and the sale dialog has no type or categories.
 */
export const NotInWestonEdits: Story = {
  render: () => (
    <>
      <Screen edition="weston" initialState={at()} />
      <Screen edition="weston" initialState={at({ customerEdits: spentMoreno, customerModal: { customerId: moreno.id } })} />
    </>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-gift-cards]')).toBeNull();
    await screen.findByRole('dialog');
    await expect(document.querySelector('[data-spent]')).toBeNull();
    await expect(document.querySelector('[data-card-category]')).toBeNull();
  },
};
