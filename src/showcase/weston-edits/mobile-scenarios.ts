import { ALL_GOLFERS } from '../../pos/data/golfers';
import { seatRecord } from '../../pos/logic/seat-pricing';
import { TEE_PRICES } from '../../pos/data/courses';
import { venue, venueBookings } from '../../pos/data/venues';
import { buildTeeTimeCart } from '../../pos/logic/cart';
import { assignPlayer, bookingHoles, maxPlayers, setPlayer, setPlayerFee, setPlayerHoles } from '../../pos/logic/reservation';
import { findBooking } from '../../pos/state/scenarios';
import type { PosState } from '../../pos/state/pos-store';
import type { Booking, CartItem } from '../../pos/types';
import { TODAY_STR } from '../pos/screen-helpers';

/**
 * Starting states for the Weston Edits **Mobile** stories.
 *
 * Weston Edits is the 18-hole club, so every state here names it (`venueId: 'eighteen'`)
 * and draws from its own bookings — never the build's venue, and never a hard-coded id.
 * Bookings are picked by predicate on the demo day, the same way the Mobile Screens
 * stories pick theirs, so a change to the generator moves the example rather than breaking it.
 */

export const VENUE = 'eighteen' as const;
const COURSES = venue(VENUE).courses;

/** The 18-hole club's demo bookings (memoized by `venueBookings`). */
export const bookings18 = (): Booking[] => venueBookings(VENUE);

const today = () => bookings18().filter((b) => b.date === TODAY_STR);
const find = (pred: (b: Booking) => boolean) => findBooking(bookings18(), TODAY_STR, pred);
const sellable = (b: Booking) => b.status !== 'block' && b.pay !== 'block' && b.pay !== 'event';
const notArrived = (b: Booking) => b.playerStates.every((p) => p.step < 0 && !p.noShow && !p.paid);
const room = (b: Booking) => maxPlayers(b, COURSES.find((c) => c.id === b.course), today());

/** Put edited bookings back into the day's list. */
export function withBookings(...edited: Booking[]): Booking[] {
  const byId = new Map(edited.map((b) => [b.id, b]));
  return bookings18().map((b) => byId.get(b.id) ?? b);
}

/** A POS state at the 18-hole club with these bookings. */
export const at18 = (bookings: Booking[] = bookings18(), extra: Partial<PosState> = {}): Partial<PosState> => ({
  venueId: VENUE,
  bookings,
  ...extra,
});

const apply = (b: Booking, patch: Partial<Booking>): Booking => ({ ...b, ...patch });
const golfer = (id: string) => ALL_GOLFERS.find((g) => g.id === id)!;

// ─── Picks ──────────────────────────────────────────────────────────────────

/** An unpaid, paying party of two or three that hasn't arrived, with room beside it to grow. */
export const growableParty = (): Booking =>
  find((b) => sellable(b) && b.pay === 'open' && b.price > 0 && b.players >= 2 && b.players <= 3 && notArrived(b) && room(b) > b.players);

/** An unpaid, paying foursome (or the largest open party) that hasn't arrived. */
export const openParty = (): Booking =>
  find((b) => sellable(b) && b.pay === 'open' && b.price > 0 && b.players >= 3 && notArrived(b));

/** A booking everyone has already paid for. */
export const paidParty = (): Booking =>
  find((b) => sellable(b) && b.players >= 2 && b.playerStates.every((p) => p.paid));

/**
 * A party where some have paid and some haven't — the case that must charge only the rest.
 * The demo day doesn't reliably generate one, so it's made from the open party: the first
 * two players paid online, the rest pay at the counter.
 */
export const partlyPaid = (): Booking => {
  const b = openParty();
  return { ...b, playerStates: b.playerStates.map((p, i) => (i < 2 ? { ...p, paid: true } : p)) };
};

/** A member booking — $0 at the member rate. */
export const memberParty = (): Booking => find((b) => sellable(b) && b.status === 'member');

// ─── Edited reservations ────────────────────────────────────────────────────

