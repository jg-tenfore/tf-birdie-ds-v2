import type { CustomerGiftCard } from '../data/customers';
import { DEFAULT_GIFT_CATEGORIES, spendCategoryOf, type SpendCategory } from '../data/spend';
import type { CartItem } from '../types';
import { orderTotals } from './cart';

/**
 * The rules behind Wave 3's tenders (V1 → V2): what a gift card may pay, and what is still due.
 */

/** What a card is good for — its own list, or the default for a card issued before categories. */
export const cardCategories = (card: Pick<CustomerGiftCard, 'categories'>): SpendCategory[] =>
  card.categories ?? DEFAULT_GIFT_CATEGORIES;

/**
 * How much of an order a gift card may pay: the lines it is good for, with their share of the tax,
 * capped at the card's balance and at what is still due.
 *
 * This is what makes a category mean anything. Without it, "not good for alcohol" is a label on a
 * card that pays for the beer anyway. With it, a $50 card against a burger and two beers pays for the
 * burger, and checkout says so — the beers go on another tender.
 *
 * `paidByCards` is what earlier gift cards on a split tender have already paid. Without it a second
 * card is offered the burger's share again — and, the burger being paid, ends up paying the beer.
 * It assumes the earlier cards were good for the same lines, which every card on the default is;
 * otherwise it errs toward offering less, never toward lines the card is not good for.
 */
export function giftCardCovers(
  card: Pick<CustomerGiftCard, 'balance' | 'categories'>,
  cart: CartItem[],
  due: number,
  paidByCards = 0,
): number {
  const allowed = new Set(cardCategories(card));
  const lines = cart.filter((l) => !l.isTax && l.name !== 'Taxes');
  const eligible = lines.filter((l) => {
    const c = spendCategoryOf(l);
    return c !== null && allowed.has(c);
  });
  if (eligible.length === 0) return 0;
  const all = orderTotals(cart);
  const goodsAll = all.subtotal;
  const goodsOk = orderTotals(eligible).subtotal;
  // The eligible lines' share of the tax, proportionally — the same rule a refund uses.
  const share = goodsAll > 0 ? goodsOk + (goodsOk / goodsAll) * all.tax : 0;
  return Math.max(0, Math.round(Math.min(card.balance, Math.max(0, share - paidByCards), due) * 100) / 100);
}

/** The lines a card may not pay for, for checkout to name. */
export function linesACardCannotPay(card: Pick<CustomerGiftCard, 'categories'>, cart: CartItem[]): CartItem[] {
  const allowed = new Set(cardCategories(card));
  return cart.filter((l) => !l.isTax && l.name !== 'Taxes').filter((l) => {
    const c = spendCategoryOf(l);
    return c === null || !allowed.has(c);
  });
}
