import { describe, expect, it } from 'vitest';
import type { CartItem } from '../types';
import { lineTotals, orderTotals } from './cart';
import { refundAmount, type OrderRecord } from './orders';
import { cardSurcharge, clubPricingDefaults, type Pricing } from './pricing';

const buck = (extra: Partial<Pricing> = {}): Pricing => ({ kind: 'buck', club: clubPricingDefaults(), salesRate: 0.08, ...extra });
const round = (players: number, cart = true): CartItem => ({
  name: 'Guest Rate 18 Holes',
  unitPrice: 59,
  price: 59 * players,
  qty: players,
  isCheckIn: true,
  players: Array.from({ length: players }, (_, i) => ({
    name: `Guest ${i + 1}`,
    transport: cart ? ('cart' as const) : ('walking' as const),
    modifierTags: cart ? [{ name: 'Riding Cart', tag: 'CART', tagColor: '#000', p: 20, isTransport: true }] : [],
  })),
});
const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

describe("Buck's tax per line", () => {
  it('taxes a beer at open liquor plus its Tax Rate 2, a sleeve at the default, a round at tee fee and transportation', () => {
    const cart: CartItem[] = [round(1), { name: 'Beer Domestic', price: 5, qty: 2 }, { name: 'Titleist Pro V1 Sleeve', price: 16, qty: 1 }];
    const t = orderTotals(cart, buck());
    // Round $79 + sleeve $16 at 8%; beers $10 at 8% + 6.7%.
    expect(t.taxes).toEqual([
      { id: 'sales', label: 'Sales Tax 8%', amount: 8.4 },
      { id: 'alcohol', label: 'Alcohol Tax 6.7%', amount: 0.67 },
    ]);
    expect(t.total).toBe(105 + 9.07);
    // The flat rate charged the beers 8% only.
    expect(orderTotals(cart, 0.08).total).toBe(105 + 8.4);
  });

  it("keeps a tee time's reservation tax line as booked, and never taxes the round twice", () => {
    const cart: CartItem[] = [round(2), { name: 'Taxes', price: 6, qty: 1, isTax: true, isSubItem: true }, { name: 'Beer Craft', price: 7, qty: 1 }];
    const t = orderTotals(cart, buck());
    expect(t.golfTax).toBe(6);
    expect(t.taxes?.map((x) => x.id)).toEqual(['reservation', 'sales', 'alcohol']);
    expect(t.total).toBe(158 + 6 + 7 + 0.56 + 0.47);
  });

  it("follows a product's own tax type over its kind's — lessons are sold exempt", () => {
    expect(orderTotals([{ name: 'Lesson 30 Min', price: 55, qty: 1 }], buck()).tax).toBe(0);
  });

  it('reads the default type at the terminal’s sales tax', () => {
    expect(orderTotals([{ name: 'Golf Glove Mens', price: 18, qty: 1 }], buck({ salesRate: 0.0825 })).tax).toBe(1.49);
  });

  it('a Tax Exempt line zeroes every tax, service charges stay', () => {
    const cart: CartItem[] = [{ name: 'Hamburger', price: 8, qty: 1 }, { name: 'Tax Exempt', price: 0, qty: 1 }];
    const t = orderTotals(cart, buck({ dineIn: true }));
    expect(t.tax).toBe(0);
    expect(t.service).toBe(1.44);
  });

  it('a combo is taxed by its components, the combo price shared by list price', () => {
    const combo: CartItem = {
      name: 'Turn Special',
      price: 10,
      qty: 1,
      combo: { id: 'x', listPrice: 12, components: [{ name: 'Hot Dog', qty: 1, p: 5 }, { name: 'Beer Domestic', qty: 1, p: 5 }, { name: 'Chips', qty: 1, p: 2 }] },
    };
    const t = orderTotals([combo], buck());
    // The beer's share of $10 is $4.17: alcohol tax on that alone.
    expect(t.taxes?.find((x) => x.id === 'alcohol')?.amount).toBe(0.28);
    expect(t.taxes?.find((x) => x.id === 'sales')?.amount).toBe(0.8);
  });
});

