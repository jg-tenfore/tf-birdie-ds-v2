import { LOW_STOCK, STOCK_ITEMS, type InventoryCount } from '../data/stock';

/**
 * How stock reads on screen (V1 → V2, Wave 3): the register's "3 left" / "Out" badge, Inventory's
 * low and out filters, and what a stock count found. Pure, so the badge on a tile and the badge in
 * Inventory cannot disagree about where "low" starts.
 */

export type StockLevel = 'out' | 'low' | 'ok';

export const stockLevel = (qty: number): StockLevel => (qty <= 0 ? 'out' : qty <= LOW_STOCK ? 'low' : 'ok');

/** The register tile's badge — nothing while there is plenty. */
export function stockBadge(qty: number): string | null {
  const level = stockLevel(qty);
  return level === 'out' ? 'Out' : level === 'low' ? `${qty} left` : null;
}

const priceOf = new Map(STOCK_ITEMS.map((i) => [i.name, i.price]));

export interface CountSummary {
  lines: number;
  counted: number;
  /** Counted minus expected, over the counted lines: negative is shrinkage. */
  units: number;
  /** The same at retail price. */
  value: number;
  /** Lines that differ from what the shelf should have held. */
  differing: number;
}

/**
 * What a count found. Uncounted lines are left out entirely — saving sets only what somebody
 * actually counted, so a line nobody reached is not "zero on the shelf".
 */
export function countSummary(count: Pick<InventoryCount, 'lines'>): CountSummary {
  let counted = 0;
  let units = 0;
  let value = 0;
  let differing = 0;
  for (const l of count.lines) {
    if (l.counted == null) continue;
    counted += 1;
    const d = l.counted - l.expected;
    units += d;
    value += d * (priceOf.get(l.name) ?? 0);
    if (d !== 0) differing += 1;
  }
  return { lines: count.lines.length, counted, units, value: Math.round(value * 100) / 100, differing };
}
