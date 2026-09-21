import { describe, expect, it } from 'vitest';
import { ALL_GOLFERS } from '../data/golfers';
import { createInitialState, golferRoster, reducer } from '../state/pos-store';
import { buildCustomer, customerName, nextCustomerId } from './customers';

const fields = { first: 'Ava', last: 'Reed', phone: '(555) 010-2030', email: '', memberType: null, hcp: '12', notes: '' };

describe('customerName', () => {
  it('stores surname first, like the roster', () => {
    expect(customerName(' Ava ', 'Reed')).toBe('Reed, Ava');
    expect(customerName('Ava', '')).toBe('Ava');
    expect(customerName('', 'Reed')).toBe('Reed');
  });
});

describe('nextCustomerId', () => {
  it('counts from the session additions, deterministically', () => {
    expect(nextCustomerId([])).toBe('N001');
    const one = [buildCustomer('N001', fields)];
    expect(nextCustomerId(one)).toBe('N002');
  });

  it('skips ids already taken', () => {
    expect(nextCustomerId([buildCustomer('N002', fields)])).toBe('N003');
  });

  it('never collides with the demo roster', () => {
    expect(ALL_GOLFERS.some((g) => g.id === nextCustomerId([], ALL_GOLFERS))).toBe(false);
  });
});

describe('addGolfer', () => {
  it('puts a new customer into the sorted session roster', () => {
    const s0 = createInitialState({});
    const golfer = buildCustomer(nextCustomerId(s0.addedGolfers, golferRoster(s0)), fields);
    const s1 = reducer(s0, { type: 'addGolfer', golfer });
    const roster = golferRoster(s1);
    expect(roster).toHaveLength(ALL_GOLFERS.length + 1);
    expect(roster.find((g) => g.id === 'N001')).toMatchObject({ name: 'Reed, Ava', type: 'Guest', hcp: 12 });
    expect(roster.map((g) => g.name)).toEqual([...roster.map((g) => g.name)].sort((a, b) => a.localeCompare(b)));
  });
});
