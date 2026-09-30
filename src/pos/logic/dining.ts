import { DEMO_NOW_MIN, DEMO_TODAY } from '../data/bookings';
import { formatTimeLabel, parseTimeLabel, toDateStr } from '../data/courses';
import { allTables, type FloorElement, type Room } from '../data/floor';
import { normalizePhone } from '../data/golfers';
import type { Golfer } from '../types';
import {
  openTabOn,
  upcomingReservationFor,
  type DiningReservation,
  type Tab,
  type TableStatus,
} from './restaurant';

/**
 * The host's rules (V1 → V2, Wave 2): which table a reservation may have, what a day of
 * reservations adds up to, and what the live floor needs to say about a table. Pure, so the
 * Tables floor, the Reservations list and their dialogs cannot disagree about any of it.
 *
 * `logic/restaurant.ts` owns the chain itself — status, holds, "tables free right now". This
 * module adds the one thing v1 never had to think about because it never joined a reservation to
 * a table at all: **time**. v1's reservation was a name, a party size and a phone number; its own
 * note says seating was "entirely a matter of the host remembering". Once a reservation carries a
 * table, two reservations can be given the same table at 7:00 and 7:30, and something has to say
 * no. That something is `mealsOverlap`.
 */

/** Everything the rules read. The same shape `tableStatus` takes. */
export interface FloorCtx {
  tabs: Tab[];
  reservations: DiningReservation[];
  date: string;
  nowMin: number;
}

/**
 * The floor is live: it reads the demo's own clock — noon on the demo day — never the date the
 * tee sheet happens to be showing. Tables is "right now"; Reservations is "any day".
 */
export const liveCtx = (s: { tabs: Tab[]; diningReservations: DiningReservation[] }): FloorCtx => ({
  tabs: s.tabs,
  reservations: s.diningReservations,
  date: toDateStr(DEMO_TODAY()),
  nowMin: DEMO_NOW_MIN,
});

// ─── Meals ──────────────────────────────────────────────────────────────────

/**
 * How long a sit-down meal holds its table. An assumption, and the first number to correct
 * against a real dining room: a club lunch after a round runs shorter, a member dinner longer.
 *
 * Deliberately the same as `HOLD_BEFORE_MIN`, and a test holds them together. The floor holds a
 * table 90 minutes ahead of its reservation, which is exactly the rule "a party sat now must be
 * gone before the next one arrives" — so `tablesFor` (free right now) and this module (free for
 * the whole meal) give the same answer for a party seated this minute.
 */
export const MEAL_MIN = 90;

/**
 * Whether two meals at one table overlap. Half-open intervals: a 5:30 and a 7:00 on the same
 * table do **not** clash — the first party is up as the second walks in, which is how a room is
 * turned. Anything closer does.
 */
export const mealsOverlap = (aStartMin: number, bStartMin: number, aLen = MEAL_MIN, bLen = MEAL_MIN): boolean =>
  aStartMin < bStartMin + bLen && bStartMin < aStartMin + aLen;

/** Minutes a tab has been at its table, on the day given. Null for a tab opened another day. */
export function minutesSeated(tab: Pick<Tab, 'openedDate' | 'openedAt'>, date: string, nowMin: number): number | null {
  if (tab.openedDate !== date) return null;
  const start = parseTimeLabel(tab.openedAt);
  return start == null ? null : Math.max(0, nowMin - start);
}

