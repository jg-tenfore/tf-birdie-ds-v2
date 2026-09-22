import type { Booking, BookingGuest, Course, Golfer, PlayerState, Transport } from '../types';
import { ROUND_STEP } from '../data/config';
import { largestFit } from './bookings';
import { openRuns } from './openings';
import { bookingRateClass, rateBand, rateCardFee, seatRateClass } from './rates';
import type { RateContext } from './rates';
import {
  seatCanSwitchHoles,
  seatCatalogFee,
  seatRate,
  seatRateIsChosen,
  seatTransportRate,
} from './seat-pricing';
import { transportById } from '../data/rate-catalog';

export type { RateContext } from './rates';

/**
 * Reservation edits — Weston Edits' "massage the reservation before it goes to the cart".
 *
 * Pure functions over a `Booking`, shared by the tablet slide-over and the phone's
 * reservation screen so both edit the same way. Each builder returns a `Partial<Booking>`
 * to dispatch as `{ type: 'patchBooking', bookingId, patch }`; none mutates.
 *
 * Per-player values live on `playerStates[i]` (`holes`, `fee`, `transport`). When a player
 * has none, the booking's own value applies — so existing bookings, which never set them,
 * read exactly as before.
 */

/** The booking's own holes, as a number. Blocks and events carry `''`. */
export const bookingHoles = (b: Booking): 9 | 18 => (b.holes === '18H' ? 18 : 9);

/** Holes this player plays. */
export const playerHoles = (b: Booking, i: number): 9 | 18 => b.playerStates[i]?.holes ?? bookingHoles(b);

/**
 * This player's tee fee (per player): their own, else the default for the holes they play
 * and the class they play on (`holesFee`) — so a player switched to 18 on a 9-hole booking
 * reads the rate card's 18-hole fee even before anyone types one, and a member in a guest's
 * group reads the membership rate. `rates` carries the operator's per-row price overrides
 * and the customer roster; pass `rateContext(state)` wherever state is to hand.
 */
export const playerFee = (b: Booking, i: number, rates?: RateContext): number =>
  b.playerStates[i]?.fee ?? chosenRateFee(b, i) ?? holesFee(b, i, playerHoles(b, i), rates);

/**
 * The catalog's price for a seat whose rate someone picked, or `undefined`.
 *
 * Only a *chosen* rate answers here. A seat nobody has touched falls through to `holesFee` and
 * keeps the booking's own rate, which is what stops two hundred authored bookings repricing
 * themselves the moment the catalog exists.
 */
function chosenRateFee(b: Booking, i: number): number | undefined {
  if (!seatRateIsChosen(b, i)) return undefined;
  return seatCatalogFee(b, i) ?? undefined;
}

/** This player's transport. */
export const playerTransport = (b: Booking, i: number): Transport => b.playerStates[i]?.transport ?? b.cart;

/** The name on seat `i`: the booker for seat 0, then named guests, then "Guest n". */
export const playerName = (b: Booking, i: number): string =>
  i === 0 ? b.name : b.guests?.[i]?.name || `Guest ${i + 1}`;

/** True when a player's holes, fee or transport differ from the booking's. */
export const playerIsAdjusted = (b: Booking, i: number): boolean => {
  const p = b.playerStates[i];
  return Boolean(
    p &&
      ((p.holes != null && p.holes !== bookingHoles(b)) ||
        (p.fee != null && p.fee !== b.price) ||
        (p.transport != null && p.transport !== b.cart)),
  );
};

/** Everything about one seat that the reservation can set. */
export type SeatPatch = Partial<
  Pick<
    PlayerState,
    | 'holes'
    | 'fee'
    | 'transport'
    | 'rateId'
    | 'transportRateId'
    | 'transportFee'
    | 'discountId'
    | 'discountManual'
    | 'cartKey'
    | 'punch'
  >
>;

/** Set one player's holes, fee, rate, transport or discount (or clear one with `undefined`). */
export function setPlayer(b: Booking, i: number, patch: SeatPatch): Partial<Booking> {
  return { playerStates: b.playerStates.map((p, j) => (j === i ? { ...p, ...patch } : p)) };
}

/** The same value for every player — "everyone rides". */
export function setAllPlayers(b: Booking, patch: SeatPatch): Partial<Booking> {
  return { playerStates: b.playerStates.map((p) => ({ ...p, ...patch })) };
}

/** A fresh seat: not arrived, unpaid, booking defaults. */
const emptySeat = (): PlayerState => ({ paid: false, step: ROUND_STEP.notArrived, noShow: false });

