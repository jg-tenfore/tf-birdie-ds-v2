import type { CartItem } from '../types';
import { CATALOG } from './catalog';
import { menuItem } from './menu';

/**
 * What kind of thing a line on an order is (V1 → V2, Wave 3).
 *
 * Needed so a gift card can say what it is good for — and mean it. v1's gift card carried four
 * spend categories (`tf-birdie-ds-v1/app/src/screens/create-gift-card.tsx`), all ticked on every new
 * card, alcohol included; v1's own note calls that "worth a decision rather than a default". Justin's
 * decision: **everything but alcohol**, unless someone turns it on for that card. And since a
 * category nobody checks is only a label, checkout enforces it: a card pays only for the lines it is
 * good for.
 */

export type SpendCategory = 'merchandise' | 'fnb' | 'tee' | 'alcohol';

export const SPEND_CATEGORIES: { id: SpendCategory; label: string }[] = [
  { id: 'merchandise', label: 'Merchandise' },
  { id: 'fnb', label: 'Food & beverage' },
  { id: 'tee', label: 'Tee fees' },
  { id: 'alcohol', label: 'Alcohol' },
];

/** Justin's default for a new card. */
export const DEFAULT_GIFT_CATEGORIES: SpendCategory[] = ['merchandise', 'fnb', 'tee'];

/** Register catalog categories, by what they are. `CHECK IN` is golf, so tee fees. */
const CATALOG_SPEND: Record<string, SpendCategory> = {
  'CHECK IN': 'tee',
  RENTALS: 'merchandise',
  'GOLF BALLS': 'merchandise',
  APPAREL: 'merchandise',
  ACCESSORIES: 'merchandise',
  SNACKS: 'fnb',
  DRINKS: 'fnb',
  ALCOHOL: 'alcohol',
  PACKAGES: 'tee',
  MEMBERSHIP: 'tee',
  SERVICES: 'merchandise',
  PROMOTIONS: 'merchandise',
  'HIGH SPEED': 'merchandise',
};

/** Menu categories that are alcohol. Everything else on a menu is food and beverage. */
const ALCOHOL_MENU = new Set(['Beer', 'Wine']);

const catalogCategoryOf: Map<string, string> = new Map(
  Object.entries(CATALOG).flatMap(([cat, def]) => def.items.map((i) => [i.n, cat] as const)),
);

/**
 * The spend category of a line, or `null` for a line no gift card may pay for — a gift card itself
 * (a card cannot buy a card) or a payment onto a house account (that is paying a debt, not buying).
 */
export function spendCategoryOf(line: CartItem): SpendCategory | null {
  if (line.giftCard || line.accountPayment || line.eventBill) return null;
  if (line.isCheckIn || line.resourceBookingId) return 'tee';
  if (line.dish) {
    const item = menuItem(line.dish.menuItemId);
    return item && ALCOHOL_MENU.has(item.category) ? 'alcohol' : 'fnb';
  }
  const cat = catalogCategoryOf.get(line.name);
  if (cat) return CATALOG_SPEND[cat] ?? 'merchandise';
  // A combo is its components; the register only sells retail combos, so merchandise unless it
  // carries a drink the catalog calls alcohol.
  if (line.combo) {
    return line.combo.components.some((c) => catalogCategoryOf.get(c.name) === 'ALCOHOL') ? 'alcohol' : 'merchandise';
  }
  return 'merchandise';
}
