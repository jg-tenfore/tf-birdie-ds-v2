import { describe, expect, it } from 'vitest';
import { DISCOUNT_TYPES } from '../data/discount-types';
import { isPromoExpired, promoByCode } from '../data/promo-codes';
import type { CartItem } from '../types';
import { lineNets, linePayable, lineTotals, orderTotals } from './cart';
import { applied, discountLines, lineDiscountOffers, orderDiscountOffers, promoDiscount, promoProblem } from './discounts';
import { buckPricing } from './pricing';

const type = (name: string) => DISCOUNT_TYPES.find((d) => d.description === name)!;
const polo: CartItem = { name: 'Golf Polo Course Logo', price: 55, qty: 2 };
const beer: CartItem = { name: 'Beer Domestic', price: 5, qty: 2 };
const round = (players: number): CartItem => ({
  name: 'Guest Rate 18 Holes',
  unitPrice: 59,
  price: 59 * players,
  qty: players,
  isCheckIn: true,
  players: Array.from({ length: players }, (_, i) => ({ name: `Guest ${i + 1}`, transport: 'walking' as const, modifierTags: [] })),
});
const problem = (code: string, cart: CartItem[]) => promoProblem(code, cart, linePayable, promoByCode, (p) => isPromoExpired(p, new Date(2026, 4, 21)));

describe("Buck's discount kinds", () => {
  it('a percent takes its share off the line, before tax', () => {
    const cart = [{ ...polo, lineDiscount: applied(type('10% Everything')) }];
    expect(lineNets(cart)).toEqual([99]);
    expect(orderTotals(cart, buckPricing()).total).toBe(99 + 7.92);
  });

  it('dollars off take that much off each one — each seat on a round', () => {
    expect(lineNets([{ ...round(4), lineDiscount: applied(type('Memberships')) }])).toEqual([236 - 100]);
    expect(lineNets([{ ...polo, lineDiscount: applied(type('Dollar Off')) }])).toEqual([108]);
  });

  it('cost plus sets the price to the cost and its share — only where the cost is known', () => {
    // A $55 polo that cost $27.50: cost + 15% is $31.63 each.
    expect(lineNets([{ ...polo, lineDiscount: applied(type('Employee Merch Discount')) }])).toEqual([63.26]);
    const offered = (l: CartItem) => lineDiscountOffers(l, true).map((o) => o.type.description);
    expect(offered(polo)).toContain('Employee Merch Discount');
    // No cost on a windproof jacket nobody priced: cost plus is not offered, never faked.
    expect(offered({ name: 'Umbrella', price: 10, qty: 1 })).not.toContain('Cost Plus');
  });

  it('is limited to its categories: a beer never sees Senior, a round never sees Employee Merch', () => {
    const names = (l: CartItem) => lineDiscountOffers(l, true).map((o) => o.type.description);
    expect(names(beer)).toEqual(['10% Everything', '20% off F&B', 'Dollar Off', "Manager's Discount", 'Military', 'Shift Drink']);
    expect(names(round(1))).toContain('League Pass');
    expect(names(round(1))).not.toContain('Employee Merch Discount');
  });

  it('flags the approval types for anyone but a manager', () => {
    const locked = lineDiscountOffers(polo, false).filter((o) => o.needsManager).map((o) => o.type.description);
    expect(locked).toEqual(['Cost Plus', "Manager's Discount", 'Military']);
    expect(lineDiscountOffers(polo, true).some((o) => o.needsManager)).toBe(false);
  });
});

describe('an order discount', () => {
  it('comes off only the lines in its categories, shared by what each charges, and shows by name', () => {
    const cart: CartItem[] = [polo, beer, { name: '20% off F&B', price: 0, qty: 1, orderDiscount: applied(type('20% off F&B')) }];
    expect(lineNets(cart)).toEqual([110, 8, 0]);
    expect(discountLines(cart, linePayable)).toEqual([{ id: 'order-2', label: '20% off F&B · 20% off', amount: -2 }]);
    const t = orderTotals(cart, buckPricing());
    // Tax on the discounted beers: 8% + 6.7% of $8.
    expect(t.taxes?.find((x) => x.id === 'alcohol')?.amount).toBe(0.54);
    expect(lineTotals(cart, buckPricing()).reduce((s, x) => s + x, 0)).toBeCloseTo(t.total, 2);
  });

  it('offers only types that apply to something on the order, and never cost plus', () => {
    const names = orderDiscountOffers([beer], true).map((o) => o.type.description);
    expect(names).toContain('Shift Drink');
    expect(names).not.toContain('League Pass');
    expect(orderDiscountOffers([polo], true).some((o) => o.type.kind === 'costPlus')).toBe(false);
  });
});

describe('promo codes', () => {
  it('apply as an order discount in their categories', () => {
    const cart: CartItem[] = [round(2), polo, { name: 'x', price: 0, qty: 1, orderDiscount: promoDiscount(promoByCode('TWILIGHT5')!) }];
    expect(lineNets(cart)).toEqual([113, 110, 0]);
  });

  it('say why when they cannot', () => {
    expect(problem('NOPE', [polo])).toBe('No promo code “NOPE”.');
    expect(problem('winter25', [polo])).toBe('WINTER25 expired on 02/28/2026.');
    expect(problem('TWILIGHT5', [polo])).toMatch(/^Nothing on this order is something TWILIGHT5 is for/);
    expect(problem('FOURSOME20', [round(2)])).toBe('FOURSOME20 needs $200.00 of tee fees; this order has $118.00.');
    expect(problem('FOURSOME20', [round(4)])).toBeNull();
    const withCode: CartItem[] = [polo, { name: 'x', price: 0, qty: 1, orderDiscount: promoDiscount(promoByCode('SPRING10')!) }];
    expect(problem('PROSHOP15', withCode)).toBe('This order already has SPRING10 — one code an order.');
  });
});
