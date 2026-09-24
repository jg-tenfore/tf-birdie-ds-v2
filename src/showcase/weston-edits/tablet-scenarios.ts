import { ALL_GOLFERS } from '../../pos/data/golfers';
import { hasPunchCard, rateId, usablePunchCards } from '../../pos/data/rate-catalog';
import { customerForId } from '../../pos/data/roster';
import { venue, venueBookings } from '../../pos/data/venues';
import { buildTeeTimeCart } from '../../pos/logic/cart';
import { seatRecord } from '../../pos/logic/seat-pricing';
import { rateBand } from '../../pos/logic/rates';
import {
  applyPunchCard,
  assignPlayer,
  maxPlayers,
  setPlayerDiscount,
  setPlayerFee,
  setPlayerHoles,
  setPlayerRate,
  setPlayerTransport,
  signOutCart,
} from '../../pos/logic/reservation';
import type { PosState, ReservationPanelState, ReservationTab } from '../../pos/state/pos-store';
import { findBooking } from '../../pos/state/scenarios';
import type { Booking } from '../../pos/types';
import { TODAY_STR, atVenue } from '../pos/screen-helpers';

/**
 * Starting states for the Weston Edits **Tablet** stories.
 *
 * Weston Edits is the 18-hole club, so every state is `atVenue('eighteen')` against that
 * club's own bookings. Examples are picked by predicate on the demo day — like the POS Screens
 * stories — so a change to the generator moves the example rather than breaking the story.
 */

const VENUE = 'eighteen' as const;
const COURSES = venue(VENUE).courses;

const all = (): Booking[] => venueBookings(VENUE);
const today = () => all().filter((b) => b.date === TODAY_STR);
/**
 * On a row the default grid draws (6:00 AM + n × 8 min). A few fixtures sit between rows
 * (12:36 PM) and so never render as a chip — no use for a story about clicking one.
 */
const onGrid = (b: Booking) => (b.timeMin - 360) % 8 === 0;
const find = (pred: (b: Booking) => boolean) => findBooking(all(), TODAY_STR, (b) => onGrid(b) && pred(b));
const room = (b: Booking) => maxPlayers(b, COURSES.find((c) => c.id === b.course), today());
const notArrived = (b: Booking) => b.playerStates.every((p) => p.step < 0 && !p.paid && !p.noShow);
const front = (b: Booking) => b.course === 'champ-front';
/**
 * A twilight nine booked ahead (`R-`), the Loom's kind of tee time. $29 in the Loom; the
 * fixtures now price from the rate card, so the twilight rack nine ($26).
 */
const reservedNine = (b: Booking) =>
  b.conf.startsWith('R-') && b.holes === '9H' && rateBand(b.timeMin) === 'twilight' && b.price > 0;

/** A party that hasn't arrived, owes, and has room beside it to grow — the main example. */

/**
 * The party with its guest seats empty again.
 *
 * The fixtures link about a third of guest seats to real customers (`linkDemoSeats`), which is
 * what makes the prototype's sheet look like a real day. It also means a seat a story picked
 * because it was empty may not be by the time the story runs.
 *
 * So the scenarios that build *on* this one state their own premise: seats 1+ start unlinked,
 * and a story that wants somebody in one puts them there (`seatedWith`). A test whose subject
 * is "an empty seat" should not depend on the fixture happening to have one.
 */
const withoutGuestLinks = (b: Booking): Booking => {
  if (!b.guests?.some((g) => g?.crmId)) return b;
  return {
    ...b,
    guests: b.guests.map((g, i) => {
      if (!g?.crmId) return g;
      // Seat 0 keeps its name — the chip on the sheet prints it — and loses only the link, so
      // the booker still resolves by phone exactly as it did before the fixtures gained links.
      if (i === 0) {
        const { crmId: _dropped, ...rest } = g;
        return rest;
      }
      return { name: `Guest ${i + 1}` };
    }),
  };
};

export const openParty = (): Booking =>
  withoutGuestLinks(
    find((b) => front(b) && b.status === 'booked' && notArrived(b) && b.players >= 2 && room(b) > b.players),
  );

/**
 * A twilight nine still to pay — an `R-` reservation. The seed slate marked these
 * `status: 'walkin'`; the generator now reads an `R-` code as `booked` (`statusForConf`).
 */
export const twilightNine = (): Booking =>
  find((b) => reservedNine(b) && notArrived(b) && b.players >= 2);

/** Morris, G. — the booking in Weston's Loom: two players, a twilight nine, already paid. */
export const paidTwilight = (): Booking =>
  find((b) => reservedNine(b) && b.players >= 2 && b.playerStates.every((p) => p.paid));

/**
 * Late on the back nine — below the fold when the sheet opens at 6:00 AM, and in the column
 * the reservation panel covers. The scroll-into-view example.
 */
