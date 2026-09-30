import { describe, expect, it } from 'vitest';
import { SEED_ROOMS } from '../data/floor';
import { SEED_TABS } from '../data/restaurant-seed';
import {
  NO_TABLE,
  attention,
  clockMin,
  formatOpenFor,
  groupTabRows,
  matchesQuery,
  minGuests,
  sortTabRows,
  tabRows,
} from './tab-list';

const NOON = 12 * 60;
const rows = () => tabRows(SEED_TABS, SEED_ROOMS, NOON);
const ids = (rs: { tab: { id: string } }[]) => rs.map((r) => r.tab.id);

describe('reading the clock', () => {
  it('reads a tab’s opening time as minutes from midnight', () => {
    expect(clockMin('11:35 AM')).toBe(11 * 60 + 35);
    expect(clockMin('12:05 PM')).toBe(12 * 60 + 5);
    expect(clockMin('12:05 AM')).toBe(5);
    expect(clockMin('7:40 pm')).toBe(19 * 60 + 40);
    expect(clockMin('soon')).toBeNull();
  });

  it('says how long in the way a server would', () => {
    expect(formatOpenFor(25)).toBe('25 min');
    expect(formatOpenFor(60)).toBe('1 hr');
    expect(formatOpenFor(70)).toBe('1 hr 10 min');
  });
});

describe('a row', () => {
  it('carries what a server scans for: table, time open, total, check requested, unsent', () => {
    const byId = Object.fromEntries(rows().map((r) => [r.tab.id, r]));
    expect(byId['T-1003'].table).toBe('Table 10');
    expect(byId['T-1003'].room).toBe('Dining Room');
    expect(byId['T-1003'].minutesOpen).toBe(50);
    expect(byId['T-1003'].tab.checkRequested).toBe(true);
    // Half sent: the mains went, the dessert and the wine did not.
    expect(byId['T-1002'].unsentCount).toBe(2);
    expect(byId['T-1001'].unsentCount).toBe(0);
    expect(byId['T-1004'].lineCount).toBe(0);
    expect(byId['T-1006'].table).toBe(NO_TABLE);
    expect(byId['T-1001'].server).toBe('Jordan Ellis');
    expect(byId['T-1001'].total).toBeGreaterThan(0);
  });

  it('lists only open tabs', () => {
    const paid = { ...SEED_TABS[0], status: 'paid' as const };
    expect(ids(tabRows([paid, ...SEED_TABS.slice(1)], SEED_ROOMS, NOON))).not.toContain(paid.id);
  });

  it('ranks what needs someone: check, then unsent food, then nothing ordered', () => {
    const byId = Object.fromEntries(rows().map((r) => [r.tab.id, r]));
    expect(attention(byId['T-1003'])).toBeGreaterThan(attention(byId['T-1002']));
    expect(attention(byId['T-1002'])).toBeGreaterThan(attention(byId['T-1004']));
    expect(attention(byId['T-1004'])).toBeGreaterThan(attention(byId['T-1001']));
  });
});

describe('sorting', () => {
  it('puts the tab open longest first by default', () => {
    expect(ids(sortTabRows(rows(), 'opened', 'asc'))[0]).toBe('T-1003');
    expect(ids(sortTabRows(rows(), 'opened', 'desc'))[0]).toBe('T-1004');
  });

  it('sorts tables naturally, and leaves tabs with no table at the end either way', () => {
    const asc = sortTabRows(rows(), 'table', 'asc').map((r) => r.table);
    expect(asc.indexOf('Table 5')).toBeLessThan(asc.indexOf('Table 10'));
    expect(asc[asc.length - 1]).toBe(NO_TABLE);
    const desc = sortTabRows(rows(), 'table', 'desc').map((r) => r.table);
    expect(desc[desc.length - 1]).toBe(NO_TABLE);
  });

  it('sorts by total, and by what needs attention', () => {
    const totals = sortTabRows(rows(), 'total', 'desc').map((r) => r.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
    expect(ids(sortTabRows(rows(), 'status', 'desc'))[0]).toBe('T-1003');
  });

  it('does not change the rows it was given', () => {
    const r = rows();
    const before = ids(r);
    sortTabRows(r, 'total', 'desc');
    expect(ids(r)).toEqual(before);
  });
});

describe('grouping', () => {
  it('groups by server, keeping the sort inside and between groups', () => {
    const groups = groupTabRows(sortTabRows(rows(), 'opened', 'asc'), 'server');
    expect(groups.map((g) => g.label)).toEqual(['Jordan Ellis', 'Marcus Webb', 'Priya Nair']);
    expect(ids(groups[0].rows)).toEqual(['T-1003', 'T-1001']);
    expect(groups[0].total).toBeCloseTo(groups[0].rows.reduce((s, r) => s + r.total, 0), 2);
  });

  it('groups by room, with tabs that have no table in their own group', () => {
    const labels = groupTabRows(rows(), 'room').map((g) => g.label);
    expect(labels).toContain('Dining Room');
    expect(labels).toContain(NO_TABLE);
  });

  it('is one unlabelled group when ungrouped', () => {
    const g = groupTabRows(rows(), 'none');
    expect(g).toHaveLength(1);
    expect(g[0].label).toBe('');
  });
});

describe('the search box', () => {
  it('matches a name, a table or a server', () => {
    const r = rows();
    expect(ids(r.filter((x) => matchesQuery(x, 'farns')))).toEqual(['T-1003']);
    expect(ids(r.filter((x) => matchesQuery(x, 'table 5')))).toEqual(['T-1002']);
    expect(ids(r.filter((x) => matchesQuery(x, 'marcus')))).toEqual(['T-1005', 'T-1006']);
    expect(r.filter((x) => matchesQuery(x, '  '))).toHaveLength(r.length);
  });
});

describe('the guest count', () => {
  it('cannot drop below the highest seat with a plate on it', () => {
    const t1003 = SEED_TABS.find((t) => t.id === 'T-1003')!;
    expect(minGuests(t1003)).toBe(8);
    expect(minGuests(SEED_TABS.find((t) => t.id === 'T-1004')!)).toBe(1);
    // Shared plates have no seat, so they hold nothing up.
    expect(minGuests(SEED_TABS.find((t) => t.id === 'T-1006')!)).toBe(1);
  });
});
