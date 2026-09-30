import type { DrawerEvent } from '../state/register-extras';
import type { Shift } from '../data/staff-seed';
import { money } from './cart';
import { clockMin } from './shift';

/**
 * The drawer's display rules (V1 → V2, Wave 3), beside `shift.ts`'s arithmetic: how a variance
 * reads, when it is big enough to ask twice, and whether a cash drop makes sense.
 *
 * v1 asked for an ending cash and check total and showed neither what the drawer should hold nor
 * how far off the count was. Here the variance is live while the count is typed, and coloured.
 */

/** A close this far off — either way — asks for a second tap. A miscount, usually; a note, always. */
export const LARGE_VARIANCE = 20;

export type VarianceTone = 'exact' | 'over' | 'short';

export const varianceTone = (v: number): VarianceTone => (Math.abs(v) < 0.005 ? 'exact' : v > 0 ? 'over' : 'short');

/** `Exact`, `$5.00 over`, `$10.00 short`. */
export function varianceLabel(v: number): string {
  const tone = varianceTone(v);
  return tone === 'exact' ? 'Exact' : `${money(Math.abs(v))} ${tone}`;
}

export const isLargeVariance = (v: number): boolean => Math.abs(v) >= LARGE_VARIANCE;

/**
 * Why a cash drop cannot go ahead, or `null`. The drawer cannot send the safe more than it holds —
 * v1's drop took any number, so a slipped digit left the drawer "expected" to be negative.
 */
export function dropProblem(amount: number, expected: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter the amount going to the safe.';
  if (amount > expected + 0.005) return `The drawer should only hold ${money(expected)}.`;
  return null;
}

/** A cents keypad's digits as dollars: `'20000'` → 200. */
export const centsToDollars = (digits: string): number => (digits ? parseInt(digits, 10) / 100 : 0);

/** Dollars back to a keypad's digits: 200 → `'20000'`, 0 → `''`. */
export const dollarsToCents = (n: number): string => (n > 0 ? String(Math.round(n * 100)) : '');

/** The payouts and drops on this shift, oldest first — the list beside the workings. */
export function shiftEvents(shift: Shift, events: DrawerEvent[]): DrawerEvent[] {
  const from = clockMin(shift.openedAt);
  const until = shift.closedAt ? clockMin(shift.closedAt) : 24 * 60;
  return events
    .filter((e) => e.date === shift.date && clockMin(e.time) >= from && clockMin(e.time) <= until)
    .slice()
    .sort((a, b) => clockMin(a.time) - clockMin(b.time));
}
