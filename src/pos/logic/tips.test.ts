import { describe, expect, it } from 'vitest';
import { SEED_PAYMENTS } from '../data/restaurant-seed';
import { createInitialState, reducer } from '../state/pos-store';
import { dayTotals, tipAdjustable, tipAt, tipNeedsConfirm, tipPercent, tipsByStaff } from './tips';

describe('the day’s totals', () => {
  it('are numbers even on a day with nothing in it — v1’s band printed labels and no values', () => {
    const t = dayTotals([]);
    expect(t).toEqual({ payments: 0, sales: 0, tips: 0, card: 0, cash: 0, averageTipPct: 0, adjusted: 0 });
  });

  it('averages the tip over tipped sales, so untipped retail does not drag it down', () => {
    const t = dayTotals(SEED_PAYMENTS);
    // Every seeded tip is 15–22%; an average over all payments would fall well below that.
    expect(t.averageTipPct).toBeGreaterThanOrEqual(15);
    expect(t.averageTipPct).toBeLessThanOrEqual(23);
  });

  it('add up the seeded morning, card and cash apart', () => {
    const t = dayTotals(SEED_PAYMENTS);
    expect(t.payments).toBe(SEED_PAYMENTS.length);
    expect(t.card + t.cash).toBeCloseTo(t.sales + t.tips, 2);
    expect(t.tips).toBeGreaterThan(0);
  });
});

describe('tips', () => {
  it('can be adjusted only on a card — a cash tip is already paid out', () => {
    expect(tipAdjustable({ ...SEED_PAYMENTS[0], method: 'card' })).toBe(true);
    expect(tipAdjustable({ ...SEED_PAYMENTS[0], method: 'cash' })).toBe(false);
  });

  it('reads as a percentage without dividing by zero', () => {
    expect(tipPercent({ amount: 50, tip: 10 })).toBe(20);
    expect(tipPercent({ amount: 0, tip: 5 })).toBe(0);
  });

  it('suggests a tip to the cent', () => {
    expect(tipAt(47.35, 18)).toBe(8.52);
  });

  it('asks before accepting a tip bigger than half the sale — the slipped-digit guard', () => {
    expect(tipNeedsConfirm(40, 8)).toBe(false);
    expect(tipNeedsConfirm(40, 80)).toBe(true);
  });

  it('are totalled by who took them, highest first, leaving out anyone with none', () => {
    const rows = tipsByStaff(SEED_PAYMENTS);
    expect(rows.map((r) => r.tips)).toEqual([...rows.map((r) => r.tips)].sort((a, b) => b - a));
    // The pro shop took no tips, so it is not listed at $0.00.
    expect(rows.some((r) => r.staffId === 's-6')).toBe(false);
  });
});

describe('adjusting a tip through the store', () => {
  const s0 = createInitialState();
  const card = s0.payments.find((p) => p.method === 'card')!;
  const cash = s0.payments.find((p) => p.method === 'cash')!;

  it('changes the tip and stamps when', () => {
    const s = reducer(s0, { type: 'adjustTip', paymentId: card.id, tip: 12.345 });
    const p = s.payments.find((x) => x.id === card.id)!;
    expect(p.tip).toBe(12.35);
    expect(p.tipAdjustedAt).toBeTruthy();
    expect(p.amount).toBe(card.amount);
  });

  it('refuses a cash payment, and a negative tip becomes zero', () => {
    expect(reducer(s0, { type: 'adjustTip', paymentId: cash.id, tip: 5 }).payments.find((x) => x.id === cash.id)!.tip).toBe(cash.tip);
    expect(reducer(s0, { type: 'adjustTip', paymentId: card.id, tip: -4 }).payments.find((x) => x.id === card.id)!.tip).toBe(0);
  });
});
