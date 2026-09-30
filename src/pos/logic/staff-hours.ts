import type { Punch } from '../data/staff-seed';
import { clockMin, hoursBetween } from './shift';

/**
 * Hours worked, from the punch log (V1 → V2, Wave 3). Pure, so Time Clock's day and week totals
 * are the same arithmetic a unit test checks.
 *
 * v1's Time Clock logged punches as bare strings — `07/29/2026 8:51 AM · Clock In` — with no hours
 * anywhere: whoever did payroll added them up by hand from the list. Here each punch pairs an in with
 * its out, so a day and a week are sums, and a punch still open counts up to the demo's "now".
 */

/**
 * Hours on one punch, to a quarter-hour. An open punch counts to `now` (`h:mm AM`) — but only on
 * its own day: one left open from yesterday is a forgotten clock-out, and counting it to today's
 * noon would invent hours. That shows as `0` and the screen flags it.
 */
export function punchHours(p: Punch, now: string, today: string): number {
  if (p.out) return hoursBetween(p.in, p.out);
  return p.date === today ? hoursBetween(p.in, now) : 0;
}

/** `7.75 h`, `8 h`, `0 h`. */
export const fmtHours = (h: number): string => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, '')} h`;

export interface PunchDay {
  date: string;
  /** Earliest in first — the day read top to bottom. */
  punches: Punch[];
  hours: number;
}

/** The log by day, newest day first. */
export function punchDays(punches: Punch[], now: string, today: string): PunchDay[] {
  const byDate = new Map<string, Punch[]>();
  for (const p of punches) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, ps]) => {
      const sorted = ps.slice().sort((a, b) => clockMin(a.in) - clockMin(b.in));
      return { date, punches: sorted, hours: sorted.reduce((s, p) => s + punchHours(p, now, today), 0) };
    });
}

const parse = (date: string): Date => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The Monday that starts `date`'s pay week — the week most US payrolls run, Monday to Sunday. */
export function weekStart(date: string): string {
  const d = parse(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fmt(d);
}

export interface WeekTotal {
  weekStart: string;
  weekEnd: string;
  /** Most hours first; everyone who punched at all that week. */
  rows: { staffId: string; days: number; hours: number }[];
  hours: number;
}

/** Hours per person per pay week, newest week first. */
export function weeklyTotals(punches: Punch[], now: string, today: string): WeekTotal[] {
  const weeks = new Map<string, Map<string, { days: Set<string>; hours: number }>>();
  for (const p of punches) {
    const wk = weekStart(p.date);
    const people = weeks.get(wk) ?? new Map();
    const row = people.get(p.staffId) ?? { days: new Set<string>(), hours: 0 };
    row.days.add(p.date);
    row.hours += punchHours(p, now, today);
    people.set(p.staffId, row);
    weeks.set(wk, people);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([wk, people]) => {
      const end = parse(wk);
      end.setDate(end.getDate() + 6);
      const rows = [...people.entries()]
        .map(([staffId, r]) => ({ staffId, days: r.days.size, hours: r.hours }))
        .sort((a, b) => b.hours - a.hours || a.staffId.localeCompare(b.staffId));
      return { weekStart: wk, weekEnd: fmt(end), rows, hours: rows.reduce((s, r) => s + r.hours, 0) };
    });
}

/** `Thu, May 21` for a `YYYY-MM-DD`. */
export const shortDate = (date: string): string =>
  parse(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
