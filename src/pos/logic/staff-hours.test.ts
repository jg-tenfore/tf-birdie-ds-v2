import { describe, expect, it } from 'vitest';
import { SEED_PUNCHES, type Punch } from '../data/staff-seed';
import { fmtHours, punchDays, punchHours, weekStart, weeklyTotals } from './staff-hours';

const today = '2026-05-21';
const now = '12:00 PM';
const punch = (p: Partial<Punch>): Punch => ({ id: 'PU-x', staffId: 's-1', date: today, in: '6:30 AM', ...p });

describe('hours on a punch', () => {
  it('pairs the in with the out, to a quarter-hour', () => {
    expect(punchHours(punch({ out: '3:00 PM' }), now, today)).toBe(8.5);
    expect(punchHours(punch({ in: '6:45 AM', out: '2:45 PM' }), now, today)).toBe(8);
  });

  it('counts an open punch up to now — but only on its own day', () => {
    expect(punchHours(punch({}), now, today)).toBe(5.5);
    // Left open from yesterday: a forgotten clock-out, not 29 hours.
    expect(punchHours(punch({ date: '2026-05-20' }), now, today)).toBe(0);
  });

  it('reads as hours', () => {
    expect(fmtHours(8)).toBe('8 h');
    expect(fmtHours(7.75)).toBe('7.75 h');
    expect(fmtHours(5.5)).toBe('5.5 h');
  });
});

describe('the log by day', () => {
  it('puts today first and each day in clock order', () => {
    const days = punchDays(SEED_PUNCHES, now, today);
    expect(days[0].date).toBe(today);
    expect(days.map((d) => d.date)).toEqual([...days.map((d) => d.date)].sort().reverse());
    expect(days[0].punches[0].in).toBe('6:00 AM');
  });
});

describe('the pay week', () => {
  it('runs Monday to Sunday', () => {
    // Thursday May 21, 2026 → Monday May 18.
    expect(weekStart('2026-05-21')).toBe('2026-05-18');
    expect(weekStart('2026-05-18')).toBe('2026-05-18');
    // Sunday belongs to the week before it.
    expect(weekStart('2026-05-17')).toBe('2026-05-11');
  });

  it('totals each person over their days, newest week first', () => {
    const weeks = weeklyTotals(SEED_PUNCHES, now, today);
    expect(weeks[0].weekStart).toBe('2026-05-18');
    expect(weeks[0].weekEnd).toBe('2026-05-24');
    const avery = weeks[0].rows.find((r) => r.staffId === 's-1')!;
    // Mon–Wed at 8.5 h each, and today's 5.5 h so far.
    expect(avery.days).toBe(4);
    expect(avery.hours).toBe(8.5 * 3 + 5.5);
    expect(weeks[0].hours).toBe(weeks[0].rows.reduce((s, r) => s + r.hours, 0));
    // Most hours first.
    expect(weeks[0].rows.map((r) => r.hours)).toEqual([...weeks[0].rows.map((r) => r.hours)].sort((a, b) => b - a));
  });
});