/**
 * The most players this booking can hold where it sits: its own seats plus the open run
 * beside it on the course, capped at the course's slots. A party can't straddle another
 * booking, so this uses `largestFit` over the row without this booking in it.
 */
export function maxPlayers(b: Booking, course: Course | undefined, dayBookings: Booking[]): number {
  if (!course) return b.players;
  const others = dayBookings.filter((x) => x.id !== b.id);
  return Math.min(course.slots, Math.max(b.players, largestFit(others, course, b.timeMin)));
}

/**
 * Change the player count. Growing adds unnamed, unpaid seats; shrinking drops seats from the
 * end — never the booker. The caller checks `maxPlayers` first.
 */
export function setPlayerCount(b: Booking, count: number): Partial<Booking> {
  const n = Math.max(1, count);
  const playerStates =
    n > b.playerStates.length
      ? [...b.playerStates, ...Array.from({ length: n - b.playerStates.length }, emptySeat)]
      : b.playerStates.slice(0, n);
  const guests = b.guests ? b.guests.slice(0, n) : b.guests;
  return { players: n, playerStates, guests };
}

/** Remove one seat (not the booker). Later seats move up. */
export function removePlayer(b: Booking, i: number): Partial<Booking> {
  if (i === 0 || b.players <= 1) return {};
  return {
    players: b.players - 1,
    playerStates: b.playerStates.filter((_, j) => j !== i),
    guests: b.guests?.filter((_, j) => j !== i),
  };
}

/**
 * Put a customer on seat `i` — naming an unnamed guest, or swapping one player for
 * another. Seat 0 renames the booking itself.
 */
export function assignPlayer(b: Booking, i: number, golfer: Golfer): Partial<Booking> {
  const guest: BookingGuest = {
    name: golfer.name,
    phone: golfer.phone,
    email: golfer.email,
    memberType: golfer.memberType,
    hcp: golfer.hcp,
    crmId: golfer.id,
  };
  const guests = Array.from({ length: b.players }, (_, j) => b.guests?.[j] ?? { name: playerName(b, j) });
  guests[i] = guest;
  return i === 0 ? { name: golfer.name, phone: golfer.phone, guests } : { guests };
}

/**
 * The default fee for seat `i` playing `holes` — per player, because the rate class is
 * the player's (`seatRateClass`: members on the membership row, everyone else on rack).
 *
 * A seat on the booking's own class playing the holes it was booked for keeps the
 * booking's own rate (`b.price`) — a player nobody touched is never repriced. Anything
 * else comes from the rate card (`rateCardFee`): the price for that hole count in this tee
 * time's band (early / peak / twilight) on the seat's class, or the row's green-fee
 * override when the operator set one. So a member in a guest's group plays at the member
 * rate for the booked holes too, and a guest in a member's group on rack. A comped booking
 * (a non-member booking at $0) stays comped. Staff can always type over it, and Reset comes
 * back here.
 */
export function holesFee(b: Booking, i: number, holes: 9 | 18, rates?: RateContext): number {
  if (b.price === 0 && b.status !== 'member') return 0;
  const band = rateBand(b.timeMin);
  const cls = seatRateClass(b, i, rates, band);
  if (cls === bookingRateClass(b, band) && holes === bookingHoles(b)) return b.price;
  return rateCardFee(b, holes, rates, cls);
}

/**
 * Switch one player between 9 and 18. Clears the override when it matches the booking, and
 * drops any typed fee so the new length's default applies — a fee typed for nine holes is
 * not the fee for eighteen.
 */
export function setPlayerHoles(b: Booking, i: number, holes: 9 | 18): Partial<Booking> {
  // A rate that isn't sold for that length blocks the switch rather than repricing behind the
  // counter's back. The toggle is disabled in the UI too; this is the guard for anything that
  // dispatches directly.
  if (!seatCanSwitchHoles(b, i, holes)) return {};
  // The chosen rate is kept: switching a player from nine to eighteen does not put them on a
  // different rate, it charges that rate's eighteen-hole price. Only the typed-over fee goes,
  // because a number typed for nine holes is not the fee for eighteen.
  return setPlayer(b, i, { holes: holes === bookingHoles(b) ? undefined : holes, fee: undefined });
}

/** Put a player's fee back to the default for the holes they play. */
export const resetPlayerFee = (b: Booking, i: number): Partial<Booking> => setPlayer(b, i, { fee: undefined });

