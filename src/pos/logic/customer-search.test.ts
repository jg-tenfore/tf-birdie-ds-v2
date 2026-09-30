import { describe, expect, it } from 'vitest';
import { customers } from '../data/customers';
import { liveRoster } from '../data/roster';
import { amountDue } from '../state/operations';
import { createInitialState, reducer } from '../state/pos-store';
import type { CartItem } from '../types';
import { orderTotals } from './cart';
import {
  accountHistory,
  cardExpired,
  categoryLabels,
  customerChips,
  customerDraftProblem,
  customerDraftStatus,
  customersOwing,
  findCustomers,
  giftCardCanPay,
  giftCardTotals,
  houseAccountProblem,
  isSpent,
  orderCustomerId,
  plainName,
  searchGiftCards,
  withEmailDomain,
  withPlainHolders,
} from './customer-search';

const ivar = customers.find((c) => c.id === '458337')!;
const burger = (qty = 1): CartItem => ({ name: 'Hamburger', price: 8, qty });
const beer = (qty = 1): CartItem => ({ name: 'Beer Domestic', price: 5, qty });

describe('names and chips', () => {
  it('prints the name without the membership v1 baked into it, and the membership as a chip', () => {
    expect(ivar.displayName).toBe('Ivar Brennevin - Full Golf');
    expect(plainName(ivar)).toBe('Ivar Brennevin');
    expect(customerChips(ivar)[0]).toEqual({ label: 'Full Golf', tone: 'member' });
  });

  it('finds created customers alongside the roster', () => {
    const s = reducer(createInitialState(), { type: 'createCustomer', input: { firstName: 'Sam', lastName: 'Quillfeather', email: 'sam@gmail.com' } });
    const hits = findCustomers('quillfeather', liveRoster(s.customerEdits));
    expect(hits.map((c) => c.displayName)).toEqual(['Sam Quillfeather']);
  });

  it('lists who owes the course, most first', () => {
    const owing = customersOwing(customers);
    expect(owing.length).toBeGreaterThan(0);
    expect(owing.every((c) => c.balance > 0)).toBe(true);
    expect(owing[0].balance).toBeGreaterThanOrEqual(owing.at(-1)!.balance);
  });
});

describe('the new-customer form', () => {
  it('replaces the domain rather than appending to it, as v1 did', () => {
    expect(withEmailDomain('sam@yahoo.com', '@gmail.com')).toBe('sam@gmail.com');
    expect(withEmailDomain('sam', '@gmail.com')).toBe('sam@gmail.com');
    expect(withEmailDomain('  sam@  ', '@aol.com')).toBe('sam@aol.com');
  });

  it('needs a last name, and a phone or an email — either will do', () => {
    const blank = { firstName: 'Sam', lastName: '', email: '', phone: '' };
    expect(customerDraftProblem(blank)).toBe('Add a last name');
    expect(customerDraftProblem({ ...blank, lastName: 'Q' })).toBe('Add a phone number or an email');
    expect(customerDraftProblem({ ...blank, lastName: 'Q', email: 'sam@gmail.com' })).toBeNull();
    expect(customerDraftProblem({ ...blank, lastName: 'Q', phone: '(555) 234-1234' })).toBeNull();
  });

  it('says an address or a number is malformed before Save, not after', () => {
    const s = customerDraftStatus({ firstName: '', lastName: 'Q', email: 'sam@gmail', phone: '555' });
    expect(s.emailInvalid).toBe(true);
    expect(s.phoneInvalid).toBe(true);
    expect(s.hasContact).toBe(false);
  });
});

