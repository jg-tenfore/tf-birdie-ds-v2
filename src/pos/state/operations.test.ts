import { describe, expect, it } from 'vitest';
import { liveCustomer } from '../data/roster';
import { SEED_EVENT_BOOKINGS, eventGolf } from '../data/events';
import { SEED_ORDERS } from '../data/orders-seed';
import { orderTotals } from '../logic/cart';
import { refundAmount, refundableQty } from '../logic/orders';
import { drawerWorkings } from '../logic/shift';
import { giftCardCovers } from '../logic/tenders';
import type { CartItem } from '../types';
import { allGiftCards, amountDue, eventById, orderByNumber } from './operations';
import { createInitialState, reducer, type PosState } from './pos-store';

const s0 = () => createInitialState();
const pay = (s: PosState, method: string, extra: Partial<{ amount: number; tip: number; ref: object }> = {}) =>
  reducer(s, { type: 'recordPayment', method, amount: extra.amount ?? amountDue(s) + (extra.tip ?? 0), tip: extra.tip, ref: extra.ref });
const withCart = (s: PosState, cart: CartItem[]): PosState => ({ ...s, cart });
const balls = (qty = 1): CartItem => ({ name: 'Titleist Pro V1 Sleeve', price: 16, qty });
const beer = (qty = 1): CartItem => ({ name: 'Beer Domestic', price: 5, qty });

describe('an order is kept whole when it is paid', () => {
  it('records the lines, the totals and the tender, and takes stock off the shelf', () => {
    const s = withCart(s0(), [balls(2)]);
    const before = s.stock['Titleist Pro V1 Sleeve'];
    const paid = pay(s, 'card');
    const order = paid.orders.at(-1)!;
    expect(order.lines).toEqual([balls(2)]);
    expect(order.total).toBe(orderTotals([balls(2)]).total);
    expect(order.tenders).toHaveLength(1);
    expect(paid.stock['Titleist Pro V1 Sleeve']).toBe(Math.max(0, before - 2));
    // …under the same number the ledger has.
    expect(paid.payments.at(-1)!.orderNumber).toBe(order.orderNumber);
  });

  it('seeds the morning as orders, and every seeded payment is exactly its order’s total', () => {
    const s = s0();
    for (const o of SEED_ORDERS) {
      const p = s.payments.find((x) => x.orderNumber === o.orderNumber)!;
      expect(p.amount).toBe(o.total);
    }
  });
});

describe('refunds', () => {
  const order = () => SEED_ORDERS.find((o) => o.lines.length >= 2)!;

  it('gives back the goods plus their share of the tax, and refunding every line adds up to the whole', () => {
    const o = order();
    const parts = o.lines.reduce((sum, _, i) => sum + refundAmount(o, [{ index: i, qty: o.lines[i].qty }]), 0);
    const whole = refundAmount(o, o.lines.map((l, i) => ({ index: i, qty: l.qty })));
    expect(whole).toBe(o.total);
    expect(Math.abs(parts - whole)).toBeLessThanOrEqual(0.02);
  });

  it('records a negative payment to the original tender, and a line cannot be refunded twice', () => {
    const o = order();
    const s = reducer(s0(), { type: 'refundOrder', orderNumber: o.orderNumber, picks: [{ index: 0, qty: o.lines[0].qty }] });
    const p = s.payments.at(-1)!;
    expect(p.kind).toBe('refund');
    expect(p.amount).toBeLessThan(0);
    expect(p.method).toBe(o.tenders[0].method);
    const after = orderByNumber(s, o.orderNumber)!;
    expect(refundableQty(after, 0)).toBe(0);
    // Refunding it again does nothing.
    expect(reducer(s, { type: 'refundOrder', orderNumber: o.orderNumber, picks: [{ index: 0, qty: 1 }] })).toBe(s);
  });

  it('puts refunded stock back on the shelf', () => {
    const o = SEED_ORDERS.find((x) => x.lines.some((l) => l.name === 'Titleist Pro V1 Sleeve'))!;
    const i = o.lines.findIndex((l) => l.name === 'Titleist Pro V1 Sleeve');
    const start = s0();
    const s = reducer(start, { type: 'refundOrder', orderNumber: o.orderNumber, picks: [{ index: i, qty: 1 }] });
    expect(s.stock['Titleist Pro V1 Sleeve']).toBe(start.stock['Titleist Pro V1 Sleeve'] + 1);
  });
});