/**
 * The open party, named and adjusted the way Weston described: seat 2 is an ID.me-verified
 * veteran picked from People (Thompson, Michael — a member, so on the member rate), seat 3 a
 * verified nurse (Walsh, Patricia — also a member) when the party has a fourth, the last
 * seat an unnamed guest switched to the other round length (9 ↔ 18) at the rate card's fee,
 * and the booker has switched to a riding cart.
 */
export function adjustedParty(): Booking {
  let b = openParty();
  b = apply(b, assignPlayer(b, 1, golfer('G001')));
  if (b.players > 2) {
    const last = b.players - 1;
    if (last > 2) b = apply(b, assignPlayer(b, 2, golfer('M008')));
    // The other round length from the booking's own — nine on an 18, eighteen on a 9.
    b = apply(b, setPlayerHoles(b, last, bookingHoles(b) === 18 ? 9 : 18));
  }
  b = apply(b, setPlayer(b, 0, { transport: b.cart === 'cart' ? 'walking' : 'cart' }));
  return b;
}

/** The adjusted party with one player's fee typed over — a comp for the booker. */
export function compedParty(): Booking {
  const b = adjustedParty();
  return apply(b, setPlayerFee(b, 0, 0));
}

/**
 * A mixed member/guest group: the open party (a guest booking) with a member (Chen, Emily)
 * on seat 2 and a guest customer record (Martinez, Robert) on seat 3. Each seat is priced
 * on its own player's class — the member on the membership row, the guests at the
 * booking's rate — on the phone exactly as on the terminal and the register.
 */
export function mixedGroup(): Booking {
  let b = openParty();
  b = apply(b, assignPlayer(b, 1, golfer('G004')));
  b = apply(b, assignPlayer(b, 2, golfer('G003')));
  return b;
}

/**
 * The open party with seat 2 *named* "Kim, D." but not linked — priced at the booking's rate,
 * with Kim, David offered as a suggested profile to link.
 */
export function nameOnlyGuest(): Booking {
  const b = openParty();
  const guests = Array.from({ length: b.players }, (_, j) => b.guests?.[j] ?? { name: j === 0 ? b.name : `Guest ${j + 1}` });
  guests[1] = { name: 'Kim, D.' };
  return { ...b, guests };
}

/** The partly-paid party with ID.me customers linked, so locked rows still show badges. */
export function partlyPaidNamed(): Booking {
  const b = partlyPaid();
  return apply(b, assignPlayer(b, 1, golfer('M005')));
}

// ─── Orders ─────────────────────────────────────────────────────────────────

/** A drink and a sleeve of balls — F&B and retail that keep their modifiers and steppers. */
const EXTRAS: CartItem[] = [
  { name: 'Gatorade', price: 3.5, qty: 2 },
  { name: 'Titleist Pro V1 Sleeve', price: 16, qty: 1 },
];

/**
 * A reservation loaded into the register — what "Check in & pay" produces — optionally with
 * F&B and retail already added after the golf.
 */
export function loadedOrder(b: Booking, opts: { extras?: boolean } = {}): Partial<PosState> {
  return at18(withBookings(b), {
    view: 'pos',
    selectedBookingId: b.id,
    cart: [...buildTeeTimeCart(b, COURSES), ...(opts.extras ? EXTRAS : [])],
  });
}

/**
 * A paying party whose rate isn't the old status-table price (`TEE_PRICES[status].basePrice`,
 * $100 or $59) — the twilight / early-bird case where the order used to charge that price
 * less a time-of-day discount instead of the booking's own rate.
 */
export const offRateParty = (): Booking =>
  find((b) => sellable(b) && b.price > 0 && b.price !== TEE_PRICES[b.status]?.basePrice && b.pay === 'open');

/**
 * A booking whose **booker resolves to a customer record** — by the booking's phone, the only
 * reliable key for seat 0.
 *
 * Most demo bookings do not: a name on a sheet is just a string until someone links it, which
 * is the rule this round exists to enforce. So a story that wants to show a *record* rather
 * than the assign-a-customer state has to pick a booking that actually has one, instead of
 * assuming any party will do.
 */
export const bookerWithRecord = (): Booking => find((b) => sellable(b) && seatRecord(b, 0) != null);
