import {
  LEAGUE_SEATS,
  leagueBooking,
  leagueBookingId,
  leagueById,
  leagueSeat,
  type League,
  type LeagueFormat,
} from '../data/leagues';
import { checkInPlayer } from '../logic/bookings';
import { buildTeeTimeCart, money, orderTotals } from '../logic/cart';
import { playerFee, playerName } from '../logic/reservation';
import { seatPrice } from '../logic/seat-pricing';
import type { Booking, BookingGuest, PlayerState } from '../types';
import { taxRateOf } from './operations';
import type { Action, PosState } from './pos-store';
import { rateContext } from './rate-context';

/**
 * The League view's slice of the store (V1 → V2, 100226).
 *
 * Weston: *"the idea is just to have a place where you can manage the whole group… speed and
 * checking in of golfers who are arriving at the same time."* The view reads and writes the real
 * tee sheet — a league's tee times are bookings (`data/leagues.ts`) — so this slice holds only what
 * is not already on a booking: which league is open and on which tab, each league's format (a
 * League view label, never a move), and the way back from the register.
 *
 * Every rule is a pure function of the bookings, so the screen, the tests and the reducer agree:
 *
 *  - **Place** a golfer on group `k` fills a seat on that tee time's booking (creating the booking
 *    when nobody was on it yet); **take off** frees the seat (and the tee time, if it was the last).
 *    A move carries the seat as it is — checked in, paid — to the new tee time.
 *  - **Check in** writes the seat's round step (`checkInPlayer`).
 *  - **Pay** puts that one seat on the register's order (`addSeatToOrder`), checks them in and opens
 *    the register's own checkout over the League view; paying marks the seat paid through the
 *    normal `recordPayment`, and closing checkout — paid or cancelled — leaves you where you were.
 *  - **Extra** takes you to the register with that seat on the order and a **Back to the league**
 *    on the rail, so a bucket of balls lands on the golfer's real order.
 */

export type LeagueTab = 'checkin' | 'assign';

export interface LeagueState {
  /** The league the League view is showing (the tee-sheet group's id). */
  leagueGroupId: string | null;
  leagueTab: LeagueTab;
  /** A league's format when the switch changed it; absent is the league's own. */
  leagueFormats: Record<string, LeagueFormat>;
  /** Set on the way to the register for an Extra: the league to offer a way back to. */
  returnToLeague: string | null;
}

export const leagueDefaults = (): LeagueState => ({
  leagueGroupId: null,
  leagueTab: 'checkin',
  leagueFormats: {},
  returnToLeague: null,
});

// ─── Reading the sheet ──────────────────────────────────────────────────────

/** How the league goes out today. */
export const leagueFormatOf = (s: Pick<LeagueState, 'leagueFormats'>, l: League): LeagueFormat =>
  s.leagueFormats[l.groupId] ?? l.format;

/** Group `k`'s booking, when anyone is on it. */
export const groupBooking = (bookings: readonly Booking[], l: League, k: number): Booking | undefined =>
  bookings.find((b) => b.id === leagueBookingId(l, k));

/** Where a golfer sits: the booking, the seat on it, and which of the league's groups that is. */
export interface LeagueSeatRef {
  booking: Booking;
  seat: number;
  group: number;
}

export function seatOf(bookings: readonly Booking[], l: League, golferId: string): LeagueSeatRef | null {
  for (let k = 0; k < l.teeTimes.length; k++) {
    const b = groupBooking(bookings, l, k);
    const seat = b?.guests?.findIndex((g, i) => i < b.players && g?.leagueGolferId === golferId) ?? -1;
    if (b && seat >= 0) return { booking: b, seat, group: k };
  }
  return null;
}

/** A booking's seats as placement handles them — the state and the guest, together. */
function seatsOf(b: Booking): Array<{ state: PlayerState; guest: BookingGuest }> {
  return Array.from({ length: b.players }, (_, i) => ({
    state: b.playerStates[i] ?? { paid: false, step: -1, noShow: false },
    guest: { ...(b.guests?.[i] ?? {}), name: playerName(b, i) },
  }));
}

/** Seats still open on group `k`. */
export const openSeats = (bookings: readonly Booking[], l: League, k: number): number =>
  Math.max(0, LEAGUE_SEATS - (groupBooking(bookings, l, k)?.players ?? 0));

/**
 * The bookings after putting a golfer on group `k`, or taking them off (`group: null`).
 *
 * Returns `null` when the tee time is full — the caller refuses rather than overbooking a slot.
 * A golfer already on another tee time moves with their seat as it stands (checked in, paid), so
 * moving someone never charges them twice or loses their arrival.
 */
