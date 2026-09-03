import type { Booking } from '../types';

/**
 * Open slots on one course at one time, grouped into contiguous runs.
 *
 * A run is what turns the open cells into a party-size picker: clicking the Nth open cell
 * books N players, always starting at the run's first slot so the booking occupies adjacent
 * cells rather than starting wherever the pointer landed. The rightmost cell is therefore the
 * whole remaining opening.
 *
 * Runs matter rather than a plain count of free slots because a booking cannot straddle an
 * occupied one — with slots 1 and 3 open and slot 2 taken, each is a run of one, and neither
 * can seat a pair. A picker built on the row's total free count would happily offer two and
 * then overlap.
 *
 * Extracted from the grid so the rule can be tested without rendering: the failure it guards
 * against is a booking silently overlapping its neighbour, which looks fine until two parties
 * arrive for the same slot.
 */

export interface SlotRun {
  /** First open slot of the run — where a booking placed from it begins. */
  start: number;
  /** How many open slots the run holds; the largest party it can seat. */
  size: number;
  /** 1-based position of this slot within its run — the party size clicking it implies. */
  nth: number;
}

/**
 * Map each open slot index to its run.
 *
 * `bookings` should already be filtered to one course and one time.
 */
export function openRuns(bookings: Booking[], slots: number): Map<number, SlotRun> {
  // Slots covered by a booking that starts earlier and spans into them.
  const covered = new Set<number>();
  for (const b of bookings) {
    for (let s = b.slot + 1; s < b.slot + b.players && s < slots; s++) covered.add(s);
  }
  const startsHere = new Set(bookings.map((b) => b.slot));
  const isOpen = (s: number) => !covered.has(s) && !startsHere.has(s);

  const runs = new Map<number, SlotRun>();
  for (let s = 0; s < slots; ) {
    if (!isOpen(s)) {
      s++;
      continue;
    }
    let size = 0;
    while (s + size < slots && isOpen(s + size)) size++;
    for (let k = 0; k < size; k++) runs.set(s + k, { start: s, size, nth: k + 1 });
    s += size;
  }
  return runs;
}

/** Total open slots, across every run. */
export const openSlotCount = (bookings: Booking[], slots: number): number =>
  openRuns(bookings, slots).size;

/** The largest party the row can seat on this course — the longest run, not the total. */
export function largestOpening(bookings: Booking[], slots: number): number {
  let max = 0;
  for (const run of openRuns(bookings, slots).values()) max = Math.max(max, run.size);
  return max;
}
