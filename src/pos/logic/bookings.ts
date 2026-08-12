import { TIMES, formatTimeLabel } from '../data/courses';
import { findMemberByPhone } from '../data/golfers';
import type { ListFilters } from '../state/pos-store';
import type { Booking, Course } from '../types';

/**
 * Booking queries: filtering, sorting, grouping, and the capacity rules that the
 * league / block / move dialogs depend on.
 *
 * Ported from the prototype's `renderListView` filter chain and the planning
 * helpers `_gg18Plan`, `_btmTargetTimes`, and `applyMovePlayers`.
 */

// ─── List view filtering ────────────────────────────────────────────────────

/** Sort order used when grouping by payment status. */
const STATUS_ORDER: Record<string, number> = {
  paid: 0,
  open: 1,
  rain_chk: 2,
  no_show: 3,
  refund: 4,
};

/**
 * Apply the list-view filter set.
 *
 * Filters are ANDed; within a multi-select filter (courses, players, special) the
 * options are ORed. An empty multi-select means "no constraint" rather than
 * "match nothing", which is what makes the drawer's cleared state show everything.
 */
export function filterBookings(bookings: Booking[], f: ListFilters): Booking[] {
  let list = bookings;

  if (f.status !== 'all') list = list.filter((b) => b.pay === f.status);

  if (f.guest !== 'all') {
    list = list.filter((b) => {
      const checkedIn = (b.playerStates ?? []).some((p) => p.step >= 0 && !p.noShow);
      return f.guest === 'checkedin' ? checkedIn : !checkedIn;
    });
  }

  if (f.membership !== 'all') {
    list = list.filter((b) => {
      const member = findMemberByPhone(b.phone);
      if (f.membership === 'member') return Boolean(member);
      if (f.membership === 'guest') return !member;
      return member?.memberType === f.membership;
    });
  }

  if (f.courses.length) list = list.filter((b) => f.courses.includes(b.course));
  if (f.holes !== 'all') list = list.filter((b) => b.holes === f.holes);
  if (f.players.length) list = list.filter((b) => f.players.includes(String(b.players)));

  for (const s of f.special) {
    if (s === 'notes') list = list.filter((b) => Boolean(b.note));
    if (s === 'unpaid') list = list.filter((b) => (b.playerStates ?? []).some((p) => !p.paid));
    if (s === 'groups') list = list.filter((b) => b.status === 'group' || Boolean(b.groupId));
    if (s === 'blocks') list = list.filter((b) => b.pay === 'block' || b.pay === 'event');
  }

  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    list = list.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.conf.toLowerCase().includes(q) ||
        b.phone.includes(q),
    );
  }

  return sortBookings(list, f.sort);
}

export function sortBookings(list: Booking[], sort: ListFilters['sort']): Booking[] {
  const out = [...list];
  if (sort === 'status')
    out.sort((a, b) => (STATUS_ORDER[a.pay] ?? 9) - (STATUS_ORDER[b.pay] ?? 9) || a.timeMin - b.timeMin);
  else if (sort === 'course')
    out.sort((a, b) => a.course.localeCompare(b.course) || a.timeMin - b.timeMin);
  else out.sort((a, b) => a.timeMin - b.timeMin);
  return out;
}

/** Counts per payment state, for the filter chip badges. */
export function payCounts(bookings: Booking[]): Record<string, number> {
  const counts: Record<string, number> = { all: bookings.length };
  for (const b of bookings) counts[b.pay] = (counts[b.pay] ?? 0) + 1;
  return counts;
}

/** How many filters are set away from their defaults. */
export function activeFilterCount(f: ListFilters): number {
  let n = 0;
  if (f.status !== 'all') n++;
  if (f.guest !== 'all') n++;
  if (f.membership !== 'all') n++;
  if (f.holes !== 'all') n++;
  n += f.courses.length ? 1 : 0;
  n += f.players.length ? 1 : 0;
  n += f.special.length;
  return n;
}

/**
 * Group a sorted list into labelled sections.
 *
 * The grouping key follows the sort: by time it's the shift band, by status it's
 * the payment state, by course it's the course. That keeps the headers meaningful
 * instead of arbitrary.
 */
