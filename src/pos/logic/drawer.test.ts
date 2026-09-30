import { describe, expect, it } from 'vitest';
import { SEED_OPEN_SHIFT } from '../data/staff-seed';
import type { DrawerEvent } from '../state/register-extras';
import { dropProblem, isLargeVariance, shiftEvents, varianceLabel, varianceTone } from './drawer';

describe('variance', () => {
  it('reads as exact, over or short', () => {
    expect(varianceTone(0)).toBe('exact');
    expect(varianceTone(5)).toBe('over');
    expect(varianceTone(-10)).toBe('short');
    expect(varianceLabel(0)).toBe('Exact');
    expect(varianceLabel(5)).toBe('$5.00 over');
    expect(varianceLabel(-10)).toBe('$10.00 short');
  });

  it('asks twice at $20 either way', () => {
    expect(isLargeVariance(19.99)).toBe(false);
    expect(isLargeVariance(-20)).toBe(true);
    expect(isLargeVariance(35)).toBe(true);
  });
});

describe('a cash drop', () => {
  it('needs an amount, and cannot send the safe more than the drawer holds', () => {
    expect(dropProblem(0, 300)).toMatch(/Enter/);
    expect(dropProblem(NaN, 300)).toMatch(/Enter/);
    expect(dropProblem(300.01, 300)).toMatch(/\$300\.00/);
    expect(dropProblem(300, 300)).toBeNull();
  });
});

describe('the shift’s drawer events', () => {
  const ev = (id: string, date: string, time: string): DrawerEvent => ({ id, kind: 'drop', amount: 1, cashDelta: -1, operator: 's-1', date, time });

  it('are those on its date since it opened, oldest first', () => {
    const d = SEED_OPEN_SHIFT.date;
    const got = shiftEvents(SEED_OPEN_SHIFT, [ev('a', d, '11:00 AM'), ev('b', d, '6:00 AM'), ev('c', '2020-01-01', '9:00 AM'), ev('d', d, '7:15 AM')]);
    expect(got.map((e) => e.id)).toEqual(['d', 'a']);
  });
});