describe('gift cards: what they may pay for', () => {
  const card = { balance: 100, categories: ['merchandise', 'fnb', 'tee'] as const };

  it('pays for the lines it is good for, with their tax, and not for the beer', () => {
    const cart = [balls(1), beer(2)];
    const covers = giftCardCovers({ ...card, categories: [...card.categories] }, cart, orderTotals(cart).total);
    expect(covers).toBe(orderTotals([balls(1)]).total);
  });

  it('pays nothing toward an order that is only alcohol', () => {
    expect(giftCardCovers({ ...card, categories: [...card.categories] }, [beer(3)], 100)).toBe(0);
  });

  it('treats a card from before categories as the default — no alcohol', () => {
    expect(giftCardCovers({ balance: 100 }, [beer(1)], 100)).toBe(0);
  });
});

describe('split tender', () => {
  it('a gift card pays part, the rest stays due, and the order is one order with two tenders', () => {
    const s1 = withCart(s0(), [balls(3)]);
    const total = orderTotals(s1.cart).total;
    const part = reducer(s1, { type: 'payPart', method: 'giftcard', amount: 20, ref: { giftCardId: 'x' } });
    expect(amountDue(part)).toBeCloseTo(total - 20, 2);
    const done = pay(part, 'card');
    const order = done.orders.at(-1)!;
    expect(order.tenders.map((t) => t.method)).toEqual(['giftcard', 'card']);
    expect(order.total).toBe(total);
    expect(done.splitTender).toBeNull();
    // Both payments carry the one order number.
    expect(new Set(done.payments.slice(-2).map((p) => p.orderNumber)).size).toBe(1);
  });

  it('refuses a "part" that is really the whole — that is a payment, not a part', () => {
    const s1 = withCart(s0(), [balls(1)]);
    expect(reducer(s1, { type: 'payPart', method: 'giftcard', amount: 999 })).toBe(s1);
  });

  it('clearing the order unwinds the part already paid, so nothing is taken for an order that never completed', () => {
    const s1 = withCart(s0(), [balls(3)]);
    const part = reducer(s1, { type: 'payPart', method: 'giftcard', amount: 20 });
    const cleared = reducer(part, { type: 'clearOrder' });
    expect(cleared.splitTender).toBeNull();
    const net = cleared.payments.filter((p) => p.orderNumber === part.splitTender!.orderNumber).reduce((n, p) => n + p.amount, 0);
    expect(net).toBe(0);
  });
});

describe('house accounts', () => {
  const kim = 'M005';

  it('charging an account raises the balance and logs the charge', () => {
    const s1 = withCart(s0(), [balls(1)]);
    const before = liveCustomer(kim, s1.customerEdits)!.balance;
    const s = pay(s1, 'house', { ref: { customerId: kim } });
    expect(liveCustomer(kim, s.customerEdits)!.balance).toBeCloseTo(before + orderTotals([balls(1)]).total, 2);
    expect(s.accountEntries.at(-1)).toMatchObject({ customerId: kim, kind: 'charge' });
  });

  it('paying an account off lowers the balance, untaxed', () => {
    const charged = pay(withCart(s0(), [balls(2)]), 'house', { ref: { customerId: kim } });
    const owed = liveCustomer(kim, charged.customerEdits)!.balance;
    const onRegister = reducer({ ...charged, cart: [], lastPayment: null }, { type: 'payAccount', customerId: kim });
    expect(orderTotals(onRegister.cart).tax).toBe(0);
    const paid = pay(onRegister, 'card');
    expect(liveCustomer(kim, paid.customerEdits)!.balance).toBeCloseTo(owed - owed, 2);
    expect(paid.accountEntries.at(-1)!.kind).toBe('payment');
  });
});