export const lateBackNine = (): Booking =>
  find((b) => b.course === 'champ-back' && b.timeMin >= 16 * 60 && b.status !== 'block' && b.pay !== 'block' && b.pay !== 'event');

/** Early on the front nine — on screen when the sheet opens at 6:00 AM. */
export const earlyFrontNine = (): Booking =>
  find((b) => front(b) && b.timeMin <= 7 * 60 && b.status !== 'block' && b.pay !== 'block' && b.pay !== 'event');

/** A party whose booker's customer record is ID.me verified. */
export const idMeParty = (): Booking => find((b) => b.name.startsWith('Farnsworth'));

/** A party that didn't show. */
export const noShowParty = (): Booking =>
  find((b) => front(b) && b.pay === 'no_show' && b.players >= 2);

/** A party that already fills every seat it can — the stepper's ceiling. */
export const fullParty = (): Booking =>
  find((b) => front(b) && notArrived(b) && b.status !== 'member' && b.players === room(b));

/** A roster record by surname. */
export const golfer = (surname: string) => ALL_GOLFERS.find((g) => g.name.startsWith(surname))!;

const apply = (b: Booking, ...edits: Array<(b: Booking) => Partial<Booking>>): Booking =>
  edits.reduce((acc, e) => ({ ...acc, ...e(acc) }), b);

/**
 * The open party, massaged: a real customer (Kim, David — a member, ID.me first responder)
 * linked onto seat 2, and so on the member rate; player 3 switched to 18 (and so repriced
 * from the rate card) and riding; the booker on a typed-in $25.
 */
export const adjustedParty = (): Booking =>
  apply(
    openParty(),
    (b) => assignPlayer(b, 1, golfer('Kim')),
    (b) => setPlayerHoles(b, 2, 18),
    (b) => setPlayerFee(b, 0, 25),
    (b) => setPlayerTransport(b, 2, b.cart === 'cart' ? 'walking' : 'cart'),
  );

/**
 * A mixed member/guest group: the open party (a guest booking) with a member (Johnson,
 * Sarah) on seat 2 and a guest customer record (Martinez, Robert) on seat 3. Each seat is
 * priced on its own player's class — the member on the membership row, the guests at the
 * booking's rate.
 */
export const mixedGroup = (): Booking =>
  apply(
    openParty(),
    (b) => assignPlayer(b, 1, golfer('Johnson')),
    (b) => assignPlayer(b, 2, golfer('Martinez')),
  );

/**
 * The open party with seat 2 *named* "Kim, D." at the counter but not linked — the case the
 * old name match silently priced as a member. It pays the booking's rate; the Customer tab
 * suggests Kim, David with a Link action.
 */
export const nameOnlyGuest = (): Booking => {
  const b = openParty();
  const guests = Array.from({ length: b.players }, (_, j) => b.guests?.[j] ?? { name: j === 0 ? b.name : `Guest ${j + 1}` });
  guests[1] = { name: 'Kim, D.' };
  return { ...b, guests };
};

/** The club's bookings with some replaced. */
export function withBookings(...edited: Booking[]): Booking[] {
  const byId = new Map(edited.map((b) => [b.id, b]));
  return all().map((b) => byId.get(b.id) ?? b);
}

/** The tee sheet at the 18-hole club with the panel open on `b`. */
export function sheetWithPanel(
  b: Booking,
  tab: ReservationTab = 'players',
  extra: Partial<PosState> & { panel?: Partial<ReservationPanelState> } = {},
): Partial<PosState> {
  const { panel, ...rest } = extra;
  return atVenue(VENUE, {
    bookings: withBookings(b),
    reservationPanel: { bookingId: b.id, tab, playerIndex: 0, ...panel },
    ...rest,
  });
}

/** The register at the 18-hole club with `b` checked in — as "Check in & pay" leaves it. */
export function registerWith(b: Booking, extra: Partial<PosState> = {}): Partial<PosState> {
  return atVenue(VENUE, {
    bookings: withBookings(b),
    view: 'pos',
    leftPanelCollapsed: false,
    selectedBookingId: b.id,
    cart: buildTeeTimeCart(b, COURSES),
    ...extra,
  });
}

/**
 * The reservation open with a player's **customer record** layered over it.
 *
 * Weston's third round moved the record off the reservation: "I don't think it needs to be a
 * tab… I wonder if it's its own thing." Opening it from seat `seat` resolves whoever is sitting
 * there by reliable key — a linked record, or the booker's phone — and falls into assign mode
 * when the seat is empty, which is the Guest 3 case.
 */
