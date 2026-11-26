import { describe, expect, it } from 'vitest';
import { lineTotals, orderTotals } from '../logic/cart';
import { buckPricing } from '../logic/pricing';
import { creditOptions } from '../logic/credit-tenders';
import { liveCustomer } from '../data/roster';
import type { CartItem } from '../types';
import { seatRecord } from '../logic/seat-pricing';
import { evenParts, managerNeededFor } from './checkout';
import { liveRainChecks, liveRainChecksFor } from './credit-ledger';
import { amountDue, dueNow, orderByNumber, registerLineTotals } from './operations';
import { createInitialState, reducer, type PosState } from './pos-store';

/** The current edition's register: priced by Buck. */
const s0 = (extra: Partial<PosState> = {}) => createInitialState({ buckCheckout: true, ...extra });
const withCart = (s: PosState, cart: CartItem[]): PosState => ({ ...s, cart });
const card = (s: PosState, amount = dueNow(s)) => reducer(s, { type: 'recordPayment', method: 'card', amount });
const order: CartItem[] = [
  { name: 'Golf Polo Course Logo', price: 55, qty: 1 },
  { name: 'Beer Domestic', price: 5, qty: 2 },
  { name: 'Hot Dog', price: 5, qty: 1 },
];

describe('splitting a check', () => {
  it('evenly, to the cent — the last part takes what rounding leaves', () => {
    expect(evenParts(100, 3)).toEqual([33.33, 33.33, 33.34]);
    expect(evenParts(10.01, 2)).toEqual([5, 5.01]);
  });

  it('three ways: each part is its own payment, the last one closes the order', () => {
    let s = withCart(s0(), order);
    const total = orderTotals(order, buckPricing()).total;
    s = reducer(s, { type: 'startSplit', split: { mode: 'even', parts: evenParts(total, 3).map((amount, i) => ({ label: `Part ${i + 1} of 3`, amount })) } });
    expect(dueNow(s)).toBe(evenParts(total, 3)[0]);
    s = card(s);
    expect(s.lastPayment).toBeNull();
    expect(s.checkSplit!.paid[0]).toBe(evenParts(total, 3)[0]);
    s = card(s);
    s = card(s);
    expect(s.lastPayment).not.toBeNull();
    const o = s.orders.at(-1)!;
    expect(o.tenders).toHaveLength(3);
    expect(o.split?.parts).toHaveLength(3);
    expect(Math.round(o.tenders.reduce((t, x) => t + x.amount, 0) * 100) / 100).toBe(total);
    // The ledger has three payments under the one order number.
    expect(s.payments.filter((p) => p.orderNumber === o.orderNumber)).toHaveLength(3);
    expect(s.checkSplit).toBeNull();
  });

  it('by item: a part owes its lines with their own tax', () => {
    let s = withCart(s0(), order);
    const t = registerLineTotals(s);
    s = reducer(s, {
      type: 'startSplit',
      split: { mode: 'items', parts: [{ label: 'Part 1', lines: [0], amount: t[0] }, { label: 'Part 2', lines: [1, 2], amount: t[1] + t[2] }] },
    });
    expect(dueNow(s)).toBe(t[0]);
    s = card(s);
    expect(amountDue(s)).toBeCloseTo(t[1] + t[2], 2);
  });

  it('can be undone until something is paid', () => {
    let s = withCart(s0(), order);
    s = reducer(s, { type: 'startSplit', split: { mode: 'even', parts: [{ label: 'a', amount: 40 }, { label: 'b', amount: 40 }] } });
    s = reducer(s, { type: 'cancelSplit' });
    expect(s.checkSplit).toBeNull();
  });
});