export function groupBookings(
  list: Booking[],
  sort: ListFilters['sort'],
  courses: Course[],
): Array<{ key: string; label: string; bookings: Booking[] }> {
  const groups = new Map<string, Booking[]>();

  const keyOf = (b: Booking): string => {
    if (sort === 'status') return b.pay;
    if (sort === 'course') return b.course;
    const h = Math.floor(b.timeMin / 60);
    return h < 10 ? 'early' : h < 14 ? 'peak' : 'twilight';
  };

  for (const b of list) {
    const k = keyOf(b);
    const arr = groups.get(k);
    if (arr) arr.push(b);
    else groups.set(k, [b]);
  }

  const labels: Record<string, string> = {
    early: 'Early Morning · 6:00 AM – 10:00 AM',
    peak: 'Peak Hours · 10:00 AM – 2:00 PM',
    twilight: 'Twilight · 2:00 PM – 6:00 PM',
    paid: 'Paid',
    open: 'Open balance',
    rain_chk: 'Rain check',
    no_show: 'No show',
    refund: 'Refunded',
    block: 'Blocked',
    event: 'Events',
  };

  return [...groups.entries()].map(([key, bookings]) => ({
    key,
    label: labels[key] ?? courses.find((c) => c.id === key)?.name ?? key,
    bookings,
  }));
}

// ─── Capacity & scheduling ──────────────────────────────────────────────────

/** Players already seated on a course at a time. */
export function slotsUsed(bookings: Booking[], courseId: string, timeMin: number): number {
  return bookings
    .filter((b) => b.course === courseId && b.timeMin === timeMin)
    .reduce((s, b) => s + b.players, 0);
}

/** Free slots on a course at a time. */
export function slotsFree(
  bookings: Booking[],
  course: Course,
  timeMin: number,
): number {
  return Math.max(0, course.slots - slotsUsed(bookings, course.id, timeMin));
}

/** Consecutive tee-sheet rows from `startMin` through `endMin`, inclusive. */
export function timeRange(startMin: number, endMin: number): number[] {
  return TIMES.filter((t) => t.totalMin >= startMin && t.totalMin <= endMin).map((t) => t.totalMin);
}

/** Round a target minute up to the next real tee-sheet row. */
export function snapToSlot(minTarget: number): number | null {
  return TIMES.find((t) => t.totalMin >= minTarget)?.totalMin ?? null;
}

/** `90` → `'1h 30m'`. */
export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Plan an 18-hole league across two nines.
 *
 * Groups go out in consecutive front-nine rows filling `capPerSlot` at a time.
 * Each group's back nine starts `durMins` after its front nine, snapped forward to
 * the next real row — that's the crossover, and it's why an 18-hole league eats
 * slots on two courses at staggered times rather than one block.
 *
 * Returns one entry per group. An empty array means the request can't be seated
 * (the range ran out of rows).
 */
export function plan18Hole(
  want: number,
  capPerSlot: number,
  durMins: number,
  startMin: number,
): Array<{ frontStart: number; backStart: number; span: number }> {
  const startIdx = TIMES.findIndex((t) => t.totalMin >= startMin);
  if (startIdx === -1 || capPerSlot <= 0) return [];

  const nSlots = Math.ceil(want / capPerSlot);
  const plan: Array<{ frontStart: number; backStart: number; span: number }> = [];
  let remaining = want;

  for (let i = 0; i < nSlots; i++) {
    const front = TIMES[startIdx + i];
    if (!front) return [];
    const back = snapToSlot(front.totalMin + durMins);
    if (back == null) return [];
    const span = Math.min(capPerSlot, remaining);
    plan.push({ frontStart: front.totalMin, backStart: back, span });
    remaining -= span;
  }
  return plan;
}

/** Bookings a proposed block or league would overwrite. */
export function conflictsIn(
  bookings: Booking[],
  dateStr: string,
  courseIds: string[],
  timeMins: number[],
): Booking[] {
  const times = new Set(timeMins);
  return bookings.filter(
    (b) => b.date === dateStr && courseIds.includes(b.course) && times.has(b.timeMin),
  );
}

/**
 * Where a moved group would land, and whether it displaces anyone.
 *
 * `placement` decides whether the movers take the slots before or after any
 * existing occupants. Returns null when the destination can't hold them.
 */
export function planMove(
  bookings: Booking[],
  moving: Booking[],
  course: Course,
  destDate: string,
  destTime: number,
  placement: 'before' | 'after',
): { startSlot: number; occupants: Booking[] } | null {
  const occupants = bookings.filter(
    (b) => b.date === destDate && b.course === course.id && b.timeMin === destTime && !moving.includes(b),
  );
  const movingSlots = moving.reduce((s, b) => s + (b.players || 1), 0);
  const occupiedSlots = occupants.reduce((s, b) => s + (b.players || 1), 0);

  if (movingSlots + occupiedSlots > course.slots) return null;
  return { startSlot: placement === 'before' ? 0 : occupiedSlots, occupants };
}

/** A one-line description of a booking for confirmations and toasts. */
export function describeBooking(b: Booking, courses: Course[]): string {
  const course = courses.find((c) => c.id === b.course)?.name ?? b.course;
  return `${b.name} · ${formatTimeLabel(b.timeMin)} · ${course} · ${b.players}P`;
}