export function placeGolfer(bookings: readonly Booking[], l: League, golferId: string, group: number | null): Booking[] | null {
  const golfer = l.roster.find((g) => g.id === golferId);
  if (!golfer) return null;
  const from = seatOf(bookings, l, golferId);
  if (from?.group === group || (!from && group == null)) return [...bookings];
  if (group != null && openSeats(bookings, l, group) === 0) return null;

  let out = [...bookings];
  let carried: { state: PlayerState; guest: BookingGuest } | null = null;
  if (from) {
    const seats = seatsOf(from.booking);
    carried = seats[from.seat];
    const rest = seats.filter((_, i) => i !== from.seat);
    out = rest.length
      ? out.map((b) => (b.id === from.booking.id ? leagueBooking(l, from.group, rest, b) : b))
      : out.filter((b) => b.id !== from.booking.id);
  }
  if (group != null) {
    const target = groupBooking(out, l, group);
    const seat = carried ?? leagueSeat(golfer);
    const next = leagueBooking(l, group, [...(target ? seatsOf(target) : []), seat], target);
    out = target ? out.map((b) => (b.id === target.id ? next : b)) : [...out, next];
  }
  return out;
}

/** True when the register's order is exactly this one seat, still unpaid — the golfer's own. */
export function isOwnOrder(s: Pick<PosState, 'selectedBookingId' | 'orderSeats' | 'lastPayment'>, ref: LeagueSeatRef): boolean {
  return (
    s.selectedBookingId === ref.booking.id &&
    !s.lastPayment &&
    (s.orderSeats ?? []).length === 1 &&
    s.orderSeats![0] === ref.seat
  );
}

/** What the League view shows for one golfer, and what Pay will take. */
export interface GolferStatus {
  ref: LeagueSeatRef | null;
  in: boolean;
  /** Paid, and nothing more owed on their order. */
  paid: boolean;
  /** What Pay charges: the register's own total for the order it would open. */
  due: number;
  /** Lines on the golfer's open order besides the round — an Extra. */
  extras: string[];
}

/**
 * One golfer's status, priced the way the register prices it.
 *
 * `due` is `orderTotals` of the very order Pay opens — the golfer's own order if one is open (an
 * Extra on it), else the order `addSeatToOrder` would build for their seat alone — so the button and
 * checkout can never disagree.
 */
export function golferStatus(s: PosState, l: League, golferId: string): GolferStatus {
  const ref = seatOf(s.bookings, l, golferId);
  if (!ref) return { ref, in: false, paid: false, due: 0, extras: [] };
  const p = ref.booking.playerStates[ref.seat];
  const own = isOwnOrder(s, ref);
  const extras = own ? s.cart.filter((i) => !i.isCheckIn && !i.isTax && i.name !== 'Taxes').map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)) : [];
  const due = own
    ? orderTotals(s.cart, taxRateOf(s)).total
    : p?.paid
      ? 0
      : orderTotals(buildTeeTimeCart(ref.booking, s.courses, rateContext(s), [ref.seat]), taxRateOf(s)).total;
  return { ref, in: (p?.step ?? -1) >= 0, paid: Boolean(p?.paid) && due === 0, due, extras };
}

/**
 * What the seat is sold on, as the register charges it: "League Rate $36.00 · Riding Cart $26.82".
 * The green fee is the seat's own (`seatPrice`, what the player row prints); transport is the line
 * the order actually carries for it — a walker's order carries none, so "Walking" has no price.
 */
export function golferFeeLine(s: PosState, ref: LeagueSeatRef): string {
  const rates = rateContext(s);
  const { booking: b, seat: i } = ref;
  const sp = seatPrice(b, i, playerFee(b, i, rates));
  const player = buildTeeTimeCart(b, s.courses, rates, [i])[0]?.players?.[0];
  const ride = player?.modifierTags.find((t) => t.isTransport);
  return `${sp.rate?.name ?? 'Green fee'} ${money(sp.greenFee)} · ${sp.transport.name}${ride ? ` ${money(ride.p)}` : ''}`;
}

/** Checked in, paid and placed, across the roster — the header's chips. */
export function leagueCounts(s: PosState, l: League): { in: number; paid: number; placed: number } {
  let inN = 0;
  let paid = 0;
  let placed = 0;
  for (const g of l.roster) {
    const ref = seatOf(s.bookings, l, g.id);
    if (!ref) continue;
    placed++;
    const p = ref.booking.playerStates[ref.seat];
    if ((p?.step ?? -1) >= 0) inN++;
    if (p?.paid) paid++;
  }
  return { in: inN, paid, placed };
}