describe('house account and card on file', () => {
  it('reads a card as good through the end of its month', () => {
    const may21 = new Date(2026, 4, 21);
    expect(cardExpired('05/2026', may21)).toBe(false);
    expect(cardExpired('04/2026', may21)).toBe(true);
    expect(cardExpired('01/2025', may21)).toBe(true);
    expect(cardExpired('11/2039', may21)).toBe(false);
    expect(cardExpired(undefined, may21)).toBe(false);
  });

  it('will not put an account payment back on an account', () => {
    expect(houseAccountProblem([burger()])).toBeNull();
    expect(houseAccountProblem([{ name: 'Account payment', price: 10, qty: 1, accountPayment: { customerId: 'x' } }])).not.toBeNull();
  });

  it('keeps each customer’s ledger apart, newest first', () => {
    const entries = [
      { id: 'AE-1', customerId: 'a', date: '', time: '', kind: 'charge' as const, amount: 1, staffId: 's' },
      { id: 'AE-2', customerId: 'b', date: '', time: '', kind: 'charge' as const, amount: 2, staffId: 's' },
      { id: 'AE-3', customerId: 'a', date: '', time: '', kind: 'payment' as const, amount: 1, staffId: 's' },
    ];
    expect(accountHistory(entries, 'a').map((e) => e.id)).toEqual(['AE-3', 'AE-1']);
  });

  it('starts a tender on whoever the order is for', () => {
    const s = createInitialState();
    expect(orderCustomerId(s)).toBeNull();
    expect(orderCustomerId({ ...s, payingAccountId: '458337' })).toBe('458337');
  });
});

describe('gift cards', () => {
  it('badges a card with nothing left on it', () => {
    expect(isSpent({ balance: 0 })).toBe(true);
    expect(isSpent({ balance: 0.01 })).toBe(false);
  });

  it('labels a card issued before categories as everything but alcohol', () => {
    expect(categoryLabels({})).toEqual(['Merchandise', 'F&B', 'Tee fees']);
    expect(categoryLabels({ categories: ['alcohol', 'fnb'] })).toEqual(['F&B', 'Alcohol']);
  });

  it('searches by holder, card number and UPC, and totals what is outstanding', () => {
    const list = ivar.giftCards.map((card) => ({ card, customerId: ivar.id, holder: 'Ivar Brennevin' }));
    expect(searchGiftCards('brennevin', list)).toHaveLength(2);
    expect(searchGiftCards('261901', list)).toHaveLength(1);
    // The ported cards carry no UPC; an issued card does.
    const issued = [...list, { card: { ...list[0].card, id: 'GC-7', upc: '600400000007' }, holder: 'Sam Q' }];
    expect(searchGiftCards('0000007', issued).map((x) => x.card.id)).toEqual(['GC-7']);
    expect(searchGiftCards('', list)).toHaveLength(2);
    expect(giftCardTotals(list).outstanding).toBe(Math.round((37.6 + 124.84) * 100) / 100);
  });

  it('pays the burger and not the beer', () => {
    const cart = [burger(2), beer(2)];
    const t = orderTotals(cart);
    const pays = giftCardCanPay({ balance: 200 }, cart, t.total, null);
    const burgerShare = 16 + (16 / t.subtotal) * t.tax;
    expect(pays).toBeCloseTo(burgerShare, 2);
  });

  it('does not let a second card pay the beer the first one refused', () => {
    const cart = [burger(2), beer(2)];
    let s = { ...createInitialState(), cart };
    const first = giftCardCanPay({ balance: 200 }, cart, amountDue(s), s.splitTender);
    s = reducer(s, { type: 'payPart', method: 'giftcard', amount: first, ref: { giftCardId: 'x' } });
    expect(s.splitTender?.paid).toBe(first);
    expect(giftCardCanPay({ balance: 200 }, cart, amountDue(s), s.splitTender)).toBe(0);
    // A card that is good for alcohol can pay what is left.
    expect(giftCardCanPay({ balance: 200, categories: ['alcohol'] }, cart, amountDue(s), { tenders: [] })).toBe(amountDue(s));
  });

  it('is capped at the balance', () => {
    expect(giftCardCanPay({ balance: 3.5 }, [burger(2)], 100, null)).toBe(3.5);
  });

  it('prints a holder on the roster by name alone, and leaves one off the roster as sold', () => {
    const list = [
      { card: ivar.giftCards[0], customerId: ivar.id, holder: ivar.displayName },
      { card: { ...ivar.giftCards[0], id: 'GC-1' }, holder: 'Pat Walk-in' },
    ];
    expect(withPlainHolders(list, {}).map((x) => x.holder)).toEqual(['Ivar Brennevin', 'Pat Walk-in']);
  });
});
