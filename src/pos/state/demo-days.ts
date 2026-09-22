import { demoRange, isInDemoRange } from '../data/bookings';
import { toDateStr } from '../data/courses';
import { venueDayBookings } from '../data/venues';
import type { Booking } from '../types';
import type { PosState } from './pos-store';

/**
 * Demo days beyond the authored window (Weston Edits' date navigation, phone and tablet).
 *
 * The reducer stays the single source of truth: a generated day is added to
 * `state.bookings` with the `fillDemoDay` action the first time the tee sheet shows that
 * date, which also records the date in `state.generatedDates`. From then on it is just
 * bookings — edits, check-ins and deletions stick, revisiting the date finds them rather
 * than a fresh copy, and a day whose bookings were all deleted stays empty.
 */

type DemoDayState = Pick<PosState, 'bookings' | 'venueId' | 'generatedDates'>;

/**
 * What the generator would still give a date: its generated bookings, or `[]` once the
 * date has been filled (`generatedDates`), outside `demoRange()`, or on a window day.
 * Doesn't look at the bookings in state — the calendars use it as the fallback for a
 * date's count when state has none.
 */
export function unfilledDemoDay(state: Pick<PosState, 'venueId' | 'generatedDates'>, dateStr: string): Booking[] {
  if (!isInDemoRange(dateStr) || state.generatedDates.includes(dateStr)) return [];
  return venueDayBookings(state.venueId, dateStr);
}

/**
 * The generated bookings a date still needs, or `[]`.
 *
 * Empty when the date already has bookings (the window's 11 days), when it was filled
 * before (even if everything on it has since been deleted), when it's outside
 * `demoRange()`, or when the club has no courses the generator's fixtures map onto. Ids
 * already in state are skipped too, so dispatching the result can never duplicate a booking.
 */
export function missingDemoDay(state: DemoDayState, date: Date): Booking[] {
  const dateStr = toDateStr(date);
  if (state.bookings.some((b) => b.date === dateStr)) return [];
  const have = new Set(state.bookings.map((b) => b.id));
  return unfilledDemoDay(state, dateStr).filter((b) => !have.has(b.id));
}

/** A date pulled back inside `demoRange()` (today ± 12 months). */
export function clampToDemoRange(d: Date): Date {
  const { start, end } = demoRange();
  if (d < start) return start;
  if (d > end) return end;
  return d;
}
