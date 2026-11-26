import { DEMO_TODAY } from './bookings';
import { ACCOUNTING_CATEGORIES, type AccountingCategory, type DiscountKind } from './discount-types';

/**
 * Promo codes the counter accepts (Nov 26, "checkout that's right"). The cog's **Promo Code** used to
 * toast "enter at checkout" and do nothing; a code now applies as an order discount with its name, in
 * Buck's discount kinds and categories.
 *
 * Buck has no promo-code screen in the prototypes this was built from, so the table is **invented** —
 * a small, fixed set that exercises each case the counter has to handle: a percentage, dollars off a
 * tee fee, a code limited to merchandise, a code with a minimum, and an expired one.
 */
export interface PromoCode {
  code: string;
  label: string;
  kind: Exclude<DiscountKind, 'costPlus'>;
  value: number;
  categories: AccountingCategory[];
  /** `MM/DD/YYYY`, the last day it is good. */
  expires?: string;
  /** The order must charge at least this, in the code's categories. */
  minimum?: number;
}

export const PROMO_CODES: PromoCode[] = [
  { code: 'SPRING10', label: 'Promo SPRING10 · 10% off', kind: 'percent', value: 10, categories: [...ACCOUNTING_CATEGORIES], expires: '06/30/2026' },
  { code: 'PROSHOP15', label: 'Promo PROSHOP15 · 15% off merchandise', kind: 'percent', value: 15, categories: ['Merchandise', 'Equipment'] },
  { code: 'TWILIGHT5', label: 'Promo TWILIGHT5 · $5.00 off the tee fee', kind: 'amount', value: 5, categories: ['Tee Fees'] },
  { code: 'FOURSOME20', label: 'Promo FOURSOME20 · $20.00 off $200', kind: 'amount', value: 20, categories: ['Tee Fees'], minimum: 200 },
  { code: 'WINTER25', label: 'Promo WINTER25 · 25% off', kind: 'percent', value: 25, categories: [...ACCOUNTING_CATEGORIES], expires: '02/28/2026' },
];

export const promoByCode = (code: string): PromoCode | undefined => PROMO_CODES.find((p) => p.code === code.trim().toUpperCase());

/** `MM/DD/YYYY` is before `today`. */
export function isPromoExpired(p: PromoCode, today: Date = DEMO_TODAY()): boolean {
  if (!p.expires) return false;
  const [m, d, y] = p.expires.split('/').map(Number);
  return new Date(y, m - 1, d, 23, 59).getTime() < today.getTime();
}
