import type { Shift } from '../data/staff-seed';
import type { DrawerEvent } from '../state/register-extras';
import type { PaymentRecord } from './restaurant';

/**
 * What the drawer should hold (V1 → V2, Wave 3). Pure, and derived — never stored while the shift is
 * open — so the variance at close cannot disagree with the payments it came from.
 *
 * v1's Shift asked the operator to key an ending cash and check total, and printed a history table
 * so wide its last column was cut off mid-word ("End Checl"): the check total you were reconciling
 * against was the one you could not read. Here the expected figure is shown, with its workings.
 */

/** `h:mm AM` → minutes past midnight. */
export function clockMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

export interface DrawerWorkings {
  startCash: number;
  /** Cash sales, tips included — a cash tip goes in the drawer too. */
  cashIn: number;
  /** Cash refunds handed back. */
  cashRefunds: number;
  payouts: number;
  drops: number;
  expected: number;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Everything that moved cash on this shift's date, from the moment it opened. */
export function drawerWorkings(shift: Shift, payments: PaymentRecord[], drawerEvents: DrawerEvent[]): DrawerWorkings {
  const from = clockMin(shift.openedAt);
  const until = shift.closedAt ? clockMin(shift.closedAt) : 24 * 60;
  const within = (date: string, time: string) => date === shift.date && clockMin(time) >= from && clockMin(time) <= until;

  const cash = payments.filter((p) => p.method === 'cash' && within(p.date, p.time));
  const cashIn = cents(cash.filter((p) => p.kind !== 'refund').reduce((s, p) => s + p.amount + p.tip, 0));
  const cashRefunds = cents(-cash.filter((p) => p.kind === 'refund').reduce((s, p) => s + p.amount, 0));
  const ev = drawerEvents.filter((e) => within(e.date, e.time));
  const payouts = cents(ev.filter((e) => e.kind === 'payout').reduce((s, e) => s + e.amount, 0));
  const drops = cents(ev.filter((e) => e.kind === 'drop').reduce((s, e) => s + e.amount, 0));
  return {
    startCash: shift.startCash,
    cashIn,
    cashRefunds,
    payouts,
    drops,
    expected: cents(shift.startCash + cashIn - cashRefunds - payouts - drops),
  };
}

/** Counted minus expected: positive is over, negative is short. */
export const variance = (counted: number, expected: number): number => cents(counted - expected);

/** Hours between two clock times on one day, to a quarter-hour. */
export function hoursBetween(inAt: string, outAt: string): number {
  const mins = Math.max(0, clockMin(outAt) - clockMin(inAt));
  return Math.round((mins / 60) * 4) / 4;
}
