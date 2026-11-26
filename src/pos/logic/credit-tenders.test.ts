import { describe, expect, it } from 'vitest';
import { liveCustomer } from '../data/roster';
import { rainChecks } from '../data/rain-checks';
import type { ResourceBooking } from '../data/resources';
import type { CartItem } from '../types';
import { lineTotals, orderTotals } from './cart';
import { coveredByCredits, creditCoverage, creditOptions, trimCoverage, type CreditOption } from './credit-tenders';
import { refundSplit, type OrderRecord } from './orders';

const today = new Date(2026, 4, 21);
const round = (players = 1): CartItem => ({
  name: 'Guest Rate 18 Holes',
  unitPrice: 59,
  price: 59 * players,
  qty: players,
  isCheckIn: true,
  players: Array.from({ length: players }, (_, i) => ({
    name: `Guest ${i + 1}`,
    transport: 'cart' as const,
    modifierTags: [{ name: 'Riding Cart', tag: 'Riding Cart', tagColor: '#000', p: 20, isTransport: true }],
  })),
});
const beer: CartItem = { name: 'Beer Domestic', price: 5, qty: 2 };
const bucket: CartItem = { name: 'Range Bucket Large', price: 14, qty: 1 };
const ledger = { spend: {}, rainChecks };
const ctx = (cart: CartItem[], extra: Partial<Parameters<typeof creditCoverage>[2]> = {}) => {
  const totals = lineTotals(cart);
  return { totals, due: orderTotals(cart).total, ...extra };
};
const option = (kind: Parameters<typeof creditOptions>[0], customerId: string, pick: (o: CreditOption) => boolean = () => true) =>
  creditOptions(kind, liveCustomer(customerId)!, ledger, today).find(pick)!;

describe('lineTotals', () => {
  it('adds up to the order total to the cent, tax shared by what each line charges', () => {
    const cart = [round(3), beer, bucket, { name: 'Taxes', price: 7.5, qty: 1, isTax: true, isSubItem: true }];
    const t = lineTotals(cart);
    expect(t.reduce((s, x) => s + x, 0)).toBeCloseTo(orderTotals(cart).total, 2);
    expect(t[3]).toBe(0);
    // The golf carries its booking's tax line; the beer and the bucket share the sales tax.
    expect(t[0]).toBeCloseTo(237 + 7.5, 2);
    expect(t[1]).toBeCloseTo(10.8, 2);
  });
});

