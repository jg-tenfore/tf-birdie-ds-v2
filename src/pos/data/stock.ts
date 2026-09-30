import type { CartItem } from '../types';
import { CATALOG } from './catalog';

/**
 * Stock on the shelf (V1 → V2, Wave 3).
 *
 * v1's Inventory counted stock against an "expected" number that came from nowhere: its saved counts
 * carried no category, and nothing linked a count to what had been sold (v1's own note flags the
 * gap). Justin's choice for V1 → V2: **live stock that sales take down.** Every retail item has a
 * level; a sale of a sleeve of balls leaves one fewer; a count compares the shelf with that number,
 * and the difference is shrinkage. Saving a count sets the level to what was actually there.
 *
 * Keyed by the item's name, because that is what a register line carries. Only retail categories are
 * stocked — a green fee, a rental set or a service is not something on a shelf — and restaurant dishes
 * are not: the kitchen's stock is ingredients, which is another system.
 */

export const STOCKED_CATEGORIES = ['GOLF BALLS', 'APPAREL', 'ACCESSORIES', 'SNACKS', 'DRINKS', 'ALCOHOL'] as const;
export type StockedCategory = (typeof STOCKED_CATEGORIES)[number];

/** At or below this, the register flags the item and Inventory lists it as low. */
export const LOW_STOCK = 3;

export interface StockItem {
  name: string;
  category: StockedCategory;
  price: number;
}

export const STOCK_ITEMS: StockItem[] = STOCKED_CATEGORIES.flatMap((category) =>
  (CATALOG[category]?.items ?? []).map((i) => ({ name: i.n, category, price: i.p })),
);

const stocked = new Set(STOCK_ITEMS.map((i) => i.name));
export const isStocked = (name: string): boolean => stocked.has(name);

/** FNV-1a, as every fixture here, so the seeded shelf is the same everywhere. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A believable shelf: plenty of the everyday things, a few running low, one sold out — so the
 * low-stock flag and a count's shrinkage both have something to show.
 */
export function seedStock(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of STOCK_ITEMS) {
    const h = hash(item.name);
    const bucket = h % 10;
    out[item.name] = bucket === 0 ? 0 : bucket <= 2 ? 1 + (h % LOW_STOCK) : 6 + (h % 30);
  }
  return out;
}

/**
 * How many of each stocked item a line takes off the shelf. A combo is its components; anything not
 * stocked takes nothing.
 */
export function stockUsedBy(line: CartItem): { name: string; qty: number }[] {
  if (line.combo) {
    return line.combo.components.filter((c) => isStocked(c.name)).map((c) => ({ name: c.name, qty: c.qty * line.qty }));
  }
  return isStocked(line.name) ? [{ name: line.name, qty: line.qty }] : [];
}

/** Apply lines to the shelf: `sign` −1 for a sale, +1 for a refund. Never below zero. */
export function applyStock(stock: Record<string, number>, lines: CartItem[], sign: 1 | -1): Record<string, number> {
  const next = { ...stock };
  for (const l of lines) {
    for (const u of stockUsedBy(l)) next[u.name] = Math.max(0, (next[u.name] ?? 0) + sign * u.qty);
  }
  return next;
}

export interface InventoryCount {
  id: string;
  title: string;
  category: StockedCategory;
  date: string;
  staffId: string;
  /** `expected` is the shelf's level when the count began; `counted` is what a person found. */
  lines: { name: string; expected: number; counted: number | null }[];
  status: 'draft' | 'saved';
  savedAt?: string;
}