describe('the payment hooks run in order, so none undoes another', () => {
  it('a gift card issued on an order paid to a house account survives on the recipient’s record', () => {
    // Issuing (Wave 1) and the house account (Wave 3) both write customer records. Spread side by
    // side from one starting state, the second would erase the first.
    const s1 = withCart(s0(), []);
    const withCard = reducer(s1, {
      type: 'addGiftCardLine',
      draft: { amount: 50, recipient: { name: 'Park, Susan', customerId: 'M004' } },
    } as never);
    const before = liveCustomer('M004', withCard.customerEdits)!.giftCards.length;
    const paid = pay(withCard, 'house', { ref: { customerId: 'M004' } });
    expect(liveCustomer('M004', paid.customerEdits)!.giftCards.length).toBe(before + 1);
    expect(paid.accountEntries.at(-1)!.customerId).toBe('M004');
  });
});

describe('events', () => {
  it('owns real tee times, and its golf is derived from them', () => {
    const s = { ...s0(), bookings: [...s0().bookings, ...SEED_EVENT_BOOKINGS] };
    const mg = eventById(s, 'EV-301')!;
    const golf = eventGolf(mg, s.bookings);
    expect(golf.players).toBe(72);
    expect(golf.amount).toBe(72 * mg.greenFee);
  });

  it('charging an order to an event puts its lines on the event’s ledger, tax included', () => {
    const s1 = withCart(s0(), [beer(4)]);
    const s = pay(s1, 'event', { ref: { eventId: 'EV-302' } });
    const ev = eventById(s, 'EV-302')!;
    expect(ev.ledger).toHaveLength(1);
    expect(ev.ledger[0].amount).toBeCloseTo(orderTotals([beer(4)]).total, 2);
  });

  it('billing the organiser loads golf (taxed) and charges (already taxed), and paying marks it billed', () => {
    const s = { ...s0(), bookings: [...s0().bookings, ...SEED_EVENT_BOOKINGS] };
    const billed = reducer(s, { type: 'billEvent', eventId: 'EV-301' });
    expect(billed.cart.map((l) => l.name)).toEqual(expect.arrayContaining([expect.stringMatching(/^Golf/), expect.stringMatching(/^Charges/)]));
    const done = pay(billed, 'card');
    expect(eventById(done, 'EV-301')!.status).toBe('billed');
    // A billed event takes no more charges.
    expect(reducer(done, { type: 'chargeEvent', eventId: 'EV-301', description: 'x', qty: 1, amount: 5 })).toBe(done);
  });
});

describe('stock counts', () => {
  it('fixes "expected" when the count begins, and saving sets stock to what was counted', () => {
    let s = reducer(s0(), { type: 'startCount', category: 'GOLF BALLS' });
    const id = s.activeCountId!;
    const line = s.inventoryCounts.at(-1)!.lines[0];
    s = reducer(s, { type: 'setCounted', countId: id, name: line.name, counted: line.expected - 2 });
    s = reducer(s, { type: 'saveCount', countId: id });
    expect(s.stock[line.name]).toBe(Math.max(0, line.expected - 2));
    expect(s.inventoryCounts.at(-1)!.status).toBe('saved');
  });

  it('leaves uncounted items alone', () => {
    let s = reducer(s0(), { type: 'startCount', category: 'GOLF BALLS' });
    const second = s.inventoryCounts.at(-1)!.lines[1];
    s = reducer(s, { type: 'saveCount', countId: s.activeCountId! });
    expect(s.stock[second.name]).toBe(second.expected);
  });
});

