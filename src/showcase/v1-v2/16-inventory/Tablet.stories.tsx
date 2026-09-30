import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { CATALOG } from '../../../pos/data/catalog';
import { STOCK_ITEMS, seedStock } from '../../../pos/data/stock';
import { stockLevel } from '../../../pos/logic/stock-levels';
import { amountDue } from '../../../pos/state/operations';
import { createInitialState, reducer, type PosState } from '../../../pos/state/pos-store';
import { Screen, atVenue } from '../../pos/screen-helpers';

/**
 * V1 → V2 Migration / 16 · Inventory / Tablet
 *
 * **What is on the shelf — live, taken down by sales — and counting it.**
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/inventory.tsx`, from `references/072926/16-inventory/`: a list of
 * saved counts ("78987", "test", "yeetus"…), a category button in the bottom bar opening a dark sheet
 * upward, a new-count form, and a count sheet of expected against actual.
 *
 * ## What was wrong with it
 *
 * There was **no stock**, only counts. A count's "expected" came from nowhere a person could see,
 * nothing connected it to sales, and saved counts had no category — so the category picker filtered
 * nothing, as v1's own note admits. "How many Pro V1 sleeves do we have?" had no answer short of
 * starting a count. And the register never knew an item was running out.
 *
 * ## What this does
 *
 * - **Live stock** per retail item, by category. Sales take it down; refunds put it back. **Low**
 *   (three or fewer) and **Out** are badged and filterable.
 * - **The register says so too**: a Pro Shop tile shows "3 left" or "Out". Out does not block the
 *   sale — v1 never did, and a shelf can be ahead of its count.
 * - **Counts per category**: the sheet snapshots what the shelf should hold, you key or step what is
 *   there (or ✓ for "matches"), and the variance shows per line and in total, in units and dollars.
 * - **Saving sets stock** to what was counted — only the lines counted. Saved counts are read-only;
 *   a draft can be discarded.
 */
const meta = {
  title: 'V1 → V2 Migration/16 · Inventory/Tablet',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const at = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'inventory', leftPanelCollapsed: true, ...extra });
const register = (extra: Partial<PosState> = {}) => atVenue('eighteen', { view: 'pos', leftPanelCollapsed: false, currentCategory: 'GOLF BALLS', ...extra });
const page = (el: HTMLElement) => within(el.ownerDocument.body);
const stockRow = (el: HTMLElement, name: string) => el.querySelector<HTMLElement>(`[data-stock-row="${name}"]`)!;
const qty = (el: HTMLElement, name: string) => Number(stockRow(el, name).querySelector('[data-qty]')!.textContent);

const seed = seedStock();
const box = 'Titleist Pro V1 Box';
const sleeve = 'Titleist Pro V1 Sleeve';

/** **Live stock.** Every stocked item, its level on the shelf, and a badge where it is low or out. */
export const LiveStock: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-stock-row]').length).toBe(STOCK_ITEMS.length);
    const out = STOCK_ITEMS.find((i) => seed[i.name] === 0)!;
    await expect(stockRow(canvasElement, out.name).querySelector('[data-level-badge="out"]')).not.toBeNull();
    await expect(qty(canvasElement, box)).toBe(seed[box]);
  },
};

/** **Low & out, to reorder from.** One tap lists only what is running out. */
export const LowAndOut: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: /^Low & out/ }));
    const expectedRows = STOCK_ITEMS.filter((i) => stockLevel(seed[i.name]) !== 'ok').length;
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-stock-row]').length).toBe(expectedRows));
    for (const r of canvasElement.querySelectorAll('[data-stock-row]')) await expect(r.getAttribute('data-level')).not.toBe('ok');
  },
};

/**
 * **A saved count sets stock.** Start a Golf balls count, find one fewer Pro V1 box than expected and
 * the Pro V1 sleeves as expected, and save. The count is read-only now, and the shelf reads what was
 * counted. Everything not counted is left as it was.
 */
export const ASavedCountSetsStock: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'New count' }));
    const d = within(await page(canvasElement).findByRole('dialog'));
    const lines = STOCK_ITEMS.filter((i) => i.category === 'GOLF BALLS').length;
    await userEvent.click(d.getByRole('button', { name: `Start counting ${lines} items` }));

    await waitFor(() => expect(canvasElement.querySelector('[data-count-sheet]')).not.toBeNull());
    await expect(canvasElement.querySelectorAll('[data-count-line]').length).toBe(lines);
    await userEvent.click(c.getByRole('button', { name: `One fewer ${box}` }));
    await userEvent.click(c.getByRole('button', { name: `${sleeve} matches` }));
    await expect(canvasElement.querySelector(`[data-count-line="${box}"] [data-line-variance]`)!.textContent).toBe('−1');
    await expect(canvasElement.querySelector(`[data-count-line="${sleeve}"] [data-line-variance]`)!.textContent).toBe('Matches');

    await userEvent.click(c.getByRole('button', { name: 'Save 2 counted' }));
    await waitFor(() => expect(c.queryByRole('button', { name: 'Save 2 counted' })).toBeNull());
    await expect(c.queryByRole('button', { name: `One fewer ${box}` })).toBeNull();

    await userEvent.click(c.getByRole('button', { name: 'All counts' }));
    await userEvent.click(c.getByRole('button', { name: /^Counts/ }));
    await expect(canvasElement.querySelector('[data-count-status="saved"]')).not.toBeNull();
    await userEvent.click(c.getByRole('button', { name: /^Stock/ }));
    await expect(qty(canvasElement, box)).toBe(seed[box] - 1);
    await expect(qty(canvasElement, sleeve)).toBe(seed[sleeve]);
  },
};

