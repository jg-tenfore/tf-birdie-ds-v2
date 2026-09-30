import { DEMO_TODAY } from './bookings';
import { toDateStr } from './courses';

/**
 * The working day (V1 → V2, Wave 3): who is on the clock, the drawer, and the week behind it.
 *
 * Authored, like every fixture here, around the demo's noon. Everyone who worked the morning is still
 * clocked in; the drawer was opened at 6:45 with a $200 float; and the week
 * before has closed shifts with small, believable variances — one over, one short, most exact — so
 * the shift screen's history has something to reconcile against.
 */

const day = (offset: number) => {
  const d = DEMO_TODAY();
  d.setDate(d.getDate() + offset);
  return toDateStr(d);
};

export interface Punch {
  id: string;
  staffId: string;
  date: string;
  /** `h:mm AM`. */
  in: string;
  /** Absent while still on the clock. */
  out?: string;
}

/**
 * A drawer session — v1's Shift screen. The counts a person keys at close are stored; what the drawer
 * *should* hold is derived from the day's cash (see `logic/shift.ts`), never stored, so the variance
 * cannot disagree with the payments it came from.
 */
export interface Shift {
  id: string;
  staffId: string;
  date: string;
  openedAt: string;
  /** The float counted into the drawer at open. */
  startCash: number;
  closedAt?: string;
  countedCash?: number;
  countedChecks?: number;
  /** Fixed at close, so history shows what the drawer was expected to hold then. */
  expectedCash?: number;
  note?: string;
}

const today = day(0);

export const SEED_PUNCHES: Punch[] = [
  // Today: the morning is on the clock.
  { id: 'PU-101', staffId: 's-6', date: today, in: '6:00 AM' },
  { id: 'PU-102', staffId: 's-1', date: today, in: '6:30 AM' },
  { id: 'PU-103', staffId: 's-3', date: today, in: '6:45 AM' },
  { id: 'PU-104', staffId: 's-2', date: today, in: '10:00 AM' },
  { id: 'PU-105', staffId: 's-5', date: today, in: '10:30 AM' },
  { id: 'PU-106', staffId: 's-4', date: today, in: '10:45 AM' },
  // The week before, closed.
  ...[-1, -2, -3, -4, -5].flatMap((o, i) => [
    { id: `PU-0${i}1`, staffId: 's-1', date: day(o), in: '6:30 AM', out: '3:00 PM' },
    { id: `PU-0${i}2`, staffId: 's-3', date: day(o), in: '6:45 AM', out: '2:45 PM' },
    { id: `PU-0${i}3`, staffId: 's-2', date: day(o), in: '10:00 AM', out: i % 2 ? '6:30 PM' : '7:15 PM' },
    { id: `PU-0${i}4`, staffId: 's-4', date: day(o), in: '10:45 AM', out: '9:00 PM' },
    { id: `PU-0${i}5`, staffId: 's-6', date: day(o), in: '6:00 AM', out: '2:30 PM' },
  ]),
];

/** The drawer open right now. */
export const SEED_OPEN_SHIFT: Shift = {
  id: 'SH-206',
  staffId: 's-1',
  date: today,
  openedAt: '6:45 AM',
  startCash: 200,
};

/** Closed shifts, newest first. */
export const SEED_SHIFT_HISTORY: Shift[] = [
  { id: 'SH-205', staffId: 's-1', date: day(-1), openedAt: '6:45 AM', startCash: 200, closedAt: '3:05 PM', expectedCash: 612.4, countedCash: 612.4, countedChecks: 85 },
  { id: 'SH-204', staffId: 's-6', date: day(-2), openedAt: '6:00 AM', startCash: 200, closedAt: '2:35 PM', expectedCash: 488.15, countedCash: 478.15, countedChecks: 0, note: 'Short $10 — a refund given in cash and rung to card' },
  { id: 'SH-203', staffId: 's-1', date: day(-3), openedAt: '6:45 AM', startCash: 200, closedAt: '3:00 PM', expectedCash: 701.9, countedCash: 701.9, countedChecks: 120 },
  { id: 'SH-202', staffId: 's-1', date: day(-4), openedAt: '6:45 AM', startCash: 200, closedAt: '3:10 PM', expectedCash: 540.25, countedCash: 545.25, countedChecks: 0, note: 'Over $5' },
  { id: 'SH-201', staffId: 's-6', date: day(-5), openedAt: '6:00 AM', startCash: 200, closedAt: '2:30 PM', expectedCash: 455.0, countedCash: 455.0, countedChecks: 40 },
];