describe('a refund at the register', () => {
  it('goes back to the tenders that paid — a credit book its part, the card the rest', () => {
    // Kelsey: a round on her league's book, the beer on a card.
    const round: CartItem = { name: 'Guest Rate 18 Holes', unitPrice: 59, price: 59, qty: 1, isCheckIn: true, players: [{ name: 'Sutton, K.', transport: 'walking', modifierTags: [] }] };
    let s = withCart(s0({ selectedGolfer: { id: '458349', name: 'Sutton, K.', phone: '', email: '', type: 'Member', memberType: 'annual', hcp: 0 } }), [round, { name: 'Beer Domestic', price: 5, qty: 1 }]);
    const t = registerLineTotals(s);
    const book = creditOptions('creditbook', liveCustomer('458349')!, { spend: {}, rainChecks: liveRainChecks(s) })[0];
    s = reducer(s, {
      type: 'payPart',
      method: 'creditbook',
      amount: t[0],
      ref: { customerId: '458349', credit: { kind: 'creditbook', key: book.key, id: book.id, label: book.title, unit: 'money', value: t[0], covers: { 0: t[0] } } },
    });
    expect(s.creditSpend[book.key]).toBe(t[0]);
    s = card(s);
    const o = s.orders.at(-1)!;
    s = reducer(s, { type: 'refundOrder', orderNumber: o.orderNumber });
    const r = orderByNumber(s, o.orderNumber)!.refunds[0];
    expect(r.parts?.map((p) => [p.method, p.amount])).toEqual([
      ['creditbook', t[0]],
      ['card', t[1]],
    ]);
    // The book has its money back.
    expect(s.creditSpend[book.key]).toBe(0);
  });
});

describe('a rain check cut at the register', () => {
  it('is a Credits rain check on the customer, with Buck’s expiry, and checkout can spend it', () => {
    let s = s0();
    const b = s.bookings.find((x) => x.date === '2026-05-21' && x.players > 0 && x.pay !== 'block' && x.pay !== 'event')!;
    s = reducer(s, { type: 'issueRainCheck', bookingId: b.id, seat: 0, customerId: '458346', amount: 42.5 });
    const rc = liveRainChecksFor(s, '458346').at(-1)!;
    expect(rc.awarded).toBe(42.5);
    expect(rc.issued).toBe('05/21/2026');
    expect(rc.expires).toBe('05/21/2027');
    expect(s.bookings.find((x) => x.id === b.id)!.pay).toBe('rain_chk');
    const usable = creditOptions('raincheck', liveCustomer('458346')!, { spend: s.creditSpend, rainChecks: liveRainChecks(s) }).find((o) => o.id === rc.id)!;
    expect(usable.usable).toBe(true);
    expect(usable.balance).toBe(42.5);
  });
});

describe('service charges and transfers', () => {
  it('a service charge added by hand is its own line, priced at checkout', () => {
    let s = withCart(s0(), order);
    s = reducer(s, { type: 'addServiceCharge', charge: { id: 'fnb', label: 'F&B Service Charge', percent: 18, appliesTo: 'fnb' } });
    expect(s.cart.at(-1)!.serviceCharge?.id).toBe('fnb');
    expect(orderTotals(s.cart, buckPricing()).service).toBe(2.7);
    // Buck's own charge goes on once.
    s = reducer(s, { type: 'addServiceCharge', charge: { id: 'fnb', label: 'F&B Service Charge', percent: 18, appliesTo: 'fnb' } });
    expect(s.cart.filter((l) => l.serviceCharge).length).toBe(1);
    expect(lineTotals(s.cart, buckPricing()).reduce((a, x) => a + x, 0)).toBeCloseTo(orderTotals(s.cart, buckPricing()).total, 2);
  });

  it("an order sent to another course leaves this register and arrives on that one's", () => {
    let s = withCart(s0({ venueId: 'eighteen' }), order);
    s = reducer(s, { type: 'transferOrder', toVenue: 'nine', total: 99 });
    expect(s.cart).toEqual([]);
    const t = s.transferredOrders[0];
    expect([t.fromVenue, t.toVenue]).toEqual(['eighteen', 'nine']);
    // At the nine:
    let there: PosState = { ...s, venueId: 'nine' };
    there = reducer(there, { type: 'receiveTransfer', id: t.id });
    expect(there.cart).toEqual(order);
    expect(there.transferredOrders[0].receivedAt).toBeTruthy();
  });
});