export function sheetWithCustomer(b: Booking, seat = 0, extra: Partial<PosState> = {}): Partial<PosState> {
  const record = seatRecord(b, seat);
  return sheetWithPanel(b, 'players', {
    ...extra,
    customerModal: {
      customerId: record?.id ?? null,
      bookingId: b.id,
      seat,
      assigning: record == null,
    },
  });
}

// ─── Round 3: rates, row detail, the order rail ─────────────────────────────

/**
 * A four-player party still to pay.
 *
 * Three seats fit the panel at either density, so three seats cannot answer the question the
 * density option exists for. Four can: the claim being made is that dense holds a **foursome**
 * at 640 without the players list scrolling, and a foursome is what the counter is looking at
 * on a Saturday morning.
 */
export const foursome = (): Booking =>
  find((b) => front(b) && notArrived(b) && b.players === 4 && b.pay !== 'block' && b.pay !== 'event');

/**
 * A golfer whose customer record still has rounds left on a punch card.
 *
 * Picked by predicate rather than by name: the roster is synthesised, so naming a holder would
 * be a fixture waiting to go stale. (It resolves to Weston's own record, which is a coincidence
 * of the generator and not something to rely on.)
 */
export const punchCardHolder = () => ALL_GOLFERS.find((g) => hasPunchCard(customerForId(g.id)))!;

/** The card that holder would spend a round from — the first one with rounds left on it. */
export const punchCard = () => usablePunchCards(customerForId(punchCardHolder().id))[0];

/**
 * The open party with seat 2 sent out at half price.
 *
 * The row has to carry the *reason*, not just the smaller number — Weston: "we want to display
 * that there… we displayed those for a reason." A $13 seat with nothing beside it is the line
 * an owner asks about at the end of the month.
 */
export const discountedParty = (): Booking => apply(openParty(), (b) => setPlayerDiscount(b, 1, 'disc-50'));

/**
 * The open party with seat 3's round on **someone else's** punch card.
 *
 * A card holds prepaid rounds, so it settles the green fee and leaves the ride on the bill —
 * and it need not belong to the player, because a member covering a guest's round is a normal
 * Saturday. The seat is an unlinked guest, so the round it is settling is a real $26 rather
 * than a member's $0, which is what makes the punch visible on the row at all.
 */
export const punchedParty = (): Booking =>
  apply(openParty(), (b) => applyPunchCard(b, 2, punchCardHolder().id, punchCard().name));

/** The open party with the booker holding cart 14 — signing out a key implies riding. */
export const cartKeyParty = (): Booking => apply(openParty(), (b) => signOutCart(b, 0, 14));

/**
 * The foursome with every annotation a row can carry, one per seat: a cart key, a rate chosen
 * by hand (a long-named one, so truncation has something to bite on), a discount with its
 * reason, and a round on a punch card.
 *
 * It is deliberately crowded. The density choice is only a real choice against a row that has
 * something to say, and a row with a bare rack rate and a riding cart reads the same either way.
 */
export const annotatedFoursome = (): Booking =>
  apply(
    foursome(),
    (b) => signOutCart(b, 0, 14),
    (b) => setPlayerRate(b, 1, rateId('Weekday Senior Resident')),
    (b) => setPlayerDiscount(b, 2, 'disc-50'),
    (b) => applyPunchCard(b, 3, punchCardHolder().id, punchCard().name),
  );

/**
 * The tee sheet with `b`'s golf **on the order** and the rail expanded.
 *
 * The register's own state is `registerWith`; this is the other half of the same question —
 * the rail as it sits beside the tee sheet, which is where Weston's objection to its width was
 * aimed ("on the tee sheet we always want to maximise the space we have").
 */
export function sheetWithOrder(b: Booking, extra: Partial<PosState> = {}): Partial<PosState> {
  return atVenue(VENUE, {
    bookings: withBookings(b),
    leftPanelCollapsed: false,
    selectedBookingId: b.id,
    cart: buildTeeTimeCart(b, COURSES),
    ...extra,
  });
}

// ─── Round 3, second half: per-seat cart, next in line, cart signout, punches ─
//
// One contiguous block, imports included, so it merges cleanly against anything else
// appended here. Everything below serves the 14 – 17 stories.

import { roster } from '../../pos/data/roster';
import { golferOf, isMember } from '../../pos/data/customers';
import type { Customer } from '../../pos/data/customers';
import { money, orderTotals } from '../../pos/logic/cart';

/**
 * The day's bookings in the order **Next In Line** steps through them: tee time first, then
 * course, then slot, with blocks and league events left out. The same sort the panel's ‹ ›
 * uses (`stepReservation`), repeated here only so a story can say *which* booking comes next
 * without reaching into the reducer.
 */
