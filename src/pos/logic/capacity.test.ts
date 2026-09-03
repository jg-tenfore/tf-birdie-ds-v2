import { describe, expect, it } from 'vitest';
import { largestFit, slotsFree } from './bookings';
import type { Booking, Course } from '../types';

/**
 * Capacity on one course at one time.
 *
 * The cases that matter are the malformed ones. The tee sheet's booking data really does
 * contain parties that overlap and parties that overrun the row, because the data is ported
 * from a prototype that never enforced either. Counting capacity as `slots - sum(players)`
 * reports zero free on rows the grid draws as empty, and the dialog then refuses bookings
 * the grid is visibly offering.
 */

const course = (slots: number): Course =>
  ({ id: 'c', name: 'Course', slots, holes: '9 HOLES', holeCount: 9, visible: true }) as Course;

const at = (slot: number, players: number, over: Partial<Booking> = {}): Booking =>
  ({ id: `b${slot}-${players}`, course: 'c', timeMin: 480, slot, players, ...over }) as Booking;

describe('slotsFree', () => {
  it('counts every cell on an empty row', () => {
    expect(slotsFree([], course(4), 480)).toBe(4);
  });

  it('counts the cells a booking leaves', () => {
    expect(slotsFree([at(0, 2)], course(4), 480)).toBe(2);
  });

  it('ignores other courses and other times', () => {
    const other = [at(0, 4, { course: 'x' }), at(0, 4, { timeMin: 488 })];
    expect(slotsFree(other, course(4), 480)).toBe(4);
  });

  it('does not double-count two bookings claiming the same slot', () => {
    // slot 3 is claimed twice: 2 + 1 = 3 players, but only slots 2-3 are taken.
    expect(slotsFree([at(2, 2), at(3, 1)], course(4), 480)).toBe(2);
  });

  it('does not let a booking that overruns the row eat cells outside it', () => {
    // A foursome at slot 2 of 4 occupies 2-3; slots 0-1 stay bookable.
    expect(slotsFree([at(2, 4)], course(4), 480)).toBe(2);
  });

  it('never goes negative', () => {
    expect(slotsFree([at(0, 9), at(1, 9)], course(4), 480)).toBe(0);
  });
});

describe('largestFit', () => {
  it('is the whole row when nothing is booked', () => {
    expect(largestFit([], course(4), 480)).toBe(4);
  });

  it('is smaller than the free count when the gap is split', () => {
    // Slots 0 and 3 open, 1-2 taken: two free cells, and no room for a pair.
    expect(slotsFree([at(1, 2)], course(4), 480)).toBe(2);
    expect(largestFit([at(1, 2)], course(4), 480)).toBe(1);
  });

  it('picks the wider of two openings', () => {
    // Slot 1 taken: a run of 1 on the left, a run of 2 on the right.
    expect(largestFit([at(1, 1)], course(4), 480)).toBe(2);
  });

  it('is zero on a full row', () => {
    expect(largestFit([at(0, 4)], course(4), 480)).toBe(0);
  });
});
