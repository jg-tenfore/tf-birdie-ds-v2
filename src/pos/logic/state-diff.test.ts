import { describe, expect, it } from 'vitest';
import { diffTeeSheet } from './state-diff';
import { createInitialState, reducer } from '../state/pos-store';
import type { Action, PosState } from '../state/pos-store';
import type { Booking } from '../types';

/**
 * The change list under every Tee Sheet Actions story comes from here.
 *
 * It is worth testing because its whole reason to exist is that a hand-written description
 * of an action's outcome drifts from the reducer. A diff that quietly missed a change would
 * put us back where we started, except now the showcase would look authoritative.
 */

const base = (bookings: Booking[] = []): PosState =>
  createInitialState({ venueId: 'nine', bookings });

const run = (state: PosState, ...actions: Action[]) => {
  const after = actions.reduce(reducer, state);
  return diffTeeSheet(state, after);
};

const b = (over: Partial<Booking> & { id: string }): Booking =>
  ({
    course: 'the-nine',
    date: '2026-05-21',
    timeMin: 480,
    slot: 0,
    players: 2,
    name: 'Reed, M.',
    pay: 'open',
    status: 'booked',
    price: 100,
    holes: '18H',
    cart: 'cart',
    phone: '',
    conf: 'R-1',
    playerStates: [
      { paid: false, step: -1, noShow: false },
      { paid: false, step: -1, noShow: false },
    ],
    ...over,
  }) as Booking;

describe('diffTeeSheet', () => {
  it('reports nothing when nothing changed', () => {
    const s = base([b({ id: 'x' })]);
    expect(diffTeeSheet(s, s)).toEqual([]);
  });

  it('reports nothing for an action that only changes what is shown', () => {
    // The distinction the stories rely on: loading a booking into the register, changing
    // the band, or hiding the order panel are not writes to the sheet.
    const s = base([b({ id: 'x' })]);
    expect(run(s, { type: 'loadBooking', bookingId: 'x' })).toEqual([]);
    expect(run(s, { type: 'setShift', shift: 'peak' })).toEqual([]);
    expect(run(s, { type: 'toggleLeftPanel', collapsed: true })).toEqual([]);
  });

  it('names an added booking with its party and where it landed', () => {
    const changes = run(base(), {
      type: 'addBookings',
      bookings: [b({ id: 'n', name: 'Okafor, N.', players: 3 })],
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('added');
    expect(changes[0].label).toContain('Okafor, N.');
    expect(changes[0].label).toContain('3P');
  });

  it('collapses a group into one line rather than listing every row', () => {
    // A league writes six bookings; six identical lines would bury the actual outcome.
    const league = [0, 1, 2].flatMap((n) =>
      ['the-nine'].map((c) =>
        b({ id: `l${n}`, course: c, timeMin: 480 + n * 8, groupId: 'grp', name: 'League' }),
      ),
    );
    const changes = run(base(), { type: 'addBookings', bookings: league });
    expect(changes).toHaveLength(1);
    expect(changes[0].label).toMatch(/Added 3 tee times/);
  });

  it('reports a removal', () => {
    const changes = run(base([b({ id: 'x', name: 'Garcia, L.' })]), {
      type: 'deleteBookings',
      bookingIds: ['x'],
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('removed');
    expect(changes[0].label).toContain('Garcia, L.');
  });

  it('names the fields a patch changed, before and after', () => {
    const changes = run(base([b({ id: 'x' })]), {
      type: 'patchBooking',
      bookingId: 'x',
      patch: { pay: 'paid' },
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('changed');
    expect(changes[0].detail).toContain('payment open → paid');
  });

  it('sees a check-in, which changes no field on the booking itself', () => {
    // The case a plain field comparison misses entirely: per-player state is a nested
    // array, and checking a group in is the most common action on the sheet.
    const changes = run(base([b({ id: 'x' })]), {
      type: 'patchBooking',
      bookingId: 'x',
      patch: { playerStates: [
        { paid: false, step: 0, noShow: false },
        { paid: false, step: 0, noShow: false },
      ] },
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].detail).toContain('checked in 0/2 → 2/2');
  });

  it('sees a part-payment', () => {
    const changes = run(base([b({ id: 'x' })]), {
      type: 'patchBooking',
      bookingId: 'x',
      patch: { playerStates: [
        { paid: true, step: -1, noShow: false },
        { paid: false, step: -1, noShow: false },
      ] },
    });
    expect(changes[0].detail).toContain('paid 0/2 → 1/2');
  });

  it('reports a move as all three fields together', () => {
    const changes = run(base([b({ id: 'x' })]), {
      type: 'patchBooking',
      bookingId: 'x',
      patch: { timeMin: 496, slot: 2 },
    });
    expect(changes[0].detail).toContain('time');
    expect(changes[0].detail).toContain('slot');
  });

  it('reports a time-row note and its removal', () => {
    const s = base();
    const set = run(s, {
      type: 'setTimeNote',
      key: '2026-5-21_480',
      note: { text: 'Frost delay', color: 'yellow' },
    });
    expect(set).toHaveLength(1);
    expect(set[0].kind).toBe('annotation');
    expect(set[0].detail).toBe('Frost delay');

    const withNote = reducer(s, {
      type: 'setTimeNote',
      key: '2026-5-21_480',
      note: { text: 'Frost delay', color: 'yellow' },
    });
    const cleared = diffTeeSheet(
      withNote,
      reducer(withNote, { type: 'setTimeNote', key: '2026-5-21_480', note: null }),
    );
    expect(cleared[0].label).toMatch(/cleared/);
  });

  it('reports a price override', () => {
    const changes = run(base(), {
      type: 'setTimePrice',
      key: '2026-5-21_480',
      price: { label: 'Twilight rate', fee: 39 },
    });
    expect(changes[0].kind).toBe('annotation');
    expect(changes[0].label).toMatch(/Price override/);
  });

  it('reports course state separately from bookings', () => {
    const s = base([b({ id: 'x' })]);
    const locked = run(s, { type: 'patchCourse', courseId: 'the-nine', patch: { locked: true } });
    expect(locked).toHaveLength(1);
    expect(locked[0].kind).toBe('course');
    expect(locked[0].label).toMatch(/locked/);

    const hidden = run(s, { type: 'patchCourse', courseId: 'the-nine', patch: { visible: false } });
    expect(hidden[0].label).toMatch(/hidden/);
  });

  it('reports a settings change', () => {
    const changes = run(base(), { type: 'patchSettings', patch: { compactMode: true } });
    expect(changes).toHaveLength(1);
    expect(changes[0].kind).toBe('setting');
    expect(changes[0].label).toContain('compactMode');
  });
});