describe('the drawer', () => {
  it('expects the float plus cash taken, less drops — and closing fixes the variance', () => {
    let s = s0();
    s = reducer(s, { type: 'cashDrop', amount: 50 });
    const w = drawerWorkings(s.drawerShift!, s.payments, s.drawerEvents);
    const cashTaken = s.payments.filter((p) => p.method === 'cash').reduce((n, p) => n + p.amount + p.tip, 0);
    expect(w.expected).toBeCloseTo(200 + cashTaken - 50, 2);
    s = reducer(s, { type: 'closeShift', countedCash: w.expected - 5, countedChecks: 0 });
    expect(s.drawerShift).toBeNull();
    expect(s.drawerHistory[0].expectedCash).toBeCloseTo(w.expected, 2);
    expect(s.drawerHistory[0].countedCash).toBeCloseTo(w.expected - 5, 2);
  });

  it('keeps the tee sheet’s time band — the drawer is not called `shift`', () => {
    expect(s0().shift).toBe('full');
  });
});

describe('sign-in and the clock', () => {
  it('signs in by PIN and refuses a wrong one', () => {
    const out = reducer(s0(), { type: 'signOut' });
    expect(out.signedIn).toBe(false);
    expect(reducer(out, { type: 'signIn', pin: '0000' })).toBe(out);
    const jordan = reducer(out, { type: 'signIn', pin: '2222' });
    expect(jordan.signedIn).toBe(true);
    expect(jordan.operatorId).toBe('s-2');
  });

  it('clocks a person in once, and out once', () => {
    let s = reducer(s0(), { type: 'clockOut', staffId: 's-2' });
    expect(s.punches.find((p) => p.staffId === 's-2' && p.date === s.punches[0].date && p.out)).toBeTruthy();
    const again = reducer(s, { type: 'clockOut', staffId: 's-2' });
    expect(again).toBe(s);
    s = reducer(s, { type: 'clockIn', staffId: 's-2' });
    expect(reducer(s, { type: 'clockIn', staffId: 's-2' })).toBe(s);
  });
});

describe('customers created at the counter', () => {
  it('are found by every lookup that reads through liveCustomer, with no type baked into the name', () => {
    const s = reducer(s0(), { type: 'createCustomer', input: { firstName: 'Nora', lastName: 'Quinn', phone: '5551234567', types: ['Senior'] } });
    const c = liveCustomer(s.selectedCustomerId!, s.customerEdits)!;
    expect(c.displayName).toBe('Nora Quinn');
    expect(c.customerTypes).toEqual(['Senior']);
  });
});

describe('finding gift cards', () => {
  it('finds a card seeded on a customer nobody has edited', async () => {
    const { allGiftCards, findGiftCard } = await import('./operations');
    const s = s0();
    const cards = allGiftCards(s);
    expect(cards.length).toBeGreaterThan(0);
    const one = cards[0];
    expect(findGiftCard(s, one.card.id)?.customerId).toBe(one.customerId);
  });
});

describe('seeded outings sit on the sheet', () => {
  it('starts every outing tee time on a row of the sheet (every 8 minutes from 6:00)', () => {
    for (const b of SEED_EVENT_BOOKINGS) expect((b.timeMin - 360) % 8).toBe(0);
  });
});

describe('a gift card sold with a type and categories', () => {
  it('is issued as that type, good for exactly those categories', () => {
    const s1 = reducer(s0(), {
      type: 'addGiftCardLine',
      draft: { amount: 40, recipient: { name: 'Park, Susan', customerId: 'M004' }, cardType: 'Promotional', categories: ['fnb'] },
    } as never);
    const paid = pay(s1, 'card');
    const card = liveCustomer('M004', paid.customerEdits)!.giftCards.at(-1)!;
    expect(card.type).toBe('Promotional');
    expect(card.categories).toEqual(['fnb']);
  });
});