/** Does `q` find this golfer — by either name order, or by the group they are in? */
export function matchesGolfer(name: string, group: string | null, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const [last, first = ''] = name.toLowerCase().split(',').map((x) => x.trim());
  return [name.toLowerCase(), `${first} ${last}`, group?.toLowerCase() ?? ''].some((x) => x.includes(s));
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type LeagueAction =
  /** Open the League view on a league — from its tee time's panel, or a link. */
  | { type: 'openLeague'; groupId: string; tab?: LeagueTab }
  /** Back to the tee sheet, on the league's day. */
  | { type: 'closeLeague' }
  | { type: 'setLeagueTab'; tab: LeagueTab }
  | { type: 'setLeagueFormat'; groupId: string; format: LeagueFormat }
  | { type: 'leagueCheckIn'; groupId: string; golferId: string }
  /** Put a golfer on group `group`, or take them off (`null`). */
  | { type: 'leaguePlace'; groupId: string; golferId: string; group: number | null }
  | { type: 'leaguePay'; groupId: string; golferId: string }
  | { type: 'leagueExtra'; groupId: string; golferId: string }
  /** From the register, back to the league an Extra came from. */
  | { type: 'backToLeague' };

const ACTION_TYPES = new Set<string>([
  'openLeague',
  'closeLeague',
  'setLeagueTab',
  'setLeagueFormat',
  'leagueCheckIn',
  'leaguePlace',
  'leaguePay',
  'leagueExtra',
  'backToLeague',
]);

export const isLeagueAction = (a: { type: string }): a is LeagueAction => ACTION_TYPES.has(a.type);

const dateOf = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * The golfer's seat on the register's order: their own order if it is open already (an Extra
 * waiting on it), otherwise a fresh one with just their seat. Never another golfer's seats — Pay
 * on Johnny charges Johnny.
 */
function orderFor(s: PosState, ref: LeagueSeatRef, run: (s: PosState, a: Action) => PosState): PosState {
  if (isOwnOrder(s, ref)) return s;
  const cleared = run(s, { type: 'clearOrder' });
  return run(cleared, { type: 'addSeatToOrder', bookingId: ref.booking.id, seat: ref.seat });
}

/** `run` is the store's own reducer, for the steps the register already knows how to take. */
export function leagueReducer(state: PosState, action: LeagueAction, run: (s: PosState, a: Action) => PosState): PosState {
  switch (action.type) {
    case 'openLeague': {
      const l = leagueById(action.groupId);
      if (!l || l.venueId !== state.venueId) return state;
      return {
        ...state,
        view: 'league',
        leagueGroupId: l.groupId,
        leagueTab: action.tab ?? state.leagueTab,
        currentDate: dateOf(l.date),
        reservationPanel: null,
        customerModal: null,
        contextMenu: null,
        navOpen: false,
        returnToLeague: null,
      };
    }
    case 'closeLeague':
      return { ...state, view: 'tee', teeSheetMode: 'cal', leftPanelCollapsed: true };
    case 'setLeagueTab':
      return { ...state, leagueTab: action.tab };
    case 'setLeagueFormat':
      return { ...state, leagueFormats: { ...state.leagueFormats, [action.groupId]: action.format } };
    case 'leagueCheckIn': {
      const l = leagueById(action.groupId);
      const ref = l && seatOf(state.bookings, l, action.golferId);
      if (!ref) return state;
      return run(state, {
        type: 'patchBooking',
        bookingId: ref.booking.id,
        patch: { playerStates: ref.booking.playerStates.map((p, i) => (i === ref.seat ? checkInPlayer(p) : p)) },
      });
    }
    case 'leaguePlace': {
      const l = leagueById(action.groupId);
      if (!l) return state;
      const from = seatOf(state.bookings, l, action.golferId);
      const bookings = placeGolfer(state.bookings, l, action.golferId, action.group);
      if (!bookings) return state;
      // A seat leaving the booking on the order shifts the seats after it, so the order — which
      // names seats by position — no longer means the same players. It goes; the seats stay.
      const leaving = from && from.group !== action.group && state.selectedBookingId === from.booking.id && !state.lastPayment;
      const base = leaving ? run(state, { type: 'clearOrder' }) : state;
      return { ...base, bookings };
    }
    case 'leaguePay': {
      const l = leagueById(action.groupId);
      const ref = l && seatOf(state.bookings, l, action.golferId);
      if (!ref) return state;
      const ordered = orderFor(state, ref, run);
      // "Johnny, check in, pay" — paying checks them in, as Check in & pay does.
      const checkedIn = run(ordered, {
        type: 'patchBooking',
        bookingId: ref.booking.id,
        patch: { playerStates: ref.booking.playerStates.map((p, i) => (i === ref.seat ? checkInPlayer(p) : p)) },
      });
      return { ...checkedIn, modal: { kind: 'checkout' } };
    }
    case 'leagueExtra': {
      const l = leagueById(action.groupId);
      const ref = l && seatOf(state.bookings, l, action.golferId);
      if (!ref) return state;
      return {
        ...orderFor(state, ref, run),
        view: 'pos',
        // The range and the balls, where an extra usually is.
        currentCategory: 'GOLF BALLS',
        leftPanelCollapsed: false,
        returnToLeague: l.groupId,
      };
    }
    case 'backToLeague': {
      const groupId = state.returnToLeague ?? state.leagueGroupId;
      const l = leagueById(groupId);
      if (!l) return { ...state, returnToLeague: null };
      return { ...state, view: 'league', leagueGroupId: l.groupId, currentDate: dateOf(l.date), returnToLeague: null, modal: null };
    }
  }
}