/** **A draft can be discarded** — nothing about the stock changes. */
export const DiscardingADraft: Story = {
  render: () => <Screen edition="v1v2" initialState={at()} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'New count' }));
    const d = within(await page(canvasElement).findByRole('dialog'));
    await userEvent.click(d.getByRole('button', { name: /^Start counting/ }));
    await userEvent.click(await c.findByRole('button', { name: `One fewer ${box}` }));
    await userEvent.click(c.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(canvasElement.querySelector('[data-count-sheet]')).toBeNull());
    await expect(qty(canvasElement, box)).toBe(seed[box]);
    await userEvent.click(c.getByRole('button', { name: /^Counts/ }));
    await expect(canvasElement.querySelector('[data-no-counts]')).not.toBeNull();
  },
};

/** Two Pro V1 boxes sold on the register, paid in cash. */
const afterSale = (base: Partial<PosState>): PosState =>
  [
    { type: 'addItem' as const, name: box, price: CATALOG['GOLF BALLS'].items.find((i) => i.n === box)!.p },
    { type: 'addItem' as const, name: box, price: CATALOG['GOLF BALLS'].items.find((i) => i.n === box)!.p },
  ].reduce(reducer, createInitialState(base));

const paid = (s: PosState): PosState => reducer(s, { type: 'recordPayment', method: 'card', amount: amountDue(s) });

/** **A sale takes stock down.** Two Pro V1 boxes sold on the register; Inventory has two fewer. */
export const ASaleLowersStock: Story = {
  render: () => {
    const s = paid(afterSale(at()));
    return <Screen edition="v1v2" initialState={{ ...s, view: 'inventory', cart: [], lastPayment: null }} />;
  },
  play: async ({ canvasElement }) => {
    await expect(qty(canvasElement, box)).toBe(seed[box] - 2);
  },
};

/**
 * **The register flags low stock.** Golf balls on the Pro Shop register: every tile for an item at
 * three or fewer carries "N left", and a sold-out one "Out". Plenty says nothing.
 */
export const TheRegisterFlagsLowStock: Story = {
  render: () => <Screen edition="v1v2" initialState={register()} />,
  play: async ({ canvasElement }) => {
    const balls = STOCK_ITEMS.filter((i) => i.category === 'GOLF BALLS');
    const flagged = balls.filter((i) => stockLevel(seed[i.name]) !== 'ok');
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-stock-badge]').length).toBe(flagged.length));
    const low = flagged.find((i) => seed[i.name] > 0)!;
    const tile = [...canvasElement.querySelectorAll('button')].find((b) => b.textContent?.includes(low.name) && b.querySelector('[data-stock-badge]'))!;
    await expect(tile.querySelector('[data-stock-badge]')!.textContent).toBe(`${seed[low.name]} left`);
  },
};

/** **Searching says it too.** A low item found by search carries the same badge its tile does. */
export const SearchFlagsLowStock: Story = {
  render: () => <Screen edition="v1v2" initialState={register()} />,
  play: async ({ canvasElement }) => {
    const low = STOCK_ITEMS.find((i) => stockLevel(seed[i.name]) === 'low')!;
    await userEvent.type(within(canvasElement).getByPlaceholderText('Search items…'), low.name);
    const row = await waitFor(() => {
      const hit = [...document.querySelectorAll<HTMLElement>('[data-stock-badge]')].find((b) => b.closest('.MuiPopper-root'));
      if (!hit) throw new Error('no badge in the results');
      return hit;
    });
    await expect(row.textContent).toBe(`${seed[low.name]} left`);
  },
};

/**
 * **Selling the last one says Out — and still sells.** The Pro V1 sleeves are at 2; selling both
 * turns the tile's badge to Out. The tile stays enabled: v1 never blocked a sale, and a shelf can be
 * ahead of its count.
 */
export const SellingTheLastOne: Story = {
  render: () => {
    const base = createInitialState(register());
    const s = reducer(reducer({ ...base, stock: { ...base.stock, [sleeve]: 2 } }, { type: 'addItem', name: sleeve, price: 16 }), { type: 'addItem', name: sleeve, price: 16 });
    return <Screen edition="v1v2" initialState={{ ...paid(s), cart: [], lastPayment: null }} />;
  },
  play: async ({ canvasElement }) => {
    const tile = await waitFor(() => {
      const t = [...canvasElement.querySelectorAll('button')].find((b) => b.textContent?.includes(sleeve) && b.querySelector('[data-stock-badge]'));
      if (!t) throw new Error('no badged sleeve tile yet');
      return t;
    });
    await expect(tile.querySelector('[data-stock-badge]')!.getAttribute('data-stock-badge')).toBe('out');
    await expect(tile).not.toBeDisabled();
    await userEvent.click(tile);
    // On the order like anything else.
    await waitFor(() => expect(within(canvasElement).getByRole('button', { name: /^Pay \$/ }).textContent).not.toBe('Pay $0.00'));
  },
};

/** **Weston Edits has none of it** — no badges on the register, and no Inventory screen. */
export const WestonEditionHasNone: Story = {
  render: () => <Screen edition="weston" initialState={register()} />,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('button').length).toBeGreaterThan(20));
    await expect(canvasElement.querySelector('[data-stock-badge]')).toBeNull();
    await expect(canvasElement.querySelector('[data-inventory]')).toBeNull();
  },
};
