import { describe, expect, it } from 'vitest';
import { SEED_ORDERS } from '../data/orders-seed';
import { createInitialState, reducer } from '../state/pos-store';
import { orderByNumber } from '../state/operations';
import { clockMinutes, lineAmount, lineSummary, lookupOrders, netTotal, orderItems, paymentIdsByOrder, refundState, tenderLabel } from './order-lookup';

/** Order Lookup's search and wording (V1 → V2, Wave 3). */

const entries = SEED_ORDERS.map((order) => ({ order }));
const DAY = SEED_ORDERS[0].date;

describe('one box, every field', () => {
  it('finds orders by product', () => {
    const hits = lookupOrders(entries, { query: 'pro v1', date: DAY });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.order.lines.some((l) => l.name.includes('Pro V1')))).toBe(true);
  });

  it('finds an order by a card’s last four', () => {
    const hits = lookupOrders(entries, { query: '4421', date: DAY });
    expect(hits.map((e) => e.order.orderNumber)).toEqual([SEED_ORDERS[0].orderNumber]);
  });

  it('finds an order by its number, with or without the #', () => {
    const n = SEED_ORDERS[3].orderNumber;
    expect(lookupOrders(entries, { query: n, date: DAY })[0].order.orderNumber).toBe(n);
    expect(lookupOrders(entries, { query: n.slice(1), date: DAY })[0].order.orderNumber).toBe(n);
  });

  it('finds a refunded order by the refund’s own payment id', () => {
    const o = SEED_ORDERS[0];
    const s = reducer(createInitialState(), { type: 'refundOrder', orderNumber: o.orderNumber });
    const refundId = s.payments.at(-1)!.id;
    const hits = lookupOrders(
      s.orders.map((order) => ({ order })),
      { query: refundId, date: DAY, paymentIds: paymentIdsByOrder(s.payments) },
    );
    expect(hits.map((e) => e.order.orderNumber)).toEqual([o.orderNumber]);
  });

  it('keeps to the day unless asked for every day, and lists newest first', () => {
    expect(lookupOrders(entries, { query: '', date: '2026-05-20' })).toEqual([]);
    const all = lookupOrders(entries, { query: '', date: null });
    expect(all).toHaveLength(SEED_ORDERS.length);
    expect(all[0].order.orderNumber).toBe(SEED_ORDERS.at(-1)!.orderNumber);
  });
});

describe('wording', () => {
  it('names each tender as a receipt would', () => {
    expect(tenderLabel('card', { cardLast4: '4421' })).toBe('Card •••• 4421');
    expect(tenderLabel('card')).toBe('Card');
    expect(tenderLabel('cash')).toBe('Cash');
    expect(tenderLabel('house', { customerId: 'M001' })).toBe('House account');
    expect(tenderLabel('event', { eventId: 'EV-301' }, 'Member-Guest Invitational')).toBe('Event · Member-Guest Invitational');
    expect(tenderLabel('event', { eventId: 'EV-301' })).toBe('Event EV-301');
  });

  it('summarises what was bought, three names then a count, tax rows left out', () => {
    const o = SEED_ORDERS.find((x) => x.lines.length >= 3)!;
    expect(lineSummary(o)).not.toContain('Taxes');
    expect(lineSummary({ ...o, lines: [...o.lines, ...o.lines] })).toMatch(/\+\d+ more$/);
    expect(orderItems(o).every(({ line }) => !line.isTax)).toBe(true);
  });

  it('prices a line as it charged, and a voided dish at nothing', () => {
    expect(lineAmount({ name: 'Coffee', price: 3, qty: 2 })).toBe(6);
    expect(lineAmount({ name: 'Fries', price: 6, qty: 1, dish: { lineId: 'x', menuItemId: 'y', basePrice: 6, modifiers: [], voided: true } })).toBe(0);
  });

  it('reads a clock', () => {
    expect(clockMinutes('7:08 AM')).toBe(428);
    expect(clockMinutes('12:04 PM')).toBe(724);
    expect(clockMinutes('12:30 AM')).toBe(30);
    expect(clockMinutes('')).toBe(-1);
  });
});

describe('refund state', () => {
  it('goes none → partial → full, and what is kept follows', () => {
    const o = SEED_ORDERS.find((x) => x.lines.length >= 2)!;
    expect(refundState(o)).toBe('none');
    let s = reducer(createInitialState(), { type: 'refundOrder', orderNumber: o.orderNumber, picks: [{ index: 0, qty: o.lines[0].qty }] });
    const part = orderByNumber(s, o.orderNumber)!;
    expect(refundState(part)).toBe('partial');
    expect(netTotal(part)).toBeLessThan(o.total);
    s = reducer(s, { type: 'refundOrder', orderNumber: o.orderNumber });
    const full = orderByNumber(s, o.orderNumber)!;
    expect(refundState(full)).toBe('full');
    expect(Math.abs(netTotal(full))).toBeLessThanOrEqual(0.02);
  });
});