/** Set a player's fee; typing the default back in clears the override. */
export function setPlayerFee(b: Booking, i: number, fee: number, rates?: RateContext): Partial<Booking> {
  const clean = Math.max(0, Math.round(fee * 100) / 100);
  return setPlayer(b, i, { fee: clean === holesFee(b, i, playerHoles(b, i), rates) ? undefined : clean });
}

/** Set one player's transport; the booking's own value clears the override. */
export const setPlayerTransport = (b: Booking, i: number, transport: Transport): Partial<Booking> =>
  setPlayer(b, i, { transport: transport === b.cart ? undefined : transport });

/**
 * Everyone on the same transport — "everyone rides". Moves the booking's own value too, so
 * the group reads as one choice rather than four matching overrides.
 */
export function setGroupTransport(b: Booking, transport: Transport): Partial<Booking> {
  return {
    cart: transport,
    playerStates: b.playerStates.map((p) => ({ ...p, transport: undefined })),
  };
}

/** What is still owed on the reservation: unpaid players still playing. */
export function reservationDue(b: Booking, rates?: RateContext): number {
  return b.playerStates.reduce((sum, p, i) => (p.noShow || p.paid ? sum : sum + playerFee(b, i, rates)), 0);
}

/** True when nobody on the booking owes anything — everyone paid, or a no-show. */
export const reservationSettled = (b: Booking): boolean =>
  b.playerStates.length > 0 && b.playerStates.every((p) => p.paid || p.noShow);

/**
 * The round's name on the order: `Tee Time 9 holes`, `Tee Time 9/18 holes` when the party is
 * mixed, `Member Check-in` for members. Never "Walk-in" — a booking on the sheet is a tee
 * time however it was made, and the order is for the golf, not the channel.
 */
export function roundLabel(b: Booking): string {
  if (b.status === 'member') return 'Member Check-in';
  const set = new Set(b.playerStates.map((_, i) => playerHoles(b, i)));
  if (set.size === 0) set.add(bookingHoles(b));
  const holes = [...set].sort((x, y) => x - y).join('/');
  return `Tee Time ${holes} holes`;
}

/** Everyone's fees, summed, over the players still playing (no-shows excluded). */
export function reservationGreenFees(b: Booking, rates?: RateContext): number {
  return b.playerStates.reduce((sum, p, i) => (p.noShow ? sum : sum + playerFee(b, i, rates)), 0);
}

// ─── Phone reservation screen (appended by the mobile half) ─────────────────

/**
 * Change the party size where the booking sits, moving its starting slot if it has to.
 * `setPlayerCount` alone keeps `slot`, so a pair at slot 2 of 4 growing to three would run
 * off the row; this keeps it inside the open run beside it (preferring not to move at all),
 * and returns `{}` when the size doesn't fit — callers bound it by `maxPlayers` first.
 */
export function resizeParty(
  b: Booking,
  count: number,
  course: Course | undefined,
  dayBookings: Booking[],
): Partial<Booking> {
  const n = Math.max(1, count);
  if (n <= b.players || !course) return setPlayerCount(b, n);
  const others = dayBookings.filter((x) => x.id !== b.id && x.course === b.course && x.timeMin === b.timeMin);
  const runs = [...new Set(openRuns(others, course.slots).values())];
  const own = runs.find((r) => b.slot >= r.start && b.slot < r.start + r.size && r.size >= n);
  const run = own ?? runs.find((r) => r.size >= n);
  if (!run) return {};
  const slot = Math.max(run.start, Math.min(b.slot, run.start + run.size - n));
  return { ...setPlayerCount(b, n), slot };
}

/** Put one player back on the booking's own holes, fee and transport. */
export const resetPlayer = (b: Booking, i: number): Partial<Booking> =>
  setPlayer(b, i, { holes: undefined, fee: undefined, transport: undefined });

/**
 * Apply a per-player edit to every player that `include` admits — "everyone plays 18",
 * skipping anyone already paid. Each edit sees the booking as the previous one left it,
 * so edits that read the booking (like `setPlayerHoles`) compose.
 */
export function patchEachPlayer(
  b: Booking,
  edit: (b: Booking, i: number) => Partial<Booking>,
  include: (p: PlayerState, i: number) => boolean = () => true,
): Partial<Booking> {
  let next = b;
  b.playerStates.forEach((p, i) => {
    if (include(p, i)) next = { ...next, ...edit(next, i) };
  });
  return { playerStates: next.playerStates };
}

