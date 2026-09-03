import { describe, expect, it } from 'vitest';
import { largestOpening, openRuns, openSlotCount } from './openings';
import type { Booking } from '../types';

/**
 * The party-size picker's rule: the Nth open cell in a run seats N, starting at the run's
 * first slot. The failure this guards against is a booking overlapping its neighbour —
 * which renders fine and only surfaces when two parties turn up for the same slot.
 */

/** A booking occupying `players` slots from `slot`. Only those two fields matter here. */
const at = (slot: number, players: number): Booking =>
  ({ slot, players } as Booking);

/** Compact view of a run map: slot → "start:size:nth". */
const shape = (bookings: Booking[], slots = 4) =>
  Object.fromEntries(
    [...openRuns(bookings, slots)].map(([s, r]) => [s, `${r.start}:${r.size}:${r.nth}`]),
  );

describe('an empty row', () => {
  it('is one run spanning every slot', () => {
    expect(shape([])).toEqual({
      0: '0:4:1',
      1: '0:4:2',
      2: '0:4:3',
      3: '0:4:4',
    });
  });

  it('maps left-to-right onto party sizes 1 through 4', () => {
    const runs = openRuns([], 4);
    expect([1, 2, 3, 4].map((n) => runs.get(n - 1)!.nth)).toEqual([1, 2, 3, 4]);
  });

  it('starts every party at slot 0, so the booking stays contiguous', () => {
    for (const r of openRuns([], 4).values()) expect(r.start).toBe(0);
  });
});

describe('partly booked rows', () => {
  it('offers only the slots after a leading booking', () => {
    // A pair at slots 0–1 leaves a run of two starting at 2.
    expect(shape([at(0, 2)])).toEqual({ 2: '2:2:1', 3: '2:2:2' });
  });

  it('offers only the slots before a trailing booking', () => {
    expect(shape([at(2, 2)])).toEqual({ 0: '0:2:1', 1: '0:2:2' });
  });

  it('splits into two runs around a booking in the middle', () => {
    // Slots 1–2 taken: slot 0 and slot 3 are separate runs of one. Neither can seat a
    // pair, even though the row has two free slots in total.
    expect(shape([at(1, 2)])).toEqual({ 0: '0:1:1', 3: '3:1:1' });
    expect(openSlotCount([at(1, 2)], 4)).toBe(2);
    expect(largestOpening([at(1, 2)], 4)).toBe(1);
  });

  it('never lets a run straddle an occupied slot', () => {
    for (const bookings of [[at(1, 1)], [at(2, 1)], [at(1, 1), at(3, 1)], [at(0, 1), at(2, 1)]]) {
      for (const [slot, run] of openRuns(bookings, 4)) {
        // Every slot the run claims must itself be open.
        for (let s = run.start; s < run.start + run.size; s++) {
          expect(openRuns(bookings, 4).has(s), `run over occupied slot ${s}`).toBe(true);
        }
        expect(slot).toBeGreaterThanOrEqual(run.start);
        expect(slot).toBeLessThan(run.start + run.size);
      }
    }
  });

  it('has no runs at all when the row is full', () => {
    expect(shape([at(0, 4)])).toEqual({});
    expect(shape([at(0, 2), at(2, 2)])).toEqual({});
    expect(largestOpening([at(0, 4)], 4)).toBe(0);
  });
});

describe('a booking that overruns the course width', () => {
  it('is clamped rather than claiming slots that do not exist', () => {
    // A four-player booking at slot 2 of a 4-slot course would reach slot 5.
    expect(shape([at(2, 4)])).toEqual({ 0: '0:2:1', 1: '0:2:2' });
  });
});

describe('other course widths', () => {
  it('works on a 2-slot course', () => {
    expect(shape([], 2)).toEqual({ 0: '0:2:1', 1: '0:2:2' });
  });

  it('works on a 5-slot course', () => {
    expect(largestOpening([], 5)).toBe(5);
    expect(openRuns([], 5).get(4)!.nth).toBe(5);
  });

  it('handles a single-slot course', () => {
    expect(shape([], 1)).toEqual({ 0: '0:1:1' });
    expect(shape([at(0, 1)], 1)).toEqual({});
  });
});

describe('the rightmost cell is the whole opening', () => {
  it.each([
    [[], 4, 4],
    [[at(0, 1)], 4, 3],
    [[at(0, 2)], 4, 2],
    [[at(0, 3)], 4, 1],
  ] as Array<[Booking[], number, number]>)(
    'a %#-booking row offers a maximum party of %s',
    (bookings, slots, expected) => {
      const runs = [...openRuns(bookings, slots).values()];
      const maxNth = Math.max(...runs.map((r) => r.nth));
      expect(maxNth).toBe(expected);
      // And that maximum equals the run's own size — the "remaining player count".
      expect(runs.find((r) => r.nth === maxNth)!.size).toBe(expected);
    },
  );
});