describe('manager PIN follows Buck’s switches (Nov 26 decision)', () => {
  const proShop = (extra: Partial<PosState> = {}) => s0({ operatorId: 's-6', ...extra });

  it('this club asks nobody: refunds without a PIN, cancels without a manager', () => {
    expect(managerNeededFor(proShop(), 'refund')).toBe(false);
    expect(managerNeededFor(proShop(), 'cancel')).toBe(false);
  });

  it('a club with the switches the other way asks anyone but a manager', () => {
    const strict = { managerSwitches: { refundsWithoutManagerPin: false, orderCancelsRequireManager: true } };
    expect(managerNeededFor(proShop(strict), 'refund')).toBe(true);
    expect(managerNeededFor(proShop(strict), 'cancel')).toBe(true);
    // A manager signed in approves by being signed in.
    expect(managerNeededFor(s0({ operatorId: 's-1', ...strict }), 'refund')).toBe(false);
    // The archived edition predates both.
    expect(managerNeededFor(createInitialState({ operatorId: 's-6', ...strict }), 'cancel')).toBe(false);
  });
});

describe('a register rain check for a seat with no customer (Nov 26 decision)', () => {
  const seatWithoutRecord = (s: PosState) => {
    for (const b of s.bookings.filter((x) => x.date === '2026-05-21' && x.players > 1 && x.pay !== 'block' && x.pay !== 'event')) {
      for (let i = 1; i < b.players; i++) if (!seatRecord(b, i, s.customerEdits)) return { b, i };
    }
    throw new Error('no seat without a record');
  };

  it('adds the guest as a customer, puts the rain check on them, and links the seat', () => {
    let s = s0();
    const { b, i } = seatWithoutRecord(s);
    s = reducer(s, { type: 'issueRainCheck', bookingId: b.id, seat: i, amount: 30, newCustomer: { firstName: 'Rowan', lastName: 'Ashby', phone: '(555) 010-7788' } });
    const linked = seatRecord(s.bookings.find((x) => x.id === b.id)!, i, s.customerEdits)!;
    expect(linked.firstName).toBe('Rowan');
    expect(linked.phone).toBe('(555) 010-7788');
    expect(liveRainChecksFor(s, linked.id).at(-1)!.awarded).toBe(30);
    // Made at the counter, not picked onto the register.
    expect(s.selectedCustomerId).toBeNull();
  });

  it('links the seat to a customer found for it', () => {
    let s = s0();
    const { b, i } = seatWithoutRecord(s);
    s = reducer(s, { type: 'issueRainCheck', bookingId: b.id, seat: i, amount: 12, customerId: '458346' });
    expect(seatRecord(s.bookings.find((x) => x.id === b.id)!, i, s.customerEdits)!.id).toBe('458346');
  });

  it('issues nothing without a name and a phone', () => {
    const s = s0();
    const { b, i } = seatWithoutRecord(s);
    expect(reducer(s, { type: 'issueRainCheck', bookingId: b.id, seat: i, amount: 12, newCustomer: { firstName: 'Rowan', lastName: '', phone: '' } })).toBe(s);
  });
});

describe('a lesson rung up with its instructor (Nov 26 decision)', () => {
  it('carries the instructor, and the same lesson with the same instructor adds to its line', () => {
    let s = s0();
    s = reducer(s, { type: 'addLesson', name: 'Lesson 30 Min', price: 55, instructorId: 'jordan-pike' });
    s = reducer(s, { type: 'addLesson', name: 'Lesson 30 Min', price: 55, instructorId: 'sam-ortega' });
    s = reducer(s, { type: 'addLesson', name: 'Lesson 30 Min', price: 55, instructorId: 'jordan-pike' });
    expect(s.cart.map((l) => [l.lesson?.instructor, l.qty])).toEqual([
      ['Jordan Pike', 2],
      ['Sam Ortega', 1],
    ]);
  });

  it('starts the next order after a payment, like any tile', () => {
    let s = withCart(s0(), [{ name: 'Golf Glove Mens', price: 18, qty: 1 }]);
    s = card(s);
    s = reducer(s, { type: 'addLesson', name: 'Lesson 60 Min', price: 95, instructorId: 'sam-ortega' });
    expect(s.lastPayment).toBeNull();
    expect(s.cart).toHaveLength(1);
  });
});