describe('a tee time paid before the session', () => {
  it('refunds like any order: the record is kept from the first refund, and a seat cannot go back twice', async () => {
    const { lookupOrder } = await import('./operations');
    const { bookingOrdersOn } = await import('../logic/booking-orders');
    const { rateContext } = await import('./rate-context');
    const s = s0();
    const [first] = bookingOrdersOn(s.bookings, null, new Set(s.orders.map((o) => o.orderNumber)), s.courses, rateContext(s));
    expect(first).toBeTruthy();
    const n = first.order.orderNumber;
    expect(lookupOrder(s, n)?.total).toBe(first.order.total);

    const once = reducer(s, { type: 'refundOrder', orderNumber: n, picks: [{ index: 0, qty: 1 }] });
    expect(once.orders.at(-1)!.orderNumber).toBe(n);
    expect(once.orders.at(-1)!.refunds).toHaveLength(1);
    expect(once.payments.at(-1)).toMatchObject({ kind: 'refund', method: 'card', orderNumber: n });

    const all = reducer(once, { type: 'refundOrder', orderNumber: n });
    const again = reducer(all, { type: 'refundOrder', orderNumber: n });
    expect(again).toBe(all);
    expect(all.orders.filter((o) => o.orderNumber === n)).toHaveLength(1);
  });
});

describe('refunding an order paid by gift card and card', () => {
  // The walkthrough's order: a sleeve the card may pay for, two beers it may not.
  const split = () => {
    let s = withCart(s0(), [balls(1), beer(2)]);
    const card = reducer(s, { type: 'payPart', method: 'giftcard', amount: giftCardCovers({ balance: 100 }, s.cart, amountDue(s)), ref: { giftCardId: '261900' } });
    s = pay(card, 'card');
    return { s, order: s.orders.at(-1)! };
  };

  it('gives each tender back exactly what it paid, when the whole order is refunded', () => {
    const { s, order } = split();
    const [gift, rest] = order.tenders;
    const after = reducer(s, { type: 'refundOrder', orderNumber: order.orderNumber });
    const refunds = after.payments.filter((p) => p.orderNumber === order.orderNumber && p.kind === 'refund');
    expect(refunds.map((p) => [p.method, p.amount])).toEqual([
      ['giftcard', -gift.amount],
      ['card', -rest.amount],
    ]);
  });

  it('never puts the beer back on the gift card', () => {
    const { s, order } = split();
    const i = order.lines.findIndex((l) => l.name === 'Beer Domestic');
    const after = reducer(s, { type: 'refundOrder', orderNumber: order.orderNumber, picks: [{ index: i, qty: 2 }] });
    const refunds = after.payments.filter((p) => p.orderNumber === order.orderNumber && p.kind === 'refund');
    expect(refunds.map((p) => p.method)).toEqual(['card']);
  });

  it('puts the sleeve back on the card that bought it, and then nothing more fits there', () => {
    const { s, order } = split();
    const sleeve = order.lines.findIndex((l) => l.name === 'Titleist Pro V1 Sleeve');
    const once = reducer(s, { type: 'refundOrder', orderNumber: order.orderNumber, picks: [{ index: sleeve, qty: 1 }] });
    expect(once.payments.at(-1)).toMatchObject({ method: 'giftcard', amount: -order.tenders[0].amount });
    const all = reducer(once, { type: 'refundOrder', orderNumber: order.orderNumber });
    expect(all.payments.at(-1)).toMatchObject({ method: 'card', amount: -order.tenders[1].amount });
  });
});

describe('after a payment', () => {
  it('tapping an item starts the next order rather than adding to the paid one', () => {
    const paid = pay(withCart(s0(), [balls(1)]), 'card');
    expect(paid.lastPayment).not.toBeNull();
    const next = reducer(paid, { type: 'addItem', name: 'Beer Domestic', price: 5 });
    expect(next.lastPayment).toBeNull();
    expect(next.cart.map((l) => l.name)).toEqual(['Beer Domestic']);
    expect(next.orders).toHaveLength(paid.orders.length);
  });
});