describe('credits as tenders', () => {
  it("a credit book pays only what it applies to — the tee fee, not a men's-league beer", () => {
    const book = option('creditbook', '458349'); // Kelsey Sutton, Men's League Weekly Play
    expect(book.title).toBe("Men's League Weekly Play");
    const cart = [round(1), beer];
    const c = creditCoverage(book, cart, ctx(cart));
    expect(c.lines.map((l) => l.index)).toEqual([0]);
    expect(c.amount).toBeCloseTo(lineTotals(cart)[0], 2);
    expect(c.cannot.map((x) => x.name)).toEqual(['Beer Domestic']);
  });

  it('a Member-Guest book does pay for alcohol', () => {
    const book = option('creditbook', '458348'); // Chris Moreno, Member-Guest
    const c = creditCoverage(book, [beer], ctx([beer]));
    expect(c.amount).toBeCloseTo(10.8, 2);
    expect(c.cannot).toEqual([]);
  });

  it('a rain check pays tee times only, and its amount can be keyed down', () => {
    const rc = option('raincheck', '458349', (o) => o.usable);
    const cart = [round(1), bucket];
    const c = creditCoverage(rc, cart, ctx(cart));
    expect(c.lines.map((l) => l.index)).toEqual([0]);
    expect(c.amount).toBeLessThanOrEqual(rc.balance);
    expect(c.cannot[0].reason).toMatch(/tee times only/);
    const keyed = trimCoverage(c, 10);
    expect(keyed.amount).toBe(10);
  });

  it('an expired rain check, an exhausted card and an overdrawn book cannot pay', () => {
    const expired = creditOptions('raincheck', liveCustomer('458349')!, { spend: {}, rainChecks }, new Date(2028, 0, 1));
    expect(expired.every((o) => !o.usable && o.reason?.startsWith('Expired'))).toBe(true);
    const range = option('punchcard', '458346', (o) => o.id === 'CPC-10611');
    const used = creditOptions('punchcard', liveCustomer('458346')!, { spend: { [range.key]: 7 }, rainChecks }, today).find((o) => o.key === range.key)!;
    expect(used.usable).toBe(false);
  });

  it('a punch pays one bucket, with its tax', () => {
    const range = option('punchcard', '458346', (o) => o.id === 'CPC-10611');
    expect(range.balance).toBe(7);
    const cart = [{ ...bucket, qty: 2 }, beer];
    const c = creditCoverage(range, cart, ctx(cart));
    expect(c.units).toBe(2);
    expect(c.amount).toBeCloseTo(lineTotals(cart)[0], 2);
    expect(c.cannot.map((x) => x.name)).toEqual(['Beer Domestic']);
  });

  it('a green-fee punch pays the seat, never the ride', () => {
    const bundle = option('punchcard', '458349', (o) => o.title.endsWith('Any green fee'));
    const cart = [round(2)];
    const c = creditCoverage(bundle, cart, ctx(cart));
    expect(c.units).toBe(2);
    // Two $59 green fees of $158 of goods, with their tax share: the carts stay due.
    expect(c.amount).toBeCloseTo((118 / 158) * lineTotals(cart)[0], 2);
    expect(c.cannot[0].reason).toBe('the ride is still billed');
  });

  it('an activity takes minutes per punch — 90 minutes on a 60-minute card is two', () => {
    const sim = option('punchcard', '458346', (o) => o.id === 'CPC-10612');
    const bay: ResourceBooking = { id: 'RB-1', kind: 'bay', resourceId: 'bay-1', date: '2026-05-21', startMin: 600, durationMin: 90, name: 'Chen, M.', players: 2, checkedIn: false, paid: false };
    const cart: CartItem[] = [{ name: 'Bay 1 · 1 hr 30 min', price: 90, unitPrice: 90, qty: 1, resourceBookingId: 'RB-1' }];
    const c = creditCoverage(sim, cart, ctx(cart, { resources: [bay] }));
    expect(c.units).toBe(2);
    expect(c.amount).toBeCloseTo(lineTotals(cart)[0], 2);
  });

  const withPike = { instructorId: 'jordan-pike', instructor: 'Jordan Pike' };
  const withOrtega = { instructorId: 'sam-ortega', instructor: 'Sam Ortega' };

  it('a lesson credit pays a lesson of its own length only', () => {
    const thirty = option('lessoncredit', '458347', (o) => o.id === 'bal-jp-5');
    const cart: CartItem[] = [
      { name: 'Lesson 30 Min', price: 55, qty: 1, lesson: withPike },
      { name: 'Lesson 60 Min', price: 95, qty: 1, lesson: withPike },
    ];
    const c = creditCoverage(thirty, cart, ctx(cart));
    expect(c.units).toBe(1);
    expect(c.lines.map((l) => l.index)).toEqual([0]);
    expect(c.cannot[0].reason).toMatch(/60-minute/);
  });

  it('a lesson credit pays only its own instructor’s lessons (Nov 26 decision)', () => {
    const pike = option('lessoncredit', '458347', (o) => o.id === 'bal-jp-5');
    const cart: CartItem[] = [
      { name: 'Lesson 30 Min', price: 55, qty: 1, lesson: withOrtega },
      { name: 'Lesson 30 Min', price: 55, qty: 1, lesson: withPike },
      { name: 'Lesson 30 Min', price: 55, qty: 1 },
    ];
    const c = creditCoverage(pike, cart, ctx(cart));
    expect(c.lines.map((l) => l.index)).toEqual([1]);
    expect(c.cannot.map((x) => [x.index, x.reason])).toEqual([
      [0, 'Sam Ortega’s lesson, not Jordan Pike’s'],
      [2, 'no instructor on the lesson — this pack is Jordan Pike’s'],
    ]);
  });

  it('an academy-wide pack (no instructor) pays any instructor’s lesson', () => {
    const pike = option('lessoncredit', '458347', (o) => o.id === 'bal-jp-5');
    const any = { ...pike, rule: { kind: 'lesson' as const, minutes: 30, instructorId: null, instructor: 'Any instructor' } };
    const cart: CartItem[] = [{ name: 'Lesson 30 Min', price: 55, qty: 1, lesson: withOrtega }];
    expect(creditCoverage(any, cart, ctx(cart)).units).toBe(1);
  });

  it('a second credit on a split does not pay a line the first already paid', () => {
    const book = option('creditbook', '458349');
    const cart = [round(1), bucket];
    const first = creditCoverage(book, cart, ctx(cart));
    const covered = coveredByCredits([{ ref: { credit: { covers: Object.fromEntries(first.lines.map((l) => [l.index, l.amount])) } } }]);
    const again = creditCoverage(book, cart, ctx(cart, { covered, due: 0.01 + lineTotals(cart)[1] }));
    expect(again.lines.find((l) => l.index === 0)).toBeUndefined();
  });

  it('a refund goes back to a credit only for the lines it paid', () => {
    const order = {
      tenders: [
        { paymentId: 'P-1', method: 'creditbook', amount: 63.72 },
        { paymentId: 'P-2', method: 'card', amount: 10.8 },
      ],
      refunds: [],
    } as unknown as OrderRecord;
    // Refunding the beers: the book paid none of them, so it all goes to the card.
    expect(refundSplit(order, 10.8, 0, { 0: 0 })).toEqual([{ tender: 1, amount: 10.8 }]);
    // Refunding everything: each tender gets back what it paid.
    expect(refundSplit(order, 74.52, 0, { 0: 63.72 })).toEqual([
      { tender: 0, amount: 63.72 },
      { tender: 1, amount: 10.8 },
    ]);
  });
});
