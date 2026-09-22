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

// ─── Round 3, second half: rates, row detail, per-seat cart, next in line,   ─
//     cart signout, punch cards                                              ─
//
// One contiguous block, imports included, so it merges cleanly against anything else
// appended here. Everything below serves the Mobile halves of sections 10 – 17.

import { CART_FLEET } from '../../pos/data/carts';
import { golferOf, isMember } from '../../pos/data/customers';
import type { Customer } from '../../pos/data/customers';
import { rateId, usablePunchCards } from '../../pos/data/rate-catalog';
import { roster } from '../../pos/data/roster';
import { money, orderTotals } from '../../pos/logic/cart';
import {
  applyPunchCard,
  setPlayerDiscount,
  setPlayerRate,
  setPlayerTransport,
  signOutCart,
} from '../../pos/logic/reservation';

/** Apply one or more reservation edits in sequence, each reading the result of the last. */
const edit = (b: Booking, ...edits: Array<(x: Booking) => Partial<Booking>>): Booking =>
  edits.reduce((acc, e) => ({ ...acc, ...e(acc) }), b);

// ─── Next in line (15) ──────────────────────────────────────────────────────

/**
 * The day's bookings in the order the phone's **‹ n of m ›** steps through them: tee time
 * first, then course, then slot, with blocks and league events left out.
 *
 * The same sort `NextInLine` does against `dayBookings(state)` — repeated here only so a story
 * can say *which* booking comes next without reaching into the component. `dayBookings` filters
 * on the day alone, so this list is the whole club's day, both nines, exactly as the phone
 * sees it.
 */
export const dayLine = (): Booking[] =>
  today()
    .filter((b) => b.pay !== 'block' && b.pay !== 'event')
    .sort((x, y) => x.timeMin - y.timeMin || x.course.localeCompare(y.course) || x.slot - y.slot);

/** Where a booking sits in that order, 0-based. */
export const lineIndex = (b: Booking): number => dayLine().findIndex((x) => x.id === b.id);

/** The booking `delta` steps away in that order. */
export const lineStep = (b: Booking, delta: number): Booking => dayLine()[lineIndex(b) + delta];

/** The first tee time of the day — where ‹ is disabled. */
export const firstInLine = (): Booking => dayLine()[0];

/** The last tee time of the day — where › is disabled. */
export const lastInLine = (): Booking => dayLine()[dayLine().length - 1];

/** Everything on the sheet the stepper refuses to open: maintenance blocks, shift changes. */
export const dayBlocks = (): Booking[] => today().filter((b) => b.pay === 'block' || b.pay === 'event');

/**
 * The last real tee time at or before the day's first block — the reservation you are sitting
 * on when the next thing *on the sheet* is a block rather than a party.
 */
export const beforeBlock = (): Booking => {
  const block = dayBlocks().slice().sort((a, b) => a.timeMin - b.timeMin)[0];
  const line = dayLine();
  return line[line.filter((b) => b.timeMin <= block.timeMin).length - 1];
};

/** Early on the front nine — a reservation a few steps into the morning. */
export const earlyFrontNine = (): Booking =>
  dayLine().find((b) => b.course === 'champ-front' && b.timeMin <= 7 * 60)!;

// ─── Cart signout (16) ──────────────────────────────────────────────────────

/** A booking with cart `key` signed out to one seat — `signOutCart` also puts them on a ride. */
export const withCartKey = (b: Booking, seat: number, key: number): Booking =>
  edit(b, (x) => signOutCart(x, seat, key));

/** The two numbers `cartsAlreadyOut` hands to the morning, so a story can name them. */
export const CARTS_OUT = { early: 14, later: 7 } as const;

/**
 * Two carts already out on the day, held by the morning's first two parties.
 *
 * No authored fixture holds a key — `playerStates` carries none anywhere in the demo data — so
 * the picker would otherwise show thirty-five free numbers and nothing struck through, and
 * "which ones are already gone" is the only question the picker exists to answer. `except`
 * keeps the story's own party out of the list, so its seats stay empty-handed.
 */
export const cartsAlreadyOut = (except?: Booking): Booking[] => {
  const earlier = dayLine().filter((b) => b.id !== except?.id).slice(0, 2);
  return [withCartKey(earlier[0], 0, CARTS_OUT.early), withCartKey(earlier[1], 0, CARTS_OUT.later)];
};

/** How many of the fleet are free once `cartsAlreadyOut` has taken its two. */
export const cartsFree = (alsoHeld = 0): string => `${CART_FLEET.length - 2 - alsoHeld} of ${CART_FLEET.length} available`;

