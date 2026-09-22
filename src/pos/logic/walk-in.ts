import { demoNow, minutesOfDay } from '../data/bookings';
import { TIMES, toDateStr } from '../data/courses';
import { ROUND_STEP } from '../data/config';
import type { Booking, Course, Golfer, TimeRowPrice } from '../types';
import { largestFit, runsAt } from './bookings';
import { rateCardFee } from './rates';

/**
 * Walk-ins as reservations (Weston Edits).
 *
 * In the base edition a walk-in is rung up at the register first and given a tee time
 * after. Weston's rule is golf first, order second — so a walk-in is a reservation too: it
 * lands on the tee sheet at the **next open tee time**, opens in the reservation panel (or
 * the phone's reservation screen) where players, holes, fees and transport are set, and
 * reaches the order through the same Check in & pay as any booking.
 *
 * Pure, and deterministic: "now" is the demo's fixed clock (`demoNow()` — `DEMO_NOW_MIN` on `DEMO_TODAY`), and
 * ids and confirmation codes are a running walk-in number (`walkin-1`, `W-0001`) — never the
 * clock or `Math.random()` — so the same click lands the same walk-in in every screenshot.
 */

/** A catalog rate the walk-in was started from — the CHECK IN tile that was rung. */
export interface WalkInRate {
  name: string;
  price: number;
}

/** A place on the sheet: course, row and starting slot. */
export interface TeeTimeSlot {
  course: Course;
  timeMin: number;
  slot: number;
}

/** The hole count a rate name implies — `Guest Rate 18 Holes` → 18 — or null if none. */
export function rateHoles(name: string): 9 | 18 | null {
  if (/18/.test(name)) return 18;
  if (/\b9\b|9 Holes|9H/.test(name)) return 9;
  return null;
}

/**
 * Courses a walk-in can start on, in the sheet's order: visible and not locked. An 18-hole
 * round at a club with an 18-hole course starts on its front nine (the first such course).
 */
export function walkInCourses(courses: Course[], holes: 9 | 18): Course[] {
  const open = courses.filter((c) => c.visible && !c.locked);
  if (holes === 18) {
    const front = open.find((c) => c.holeCount === 18);
    if (front) return [front];
  }
  return open;
}

/** The walk-in's default length when no rate says: 18 where an 18-hole course exists. */
export const defaultWalkInHoles = (courses: Course[]): 9 | 18 =>
  courses.some((c) => c.visible && !c.locked && c.holeCount === 18) ? 18 : 9;

/**
 * Open tee times for a party on `date`, strictly after `afterMin`, earliest first (ties in
 * course order), with the slot the party would start on. Uses `largestFit` — a party can't
 * straddle another booking — and the first run it fits.
 */
export function openTeeTimes(
  bookings: Booking[],
  courses: Course[],
  opts: { date: string; afterMin: number; players: number; limit?: number; ignoreId?: string },
): TeeTimeSlot[] {
  const day = bookings.filter((b) => b.date === opts.date && b.id !== opts.ignoreId);
  const out: TeeTimeSlot[] = [];
  for (const t of TIMES) {
    if (t.totalMin <= opts.afterMin) continue;
    for (const course of courses) {
      if (largestFit(day, course, t.totalMin) < opts.players) continue;
      const run = [...runsAt(day, course, t.totalMin).values()].find((r) => r.size >= opts.players);
      out.push({ course, timeMin: t.totalMin, slot: run?.start ?? 0 });
      if (opts.limit && out.length >= opts.limit) return out;
    }
  }
  return out;
}

/** The next open tee time for a party, or null when the day is full. */
export const nextOpenTeeTime = (
  bookings: Booking[],
  courses: Course[],
  opts: { date: string; afterMin: number; players: number },
): TeeTimeSlot | null => openTeeTimes(bookings, courses, { ...opts, limit: 1 })[0] ?? null;

/** What a walk-in needs from state. */
export interface WalkInContext {
  bookings: Booking[];
  courses: Course[];
  timePrices?: Record<string, TimeRowPrice>;
}

/**
 * The walk-in booking to add: one player (staff add the rest on the reservation), status
 * `walkin`, a `W-` code, unpaid and not yet checked in — Check in & pay does both — at the
 * next open tee time today after the demo "now".
 *
 *  - **Holes** come from the rate if one was rung (`Guest Rate 18 Holes` → 18), else 18
 *    where the club has an 18-hole course, else 9.
 *  - **Price** is the rate's own price, else the rate card's for that hole count and the
 *    tee time's band (`rateCardFee`, honouring a row's price override).
 *  - **Who** is the golfer if one was picked (a member rate's verified member), else an
 *    unnamed "Walk-in" to be linked on the Customer tab.
 *
 * Returns null when nothing is open for the rest of the day.
 */
export function planWalkIn(
  ctx: WalkInContext,
  opts: { rate?: WalkInRate | null; golfer?: Golfer | null } = {},
): Booking | null {
  const holes = (opts.rate && rateHoles(opts.rate.name)) || defaultWalkInHoles(ctx.courses);
  const now = demoNow();
  const date = toDateStr(now);
  const at = nextOpenTeeTime(ctx.bookings, walkInCourses(ctx.courses, holes), {
    date,
    afterMin: minutesOfDay(now),
    players: 1,
  });
  if (!at) return null;

  // One past the highest walk-in so far — not the count, which repeats after a delete.
  const seq = 1 + ctx.bookings.reduce((m, b) => Math.max(m, Number(/^walkin-(\d+)$/.exec(b.id)?.[1] ?? 0)), 0);
  const g = opts.golfer;
  const price = opts.rate
    ? opts.rate.price
    : rateCardFee({ status: 'walkin', timeMin: at.timeMin, date }, holes, { timePrices: ctx.timePrices });

  return {
    id: `walkin-${seq}`,
    date,
    course: at.course.id,
    slot: at.slot,
    timeMin: at.timeMin,
    name: g?.name ?? 'Walk-in',
    players: 1,
    cart: 'walking',
    status: 'walkin',
    phone: g?.phone ?? '',
    conf: `W-${String(seq).padStart(4, '0')}`,
    pay: 'open',
    price,
    holes: holes === 18 ? '18H' : '9H',
    playerStates: [{ paid: false, step: ROUND_STEP.notArrived, noShow: false }],
    ...(g && {
      guests: [
        { name: g.name, phone: g.phone, email: g.email, memberType: g.memberType, hcp: g.hcp, crmId: g.id },
      ],
    }),
  };
}

/**
 * Move a walk-in to another open tee time — the panel's "not this one" picker. Keeps a
 * rate-card price in step with the new band; a price from a rung rate stays as rung.
 */
export function moveWalkIn(b: Booking, to: TeeTimeSlot, ctx: Pick<WalkInContext, 'timePrices'> = {}): Partial<Booking> {
  const holes = b.holes === '18H' ? 18 : 9;
  const rates = { timePrices: ctx.timePrices };
  const fromCard = b.price === rateCardFee(b, holes, rates);
  return {
    course: to.course.id,
    timeMin: to.timeMin,
    slot: to.slot,
    ...(fromCard && { price: rateCardFee({ ...b, timeMin: to.timeMin }, holes, rates) }),
  };
}

/** A walk-in nobody has started on yet — its tee time can still be changed freely. */
export const isFreshWalkIn = (b: Booking): boolean =>
  b.status === 'walkin' && b.playerStates.every((p) => !p.paid && p.step < ROUND_STEP.checkedIn);