describe('a paid order on the register does not block the next job', () => {
  it('billing an event starts the next order', () => {
    const s = { ...pay(withCart(s0(), [balls(1)]), 'card'), bookings: [...s0().bookings, ...SEED_EVENT_BOOKINGS] };
    const billed = reducer(s, { type: 'billEvent', eventId: 'EV-301' });
    expect(billed.lastPayment).toBeNull();
    expect(billed.cart.some((l) => l.eventBill)).toBe(true);
  });
});

describe('a tip on the new tenders', () => {
  it('comes off the gift card with the order', () => {
    const s1 = withCart(s0(), [balls(1)]);
    const due = amountDue(s1);
    const before = allGiftCards(s1).find((x) => x.card.id === '261900')!.card.balance;
    const s = pay(s1, 'giftcard', { amount: due + 2, tip: 2, ref: { giftCardId: '261900' } });
    expect(allGiftCards(s).find((x) => x.card.id === '261900')!.card.balance).toBeCloseTo(before - due - 2, 2);
    // A refund gives back the goods, not the tip.
    expect(s.orders.at(-1)!.tenders[0].amount).toBeCloseTo(due, 2);
  });

  it('goes on the member’s house account', () => {
    const s1 = withCart(s0(), [balls(1)]);
    const due = amountDue(s1);
    const before = liveCustomer('M005', s1.customerEdits)!.balance;
    const s = pay(s1, 'house', { amount: due + 3, tip: 3, ref: { customerId: 'M005' } });
    expect(liveCustomer('M005', s.customerEdits)!.balance).toBeCloseTo(before + due + 3, 2);
    expect(s.accountEntries.at(-1)!.amount).toBeCloseTo(due + 3, 2);
  });

  it('is a line of its own on the event’s ledger', () => {
    const s = pay(withCart(s0(), [beer(2)]), 'event', { amount: amountDue(withCart(s0(), [beer(2)])) + 4, tip: 4, ref: { eventId: 'EV-302' } });
    const ledger = eventById(s, 'EV-302')!.ledger;
    expect(ledger.at(-1)).toMatchObject({ description: 'Tip', amount: 4 });
  });
});

describe('checks', () => {
  it('a check taken this shift is what the check count at close should come to', () => {
    const s = pay(withCart(s0(), [balls(2)]), 'check', { ref: { checkNumber: '1042' } });
    const w = drawerWorkings(s.drawerShift!, s.payments, s.drawerEvents);
    expect(w.checks).toBeCloseTo(orderTotals([balls(2)]).total, 2);
    // …and it is not cash.
    expect(w.expected).toBeCloseTo(drawerWorkings(s0().drawerShift!, s0().payments, s0().drawerEvents).expected, 2);
    const closed = reducer(s, { type: 'closeShift', countedCash: w.expected, countedChecks: w.checks });
    expect(closed.drawerHistory[0].expectedChecks).toBeCloseTo(w.checks, 2);
  });
});

describe('house accounts are for members', () => {
  it('a current membership has one; none, or a lapsed one, does not', async () => {
    const { hasHouseAccount, houseAccountRefusal } = await import('../logic/customer-search');
    const today = new Date(2026, 4, 21);
    const who = { firstName: 'Nora', lastName: 'Quinn' };
    expect(hasHouseAccount({ memberships: [{ name: 'Full Golf', expires: '12/31/2026' }] }, today)).toBe(true);
    expect(hasHouseAccount({ memberships: [] }, today)).toBe(false);
    expect(houseAccountRefusal({ ...who, memberships: [] }, today)).toMatch(/isn’t a member/);
    expect(houseAccountRefusal({ ...who, memberships: [{ name: 'Full Golf', expires: '01/31/2026' }] }, today)).toMatch(/lapsed/);
  });
});