/** The open party with the booker holding cart 22 — signing out a key implies riding. */
export const cartKeyParty = (): Booking => withCartKey(openParty(), 0, 22);

// ─── Punch cards (17) ───────────────────────────────────────────────────────

/**
 * A card holder who actually pays for their round.
 *
 * Deliberately **not** a member: every punch-card holder in `ALL_GOLFERS` is one, and members
 * price at $0, so a punch on their seat settles nothing anybody can see. This picks from the
 * wider roster — a holder with no membership and no rate-bearing customer type, so the seat
 * prices at rack and the punch has a real green fee to cover. By predicate, not by name: the
 * roster is synthesised, and a named holder is a fixture waiting to go stale.
 */
export const punchHolder = (): Customer =>
  roster.find((c) => usablePunchCards(c).length > 0 && !isMember(c) && c.customerTypes.length === 0)!;

/** A *second* holder — the one whose card covers somebody else's round. */
export const cardDonor = (): Customer =>
  roster.filter((c) => usablePunchCards(c).length > 0 && !isMember(c) && c.customerTypes.length === 0)[1];

/** The card they would spend a round from — the first with rounds left on it. */
export const cardOf = (c: Customer) => usablePunchCards(c)[0];

/** Put a roster record on a seat. `assignPlayer` wants a `Golfer`; the roster holds `Customer`. */
export const seatedWith = (b: Booking, seat: number, c: Customer): Booking =>
  edit(b, (x) => assignPlayer(x, seat, golferOf(c)));

/** The open party with a card holder on seat 2, paying rack until somebody punches it. */
export const punchParty = (): Booking => seatedWith(openParty(), 1, punchHolder());

/** The same party with that player's **own** card applied to their round. */
export const ownCardApplied = (): Booking => {
  const c = punchHolder();
  return edit(punchParty(), (b) => applyPunchCard(b, 1, c.id, cardOf(c).name));
};

/**
 * Two punched seats, one walking and one riding — the case that made "rounds, not rides".
 *
 * Seat 2's holder walks and spends their own punch; seat 3 is an unlinked guest whose round is
 * covered by another customer's card, riding. Both green fees are settled; the walker still
 * owes the trail fee and the rider still owes the cart, because a punch buys neither.
 */
export const punchedWalkerAndRider = (): Booking => {
  const holder = punchHolder();
  const donor = cardDonor();
  return edit(
    punchParty(),
    (b) => setPlayerTransport(b, 1, 'walking'),
    (b) => applyPunchCard(b, 1, holder.id, cardOf(holder).name),
    (b) => setPlayerTransport(b, 2, 'cart'),
    (b) => applyPunchCard(b, 2, donor.id, cardOf(donor).name),
  );
};

// ─── Player row detail (12) ─────────────────────────────────────────────────

/**
 * The open party with every annotation a phone row can carry, one per seat: a cart key, a rate
 * chosen by hand (a long-named one, so the one-liner has something to run out of width on), a
 * discount, and a round on a punch card.
 *
 * Deliberately crowded. The phone prints one caption line per seat, and the only way to see
 * what that line can and cannot say is to give it everything at once.
 */
export const annotatedParty = (): Booking => {
  const holder = punchHolder();
  const b = openParty();
  return edit(
    withCartKey(b, 0, CARTS_OUT.early),
    (x) => setPlayerRate(x, 1, rateId('Weekday Senior Resident')),
    (x) => (x.players > 2 ? setPlayerDiscount(x, 2, 'disc-50') : {}),
    (x) => (x.players > 3 ? applyPunchCard(x, 3, holder.id, cardOf(holder).name) : {}),
  );
};

// ─── Per-seat cart (14) ─────────────────────────────────────────────────────

/**
 * A POS state with **only `seats`** of `b` on the order — what tapping the cart chip on those
 * rows leaves behind.
 *
 * The phone has no order rail to re-expand (see 13 · Order Rail), so this is the whole of what
 * `addSeatToOrder` leaves in state: the booking selected, the seats listed, and a cart built
 * from those seats alone.
 */
export const seatOrder = (b: Booking, seats: number[], extra: Partial<PosState> = {}): Partial<PosState> =>
  at18(withBookings(b), {
    selectedBookingId: b.id,
    orderSeats: seats,
    cart: buildTeeTimeCart(b, COURSES, undefined, seats),
    ...extra,
  });

/** What the order asks for a set of seats — omit `seats` for the whole booking. */
export const seatsTotal = (b: Booking, seats?: number[]): string =>
  money(orderTotals(buildTeeTimeCart(b, COURSES, undefined, seats)).total);
