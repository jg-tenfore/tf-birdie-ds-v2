import { ALL_GOLFERS } from '../../pos/data/golfers';
import { venue, venueBookings } from '../../pos/data/venues';
import { buildTeeTimeCart } from '../../pos/logic/cart';
import { rateBand } from '../../pos/logic/rates';
import {
  assignPlayer,
  maxPlayers,
  setPlayerFee,
  setPlayerHoles,
  setPlayerTransport,
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
export const openParty = (): Booking =>
  find((b) => front(b) && b.status === 'booked' && notArrived(b) && b.players >= 2 && room(b) > b.players);

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
