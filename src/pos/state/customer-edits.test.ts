import { describe, expect, it } from 'vitest';
import { liveCustomer, liveRoster, roster } from '../data/roster';
import { createInitialState, reducer } from './pos-store';

/**
 * Edits to a customer record, for the length of a session.
 *
 * Weston's case is fixing a wrong email at the counter — "no, actually it's at Gmail" — and an
 * edit that vanishes the moment the record closes demonstrates a form, not a fix. So Save
 * writes into state and every read goes through the overlay.
 *
 * An overlay rather than a mutated roster: the committed records stay a fixed thing you can
 * open and read, so a demo always starts from the same place, and the edits travel as ordinary
 * reducer state.
 */
describe('customer edits', () => {
  const someone = roster.find((c) => c.email)!;

  it('starts empty, and an untouched record reads exactly as committed', () => {
    const s = createInitialState({});
    expect(s.customerEdits).toEqual({});
    expect(liveCustomer(someone.id, s.customerEdits)).toBe(someone);
  });

  it('folds a saved edit over the committed record', () => {
    let s = createInitialState({});
    s = reducer(s, { type: 'patchCustomer', customerId: someone.id, patch: { email: 'fixed@gmail.com' } });
    expect(liveCustomer(someone.id, s.customerEdits)?.email).toBe('fixed@gmail.com');
    // The committed record is untouched — this is an overlay, not a mutation.
    expect(someone.email).not.toBe('fixed@gmail.com');
  });

  it('merges successive edits rather than replacing them', () => {
    let s = createInitialState({});
    s = reducer(s, { type: 'patchCustomer', customerId: someone.id, patch: { email: 'a@b.com' } });
    s = reducer(s, { type: 'patchCustomer', customerId: someone.id, patch: { notes: 'walks' } });
    const live = liveCustomer(someone.id, s.customerEdits);
    expect(live?.email).toBe('a@b.com');
    expect(live?.notes).toBe('walks');
  });

  it('leaves everyone else alone', () => {
    let s = createInitialState({});
    s = reducer(s, { type: 'patchCustomer', customerId: someone.id, patch: { email: 'x@y.com' } });
    const other = roster.find((c) => c.id !== someone.id)!;
    expect(liveCustomer(other.id, s.customerEdits)).toBe(other);
  });

  it('returns the roster itself when nothing has been edited', () => {
    // Identity, not a copy: search and pricing run over this on every render.
    expect(liveRoster({})).toBe(roster);
  });

  it('shows an edit to the roster search reads too', () => {
    const edits = { [someone.id]: { email: 'searchable@gmail.com' } };
    expect(liveRoster(edits).find((c) => c.id === someone.id)?.email).toBe('searchable@gmail.com');
  });
});