/** "25 min", "1 hr 10". Short, because it is printed on a table. */
export function formatSeated(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m}` : `${h} hr`;
}

// ─── Which table a reservation may have ─────────────────────────────────────

/** Why a table cannot take a party — each one something the host can act on. */
export type TableBlocker =
  | { kind: 'too-small'; seats: number }
  | { kind: 'out-of-service' }
  /** Someone is sitting there, and will still be when this party arrives. */
  | { kind: 'occupied'; tab: Tab }
  /** Another reservation has it for an overlapping meal. */
  | { kind: 'booked'; reservation: DiningReservation };

type ReservationSlot = Pick<DiningReservation, 'id' | 'date' | 'timeMin' | 'partySize'>;

/**
 * Why `table` cannot be given to reservation `r`, or null if it can.
 *
 * Only **booked** reservations clash with each other. A seated one is represented by its tab —
 * the tab is where the party actually is (a tab can be moved; the reservation's `tableId` is
 * where they were meant to sit). An open tab occupies its table from when it opened for a whole
 * meal, and for as long as it stays open after that: a table that has run long is still taken.
 */
export function tableBlocker(table: FloorElement, r: ReservationSlot, ctx: FloorCtx): TableBlocker | null {
  if ((table.seats ?? 0) < r.partySize) return { kind: 'too-small', seats: table.seats ?? 0 };
  if (table.outOfService) return { kind: 'out-of-service' };
  const clash = ctx.reservations
    .filter(
      (o) =>
        o.id !== r.id && o.tableId === table.id && o.date === r.date && o.status === 'booked' && mealsOverlap(o.timeMin, r.timeMin),
    )
    .sort((a, b) => a.timeMin - b.timeMin)[0];
  if (clash) return { kind: 'booked', reservation: clash };
  if (r.date === ctx.date) {
    const tab = openTabOn(table.id, ctx.tabs);
    if (tab && tab.reservationId !== r.id) {
      const start = parseTimeLabel(tab.openedAt) ?? ctx.nowMin;
      const until = Math.max(start + MEAL_MIN, ctx.nowMin);
      if (r.timeMin < until && start < r.timeMin + MEAL_MIN) return { kind: 'occupied', tab };
    }
  }
  return null;
}

export interface TableOption {
  room: Room;
  table: FloorElement;
  blocker: TableBlocker | null;
}

/**
 * Every table that could seat the party, each with the reason it can't if it can't — smallest
 * first, so a two-top is offered before the eight-top. Tables too small are left out entirely:
 * listing every two-top as "seats 2" to a party of six is noise, not information.
 *
 * This is `tablesFor` extended across time. `tablesFor` answers "free right now", which is the
 * question when seating; assigning a table to a 7:00 reservation at noon asks "free from 7:00
 * to 8:30", which a table seated right now very often is.
 */
export function tableOptionsFor(r: ReservationSlot, rooms: Room[], ctx: FloorCtx): TableOption[] {
  return allTables(rooms)
    .map(({ room, table }) => ({ room, table, blocker: tableBlocker(table, r, ctx) }))
    .filter((o) => o.blocker?.kind !== 'too-small')
    .sort((a, b) => (a.table.seats ?? 0) - (b.table.seats ?? 0));
}

/** The tables a reservation may be given. */
export const tablesForReservation = (r: ReservationSlot, rooms: Room[], ctx: FloorCtx): TableOption[] =>
  tableOptionsFor(r, rooms, ctx).filter((o) => !o.blocker);

/**
 * "Occupied · Kim" — the tab's name less the table it is on, which the tile already says. A tab
 * named only for its table ("P2") is just "Occupied".
 */
export function occupiedNote(tab: Pick<Tab, 'name'>): string {
  const rest = tab.name.replace(/^(Table \d+|[A-Z]\d+)(\s·\s)?/, '').trim();
  return rest ? `Occupied · ${rest}` : 'Occupied';
}

/** What a blocker says, in the host's words. */
export function blockerText(b: TableBlocker): string {
  switch (b.kind) {
    case 'too-small':
      return `Seats ${b.seats}`;
    case 'out-of-service':
      return 'Out of service';
    case 'occupied':
      return occupiedNote(b.tab);
    case 'booked':
      return `${b.reservation.name.split(',')[0]} · ${formatTimeLabel(b.reservation.timeMin)}`;
  }
}

// ─── Choosing a table right now ─────────────────────────────────────────────

/**
 * A table for a party sitting down now — a walk-in, or a tab being moved.
 *
 * Unlike assigning ahead, the host is standing at the table and may know better than the rules:
 * a party of five at a four-top with a chair pulled up, a walk-in put on a table held for a 12:30
 * that will be given another. So only the hard facts **block** (someone is there, it is out of
 * service); the soft ones **warn**, and the dialog says what the host is taking on.
 */
export interface TableChoice {
  room: Room;
  table: FloorElement;
  blocker: { kind: 'occupied'; tab: Tab } | { kind: 'out-of-service' } | null;
  held?: DiningReservation;
  tooSmall?: boolean;
}

/** How many chairs a host will pull up to a table before it is simply the wrong table. */
export const EXTRA_CHAIRS = 2;

/**
 * Every table a party of `guests` could sit at now, as choices. A table more than `EXTRA_CHAIRS`
 * short is left out — offering a party of four eight bar stools, each warning "seats 1", is noise.
 * The table the tab is already on (`exceptTabId`'s) is always kept, so a move can show "here now".
 */
export function tableChoicesNow(guests: number, rooms: Room[], ctx: FloorCtx, exceptTabId?: string): TableChoice[] {
  return allTables(rooms)
    .map(({ room, table }) => {
      const tab = openTabOn(table.id, ctx.tabs);
      const blocker = table.outOfService
        ? ({ kind: 'out-of-service' } as const)
        : tab && tab.id !== exceptTabId
          ? ({ kind: 'occupied', tab } as const)
          : null;
      const own = Boolean(exceptTabId) && tab?.id === exceptTabId;
      return { room, table, blocker, held: upcomingReservationFor(table.id, ctx), tooSmall: (table.seats ?? 0) < guests, own };
    })
    .filter((c) => c.own || (c.table.seats ?? 0) + EXTRA_CHAIRS >= guests)
    .map(({ own: _own, ...c }) => c);
}

/** What a choice says under its table: why it is blocked, or what the host would be taking on. */
export function choiceNote(c: TableChoice): string | undefined {
  if (c.blocker) return c.blocker.kind === 'occupied' ? occupiedNote(c.blocker.tab) : 'Out of service';
  if (c.held) return `Held · ${c.held.name.split(',')[0]} ${formatTimeLabel(c.held.timeMin)}`;
  if (c.tooSmall) return `Seats ${c.table.seats ?? 0}`;
  return undefined;
}

/** A choice as the table picker draws it. */
export const choiceItem = (c: TableChoice) => ({
  room: c.room,
  table: c.table,
  disabled: Boolean(c.blocker),
  warn: !c.blocker && (Boolean(c.held) || Boolean(c.tooSmall)),
  note: choiceNote(c),
});

// ─── A day of reservations ──────────────────────────────────────────────────

/** Lunch runs to 4:00; anything from then is dinner. A club's services, not a clock's halves. */
export const DINNER_FROM_MIN = 16 * 60;

export type Service = 'lunch' | 'dinner';

export const serviceOf = (timeMin: number): Service => (timeMin < DINNER_FROM_MIN ? 'lunch' : 'dinner');

export const SERVICE_LABEL: Record<Service, string> = { lunch: 'Lunch', dinner: 'Dinner' };

/** A day's reservations by service, each in time order. Empty services are dropped. */
export function byService(reservations: DiningReservation[], date: string): { service: Service; reservations: DiningReservation[] }[] {
  const day = reservations
    .filter((r) => r.date === date)
    .sort((a, b) => a.timeMin - b.timeMin || a.name.localeCompare(b.name));
  return (['lunch', 'dinner'] as const)
    .map((service) => ({ service, reservations: day.filter((r) => serviceOf(r.timeMin) === service) }))
    .filter((g) => g.reservations.length > 0);
}

export interface DaySummary {
  /** Covers expected — every reservation but the cancelled. */
  covers: number;
  /** Covers that sat down, including those who have since paid. */
  seated: number;
  /** Covers still booked. */
  toCome: number;
  /** Reservations, not covers — a host counts no-shows by party. */
  noShows: number;
  /** Booked reservations with no table yet — the host's to-do list. */
  unassigned: number;
}

export function daySummary(reservations: DiningReservation[], date: string): DaySummary {
  const day = reservations.filter((r) => r.date === date);
  const covers = (rs: DiningReservation[]) => rs.reduce((n, r) => n + r.partySize, 0);
  return {
    covers: covers(day.filter((r) => r.status !== 'cancelled')),
    seated: covers(day.filter((r) => r.status === 'seated' || r.status === 'completed')),
    toCome: covers(day.filter((r) => r.status === 'booked')),
    noShows: day.filter((r) => r.status === 'no_show').length,
    unassigned: day.filter((r) => r.status === 'booked' && !r.tableId).length,
  };
}

/** Seating opens a tab today, so only today's booked reservations can be seated. */
export const canSeat = (r: Pick<DiningReservation, 'status' | 'date'>, today: string): boolean =>
  r.status === 'booked' && r.date === today;

/**
 * A no-show is a fact about the past: a party can't have failed to arrive for a time that hasn't
 * come. Offering it on a 7:00 at noon invites the mis-tap that frees an evening's table.
 */
export const canMarkNoShow = (r: Pick<DiningReservation, 'status' | 'date' | 'timeMin'>, today: string, nowMin: number): boolean =>
  r.status === 'booked' && (r.date < today || (r.date === today && r.timeMin <= nowMin));

/** The times a reservation can be made for: 11:00 AM to the 9:00 PM last seating, every 15 minutes. */
export const FIRST_SEATING_MIN = 11 * 60;
export const LAST_SEATING_MIN = 21 * 60;
export const SLOT_MIN = 15;
export const RESERVATION_SLOTS: number[] = Array.from(
  { length: (LAST_SEATING_MIN - FIRST_SEATING_MIN) / SLOT_MIN + 1 },
  (_, i) => FIRST_SEATING_MIN + i * SLOT_MIN,
);

/** A new reservation's time: the next slot from now on the live day, else 6:00 PM. */
export function defaultReservationTime(date: string, today: string, nowMin: number): number {
  if (date !== today) return 18 * 60;
  const next = Math.ceil((nowMin + 1) / SLOT_MIN) * SLOT_MIN;
  return Math.min(LAST_SEATING_MIN, Math.max(FIRST_SEATING_MIN, next));
}

// ─── The floor ──────────────────────────────────────────────────────────────

/** How many tables in a set are in each status — the legend's numbers. */
export function statusCounts(tables: FloorElement[], statusOf: (t: FloorElement) => TableStatus): Record<TableStatus, number> {
  const out: Record<TableStatus, number> = { free: 0, reserved: 0, seated: 0, check: 0, blocked: 0 };
  for (const t of tables) out[statusOf(t)] += 1;
  return out;
}

/** "JE" for Jordan Ellis — what fits on a table. */
export const initials = (name: string | undefined): string =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');

/**
 * Booked reservations today that could sit at `table` now, soonest first: the party fits, and
 * they are due within `aheadMin` (three hours) — an early arrival, not tonight's dinner.
 */
export function reservationsToSeatAt(table: FloorElement, ctx: FloorCtx, aheadMin = 180): DiningReservation[] {
  return ctx.reservations
    .filter(
      (r) =>
        r.date === ctx.date &&
        r.status === 'booked' &&
        r.partySize <= (table.seats ?? 0) &&
        r.timeMin - ctx.nowMin <= aheadMin,
    )
    .sort((a, b) => Math.abs(a.timeMin - ctx.nowMin) - Math.abs(b.timeMin - ctx.nowMin));
}

/** "in 30 min", "15 min late", "now". Relative, because a host thinks in "how long". */
export function relativeTo(timeMin: number, nowMin: number): string {
  const d = timeMin - nowMin;
  if (d === 0) return 'now';
  if (d > 0) return `in ${formatSeated(d)}`;
  return `${formatSeated(-d)} late`;
}

// ─── The roster ─────────────────────────────────────────────────────────────

/**
 * The roster, searched by name words or phone digits, for the reservation dialog's inline
 * customer lookup. Not `GolferSearch`: that component and its targets are shared, and a dining
 * reservation is not one of them. Six results, because a dialog has room for six.
 */
export function searchGolfers(roster: Golfer[], query: string): Golfer[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const digits = normalizePhone(q);
  const words = q.split(/[\s,]+/).filter(Boolean);
  return roster
    .filter((g) =>
      digits.length >= 3 && digits.length === q.replace(/[\s()+-]/g, '').length
        ? normalizePhone(g.phone).includes(digits)
        : words.every((w) => g.name.toLowerCase().includes(w)),
    )
    .slice(0, 6);
}
