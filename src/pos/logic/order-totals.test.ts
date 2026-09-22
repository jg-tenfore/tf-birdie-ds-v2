import { describe, expect, it } from 'vitest';
import { TAX_RATE } from '../data/config';
import type { Booking, CartItem } from '../types';
import { buildTeeTimeCart, orderTotals, salesTax } from './cart';

/**
 * Decision 5 (Weston Edits follow-ups, all editions): one order total. Golf is taxed by its
 * booking's `Taxes` line, everything else at `TAX_RATE`, and the register, checkout, tip,
 * reader and change-due all charge `orderTotals(cart).total`.
 */

const booking = (paid = false): Booking => ({
  id: 'b1',
  date: '2026-05-21',
  course: 'champ-front',
  slot: 0,
  timeMin: 840,
  name: 'Morris, G.',
  players: 2,
  cart: 'walking',
  status: 'booked',
  phone: '',
  conf: 'R-3029',
  pay: paid ? 'paid' : 'open',
  price: 29,
  holes: '9H',
  playerStates: [
    { paid, step: -1, noShow: false },
    { paid, step: -1, noShow: false },
  ],
});
const water: CartItem = { name: 'Water', price: 2.5, qty: 2 };
const polo: CartItem = { name: 'Golf Polo Brand', price: 65, qty: 1 };

describe('orderTotals', () => {
  it('golf only: green fees plus the booking tax line, no sales tax', () => {
    const t = orderTotals(buildTeeTimeCart(booking()));
    expect(t.goods).toBe(58);
    expect(t.golfTax).toBe(6); // $3 × 2 seats
    expect(t.salesTax).toBe(0);
    expect(t.total).toBe(64);
  });

  it('retail only: sales tax on the goods', () => {
    const t = orderTotals([water, polo]);
    expect(t.goods).toBe(70);
    expect(t.golfTax).toBe(0);
    expect(t.tax).toBe(salesTax(70));
    expect(t.tax).toBe(+(70 * TAX_RATE).toFixed(2));
    expect(t.total).toBe(75.6);
  });

  it('mixed: golf by its line, retail by the rate — retail on a tee-time order is taxed', () => {
    const t = orderTotals([...buildTeeTimeCart(booking()), polo]);
    expect(t.goods).toBe(58 + 65);
    expect(t.golfTax).toBe(6);
    expect(t.salesTax).toBe(salesTax(65));
    expect(t.total).toBe(+(58 + 65 + 6 + salesTax(65)).toFixed(2));
  });

  it('paid golf + retail: the settled round charges nothing, the retail is taxed', () => {
    const cart = [...buildTeeTimeCart(booking(true)), water];
    const t = orderTotals(cart);
    expect(t.golfTax).toBe(0);
    expect(t.goods).toBe(5);
    expect(t.total).toBe(+(5 + salesTax(5)).toFixed(2));
  });

  it('$0: an empty order, a stray tax row, and a settled round all total zero', () => {
    expect(orderTotals([]).total).toBe(0);
    expect(orderTotals([{ name: 'Taxes', price: 5, qty: 1, isTax: true, isSubItem: true }]).total).toBe(0);
    expect(orderTotals(buildTeeTimeCart(booking(true))).total).toBe(0);
  });

  it('a round rung at the counter (no tax line) is taxed like retail', () => {
    const round: CartItem = {
      name: 'Guest Rate 9 Holes',
      unitPrice: 35,
      price: 35,
      qty: 1,
      isCheckIn: true,
      players: [{ name: 'Guest 1', transport: 'walking', modifierTags: [] }],
    };
    const t = orderTotals([round, water]);
    expect(t.tax).toBe(salesTax(40));
    expect(t.total).toBe(+(40 + salesTax(40)).toFixed(2));
  });

  it('tax exempt zeroes both taxes', () => {
    const t = orderTotals([...buildTeeTimeCart(booking()), polo, { name: 'Tax Exempt', price: 0, qty: 1 }]);
    expect(t.exempt).toBe(true);
    expect(t.tax).toBe(0);
    expect(t.total).toBe(58 + 65);
  });

  it('subtotal and discount add up to what the lines charge', () => {
    const promo: CartItem = { name: 'Loyalty Reward', price: -5, qty: 1 };
    const t = orderTotals([polo, promo]);
    expect(t.subtotal).toBe(65);
    expect(t.discount).toBe(-5);
    expect(t.subtotal + t.discount).toBe(t.goods);
    expect(t.tax).toBe(salesTax(60));
  });
});
