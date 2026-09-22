import { describe, expect, it } from 'vitest';
import type { Booking, Course, PlayerState } from '../types';
import { isEditableSeat, patchEachPlayer, playerHoles, resetPlayer, resizeParty, setPlayer, setPlayerHoles } from './reservation';

/**
 * The phone reservation screen's edits: growing a party where it sits, resetting a player,
 * and group edits that skip paid players.
 */

const seat = (paid = false): PlayerState => ({ paid, step: -1, noShow: false });

const booking = (over: Partial<Booking> = {}): Booking =>
  ({
    id: 'b1',
    date: '2026-05-21',
    course: 'c',
    slot: 0,
    timeMin: 480,
    name: 'Reed, M.',
    players: 2,
    cart: 'walking',
    status: 'booked',
    phone: '',
    conf: 'R-1',
    pay: 'open',
    price: 59,
    holes: '18H',
    playerStates: [seat(), seat()],
    ...over,
  }) as Booking;

const course = { id: 'c', slots: 4 } as Course;
const other = (slot: number, players: number) => booking({ id: `o${slot}`, slot, players });

describe('resizeParty', () => {
  it('grows in place when the run beside it has room', () => {
    const b = booking();
    expect(resizeParty(b, 3, course, [b])).toMatchObject({ players: 3, slot: 0 });
  });

  it('slides the starting slot back so a party near the end stays on the row', () => {
    const b = booking({ slot: 2 });
    const patch = resizeParty(b, 3, course, [b]);
    expect(patch).toMatchObject({ players: 3, slot: 1 });
    expect(patch.playerStates).toHaveLength(3);
  });

  it('refuses a size the row cannot seat together', () => {
    const b = booking({ slot: 2 });
    expect(resizeParty(b, 3, course, [b, other(0, 2)])).toEqual({});
  });

  it('shrinks from the end and keeps the slot', () => {
    const b = booking({ players: 3, playerStates: [seat(), seat(), seat()] });
    expect(resizeParty(b, 2, course, [b])).toMatchObject({ players: 2 });
    expect(resizeParty(b, 2, course, [b]).slot).toBeUndefined();
  });
});

describe('resetPlayer', () => {
  it('clears every override on that player only', () => {
    const b0 = booking();
    const b = { ...b0, ...setPlayer(b0, 1, { holes: 9, fee: 20, transport: 'cart' }) };
    const reset = { ...b, ...resetPlayer(b, 1) };
    expect(reset.playerStates[1]).toEqual({ ...seat(), holes: undefined, fee: undefined, transport: undefined });
  });
});

describe('patchEachPlayer', () => {
  it('applies an edit to the players the filter admits, composing edits', () => {
    const b = booking({ players: 3, playerStates: [seat(), seat(true), seat()] });
    const next = { ...b, ...patchEachPlayer(b, (x, i) => setPlayerHoles(x, i, 9), isEditableSeat) };
    expect([0, 1, 2].map((i) => playerHoles(next, i))).toEqual([9, 18, 9]);
  });
});

describe('isEditableSeat', () => {
  it('locks paid and no-show seats', () => {
    expect(isEditableSeat(seat())).toBe(true);
    expect(isEditableSeat(seat(true))).toBe(false);
    expect(isEditableSeat({ ...seat(), noShow: true })).toBe(false);
    expect(isEditableSeat(undefined)).toBe(false);
  });
});