describe("Buck's service charges", () => {
  const tab: CartItem[] = [
    { name: 'Hamburger', price: 8, qty: 2 },
    { name: 'Beer Domestic', price: 5, qty: 2 },
  ];

  it('adds the F&B Service Charge to the food and drink of a table’s tab, untaxed, as its own line', () => {
    const t = orderTotals(tab, buck({ dineIn: true }));
    expect(t.serviceCharges).toEqual([{ id: 'fnb', label: 'F&B Service Charge 18%', amount: 4.68 }]);
    expect(t.total).toBe(26 + 4.68 + 2.08 + 0.67);
    // At the counter, none.
    expect(orderTotals(tab, buck()).service).toBe(0);
  });

  it("adds the Event Service Charge to an event's bill", () => {
    const bill: CartItem[] = [{ name: 'Golf · Spring Scramble · 40 players', price: 2400, qty: 1, unitPrice: 2400 }];
    expect(orderTotals(bill, buck({ eventBill: true })).serviceCharges?.[0]).toEqual({ id: 'event', label: 'Event Service Charge 20%', amount: 480 });
  });

  it('prices a service charge added by hand, as a percentage of what it applies to or a flat amount', () => {
    const pct: CartItem = { name: 'F&B Service Charge', price: 0, qty: 1, serviceCharge: { id: 'fnb', label: 'F&B Service Charge', percent: 18, appliesTo: 'fnb' } };
    const flat: CartItem = { name: 'Setup fee', price: 0, qty: 1, serviceCharge: { id: 'custom', label: 'Setup fee', amount: 25, appliesTo: 'all' } };
    const withSleeve = [...tab, { name: 'Titleist Pro V1 Sleeve', price: 16, qty: 1 }];
    expect(orderTotals([...withSleeve, pct], buck()).service).toBe(4.68);
    expect(orderTotals([...withSleeve, flat], buck()).service).toBe(25);
    // Not doubled on a table's tab that already carries it.
    expect(orderTotals([...tab, pct], buck({ dineIn: true })).service).toBe(4.68);
  });

  it('a card surcharge is what Buck sets — nothing at 0%', () => {
    expect(cardSurcharge(100, buck())).toBe(0);
    const pushed = buck();
    pushed.club.serviceCharges.card = 3;
    expect(cardSurcharge(80.5, pushed)).toBe(2.42);
    expect(cardSurcharge(80.5, 0.08)).toBe(0);
  });
});

describe('per-line totals', () => {
  it('add up to the order total to the cent, with tax and service where they belong', () => {
    const cart: CartItem[] = [round(3), { name: 'Beer Domestic', price: 5, qty: 3 }, { name: 'Hot Dog', price: 5, qty: 1 }, { name: 'Golf Glove Mens', price: 18, qty: 1 }];
    for (const p of [buck(), buck({ dineIn: true }), buck({ eventBill: true })]) {
      expect(sum(lineTotals(cart, p))).toBe(orderTotals(cart, p).total);
    }
    // The beers carry their alcohol tax; the glove does not.
    const t = lineTotals(cart, buck());
    expect(t[1]).toBe(15 + 1.2 + 1.01);
    expect(t[3]).toBe(19.44);
  });

  it('a refund of one line gives back its own total, and a whole refund the order total', () => {
    const cart: CartItem[] = [{ name: 'Beer Domestic', price: 5, qty: 2 }, { name: 'Golf Glove Mens', price: 18, qty: 1 }];
    const p = buck();
    const order = { lines: cart, lineTotals: lineTotals(cart, p), refunds: [], subtotal: 28, tax: 0, total: orderTotals(cart, p).total } as unknown as OrderRecord;
    expect(refundAmount(order, [{ index: 0, qty: 1 }])).toBe(5.74);
    expect(refundAmount(order, [{ index: 0, qty: 2 }, { index: 1, qty: 1 }])).toBe(order.total);
  });
});
