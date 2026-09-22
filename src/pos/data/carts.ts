import type { Booking } from '../types';

/**
 * The cart fleet, for signout.
 *
 * The old prototype puts a **Cart signout** button on every player row and a key glyph on the
 * booking once a cart is out. It is a small feature with a real constraint behind it: a course
 * has a fixed number of carts, the counter needs to know which are already out before handing
 * over a key, and two players cannot be given cart 14.
 *
 * Modelled as a fixed fleet plus a derived view of what is out, rather than a mutable list of
 * carts with an `out` flag. Availability is a function of the day's bookings, so it cannot
 * drift away from what the tee sheet says — returning a cart is just clearing the seat that
 * holds it, and there is no second place to forget to update.
 */

/** Every cart the course owns. Numbers skip 13, the way most fleets do. */
export const CART_FLEET: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 36,
];

/** A cart that is out, and who has it. */
export interface CartSignout {
  cart: number;
  bookingId: string;
  playerIndex: number;
  playerName: string;
  timeMin: number;
}

/**
 * Every cart currently signed out on a day.
 *
 * Read off the bookings themselves: a seat carrying `cartKey` is a cart that is out. Past
 * bookings still hold their keys until the round is marked finished, which is correct — a cart
 * does not come back because its tee time passed.
 */
export function signedOutCarts(dayBookings: Booking[]): CartSignout[] {
  const out: CartSignout[] = [];
  for (const b of dayBookings) {
    b.playerStates.forEach((p, i) => {
      if (p.cartKey == null) return;
      out.push({
        cart: p.cartKey,
        bookingId: b.id,
        playerIndex: i,
        playerName: i === 0 ? b.name : (b.guests?.[i]?.name ?? `Guest ${i + 1}`),
        timeMin: b.timeMin,
      });
    });
  }
  return out.sort((a, b) => a.cart - b.cart);
}

/** Carts free to hand out, in fleet order. */
export function availableCarts(dayBookings: Booking[]): number[] {
  const taken = new Set(signedOutCarts(dayBookings).map((s) => s.cart));
  return CART_FLEET.filter((c) => !taken.has(c));
}

/** Who has this cart, if anyone — what the picker shows under a taken number. */
export const cartHolder = (cart: number, dayBookings: Booking[]): CartSignout | null =>
  signedOutCarts(dayBookings).find((s) => s.cart === cart) ?? null;

/** Carts out on a booking, for the key glyph on its tee-sheet chip. */
export const bookingCarts = (b: Booking): number[] =>
  b.playerStates.map((p) => p.cartKey).filter((c): c is number => c != null);