export const dayLine = (): Booking[] =>
  today()
    .filter((b) => b.pay !== 'block' && b.pay !== 'event')
    .sort((x, y) => x.timeMin - y.timeMin || x.course.localeCompare(y.course) || x.slot - y.slot);

/** The first tee time of the day — where ‹ is disabled. */
export const firstInLine = (): Booking => dayLine()[0];

/** The last tee time of the day — where › is disabled. */
export const lastInLine = (): Booking => dayLine()[dayLine().length - 1];

/** Everything on the sheet the stepper refuses to open: maintenance blocks, shift changes. */
export const dayBlocks = (): Booking[] => today().filter((b) => b.pay === 'block' || b.pay === 'event');

/**
 * The last real tee time at or before the day's first block — the booking you are sitting on
 * when the next thing *on the sheet* is a block rather than a party.
 */
export const beforeBlock = (): Booking => {
  const block = dayBlocks().sort((a, b) => a.timeMin - b.timeMin)[0];
  const line = dayLine();
  return line[line.filter((b) => b.timeMin <= block.timeMin).length - 1];
};

/** Where a booking sits in the stepper's order, 0-based. */
export const lineIndex = (b: Booking): number => dayLine().findIndex((x) => x.id === b.id);

/** The booking `delta` steps away in the stepper's order. */
export const lineStep = (b: Booking, delta: number): Booking => dayLine()[lineIndex(b) + delta];

// ─── Cart signout ───────────────────────────────────────────────────────────

/** A booking with cart `key` signed out to one seat — `signOutCart` also puts them on a ride. */
export const withCartKey = (b: Booking, seat: number, key: number): Booking => ({
  ...b,
  ...signOutCart(b, seat, key),
});

/** The two numbers `cartsAlreadyOut` hands to the morning, so a story can name them. */
export const CARTS_OUT = { early: 14, twilight: 7 } as const;

/**
 * Two carts already out on the day.
 *
 * No authored fixture holds a key, so the picker would otherwise show thirty-five free numbers
 * and nothing struck through — and "which ones are already gone" is the question the picker
 * exists to answer. Earlier parties hold them, which is also how it goes: by the afternoon the
 * good numbers are out.
 */
export const cartsAlreadyOut = (): Booking[] => [
  withCartKey(earlyFrontNine(), 0, CARTS_OUT.early),
  withCartKey(paidTwilight(), 0, CARTS_OUT.twilight),
];

// ─── Punch cards ────────────────────────────────────────────────────────────

/**
 * A card holder who actually pays for their round.
 *
 * Deliberately **not** a member: every member in this roster plays at $0, and a punch spent on
 * a $0 seat demonstrates nothing. This picks a holder with no membership and no rate-bearing
 * customer type, so the seat prices at rack and the punch has a green fee to settle. By
 * predicate, not by name — the roster is synthesised, and a named holder is a fixture waiting
 * to go stale.
 */
export const punchHolder = (): Customer =>
  roster.find((c) => usablePunchCards(c).length > 0 && !isMember(c) && c.customerTypes.length === 0)!;

/** The card they would spend a round from — the first with rounds left on it. */
export const cardOf = (c: Customer) => usablePunchCards(c)[0];

/** Put a roster record on a seat. `assignPlayer` wants a `Golfer`; the roster holds `Customer`. */
export const seatedWith = (b: Booking, seat: number, c: Customer): Booking => ({
  ...b,
  ...assignPlayer(b, seat, golferOf(c)),
});

/** The open party with a card holder on seat 2, paying rack until somebody punches it. */
export const punchParty = (): Booking => seatedWith(openParty(), 1, punchHolder());

/** The same party with that player's **own** card applied to their round. */
export const ownCardApplied = (): Booking => {
  const b = punchParty();
  const c = punchHolder();
  return { ...b, ...applyPunchCard(b, 1, c.id, cardOf(c).name) };
};

// ─── Per-seat cart ──────────────────────────────────────────────────────────

/**
 * The tee sheet with the panel open on `b` and **only `seats`** of it on the order — what
 * pressing **Add** on those rows leaves behind. The rail is expanded, because that is what
 * `addSeatToOrder` does: an order you cannot see is one nobody checks before charging it.
 */
export function sheetWithSeatOrder(
  b: Booking,
  seats: number[],
  extra: Partial<PosState> = {},
): Partial<PosState> {
  return sheetWithPanel(b, 'players', {
    selectedBookingId: b.id,
    orderSeats: seats,
    cart: buildTeeTimeCart(b, COURSES, undefined, seats),
    leftPanelCollapsed: false,
    ...extra,
  });
}

/** What the rail's Pay button asks for a set of seats — omit `seats` for the whole booking. */
export const seatsTotal = (b: Booking, seats?: number[]): string =>
  money(orderTotals(buildTeeTimeCart(b, COURSES, undefined, seats)).total);