/** A player whose reservation can still be changed: not paid, not a no-show. */
export const isEditableSeat = (p: PlayerState | undefined): boolean => Boolean(p && !p.paid && !p.noShow);

// ─── Rate, transport and discount (Weston Edits, round 3) ───────────────────

/**
 * Put a seat on a rate.
 *
 * Choosing a tile drops any typed-over fee, because the number staff typed was for the rate
 * they were on. Choosing the rate the system would have picked anyway clears the choice rather
 * than pinning it — so a seat only carries a `rateId` when someone actually overrode something,
 * and "reset" has a meaning.
 */
export function setPlayerRate(b: Booking, i: number, rateId: string): Partial<Booking> {
  const auto = seatRate({ ...b, playerStates: clearRate(b, i) }, i);
  return setPlayer(b, i, { rateId: auto?.id === rateId ? undefined : rateId, fee: undefined });
}

const clearRate = (b: Booking, i: number): PlayerState[] =>
  b.playerStates.map((p, j) => (j === i ? { ...p, rateId: undefined } : p));

/** Put a seat's rate and fee back to what the system would pick for whoever is sitting there. */
export const resetPlayerRate = (b: Booking, i: number): Partial<Booking> =>
  setPlayer(b, i, { rateId: undefined, fee: undefined });

/**
 * Put a seat on a transport row.
 *
 * The row carries its own mode, so picking "Walking" from the tiles also moves the seat's
 * walk / ride / push state — the icon toggle and the tile grid are two views of one decision,
 * and letting them disagree is how a player ends up riding on a walking fee.
 */
export function setPlayerTransportRate(b: Booking, i: number, transportRateId: string): Partial<Booking> {
  const rate = transportById(transportRateId);
  if (!rate) return {};
  return setPlayer(b, i, {
    transportRateId,
    transport: rate.mode === b.cart ? undefined : rate.mode,
    transportFee: undefined,
  });
}

/** Set a seat's transport price by hand; typing the row's own price back in clears it. */
export function setPlayerTransportFee(b: Booking, i: number, fee: number): Partial<Booking> {
  const clean = Math.max(0, Math.round(fee * 100) / 100);
  return setPlayer(b, i, { transportFee: clean === seatTransportRate(b, i).price ? undefined : clean });
}

/** Apply a discount preset to a seat. `manual` carries the amount for the typed-in one. */
export const setPlayerDiscount = (b: Booking, i: number, discountId: string, manual?: number): Partial<Booking> =>
  setPlayer(b, i, { discountId, discountManual: manual });

export const clearPlayerDiscount = (b: Booking, i: number): Partial<Booking> =>
  setPlayer(b, i, { discountId: undefined, discountManual: undefined });

/**
 * Hand a cart key to a player, and take it back.
 *
 * Signing out a cart implies riding: a player holding cart 14 who still reads as walking is a
 * row that contradicts itself, so the mode follows the key.
 */
export function signOutCart(b: Booking, i: number, cartKey: number): Partial<Booking> {
  const riding = playerTransport(b, i) === 'cart';
  return setPlayer(b, i, {
    cartKey,
    ...(riding ? {} : { transport: 'cart' as Transport, transportRateId: undefined }),
  });
}

export const returnCart = (b: Booking, i: number): Partial<Booking> => setPlayer(b, i, { cartKey: undefined });

/** Everyone on the same rate — the old prototype's "Save fees to all", minus paid seats. */
export const setGroupRate = (b: Booking, rateId: string): Partial<Booking> =>
  patchEachPlayer(b, (x, i) => setPlayerRate(x, i, rateId), isEditableSeat);

/**
 * Put a seat's round on a punch card.
 *
 * A punch buys the round, not the ride: the green fee goes to zero and transport keeps its own
 * price. The card need not be the player's own — `customerId` carries whose it is, which is how
 * a member puts a guest's round on theirs.
 *
 * The punch is not spent here. It comes off the card when the round checks in, because an
 * applied punch on a reservation nobody showed up for has not been used.
 */
export const applyPunchCard = (b: Booking, i: number, customerId: string, cardName: string): Partial<Booking> =>
  setPlayer(b, i, { punch: { customerId, cardName }, discountId: undefined, discountManual: undefined });

/** Take the round back off the punch card — it reprices to whatever its rate says. */
export const clearPunchCard = (b: Booking, i: number): Partial<Booking> => setPlayer(b, i, { punch: undefined });
