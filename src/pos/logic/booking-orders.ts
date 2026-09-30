import type { Booking, Course } from '../types';
import { buildTeeTimeCart, orderTotals } from './cart';
import type { OrderRecord } from './orders';
import type { RateContext } from './rates';
import { orderNumberFromId } from './reservation';

/**
 * Tee times paid before the session, as orders (V1 → V2, Wave 3).
 *
 * A reservation shows an order number the moment any seat is paid (`orderNumber` in
 * `reservation.ts`, derived from the booking id), and in V1 → V2 that number opens Order Lookup.
 * But the seeded tee sheet was paid *before* the session began: its seats say `paid`, and nothing
 * ever rang them through `recordPayment`, so `state.orders` has no record under that number. A
 * lookup that answered "no such order" for a number printed on the reservation would be the
 * screen contradicting itself.
 *
 * So the number resolves to a record built from the booking — what those paid seats would have
 * rung up as, by the same cart builder `loadBooking` uses. It is **read-only**: `refundOrder`
 * refunds only orders it holds, so this one goes to the register (`openPaidOrder`) instead, the
 * way it did before Order Lookup existed.
 *
 * Nothing here is stored. Built at render from the booking, so moving a tee time, marking a no-show
 * or paying the rest of the party changes the record the next time it is looked at.
 */

export interface BookingOrder {
  order: OrderRecord;
  booking: Booking;
}

/** The seats that were paid for — the ones this order covers. */
const paidSeats = (b: Booking): number[] => b.playerStates.flatMap((p, i) => (p.paid ? [i] : []));

/** The booking whose reservation prints `orderNumber`, if any seat on it has been paid. */
export function bookingForOrderNumber(bookings: Booking[], orderNumber: string): Booking | undefined {
  return bookings.find((b) => paidSeats(b).length > 0 && orderNumberFromId(b.id) === orderNumber);
}

/**
 * The order a booking's paid seats were sold on.
 *
 * `buildTeeTimeCart` prices only what is still owed — a paid seat charges nothing, which is right on
 * the register and useless here. So the paid seats are built as if they were being sold now: the
 * same fees, transport and tax line, which is what the golfer was charged. Unpaid seats are left
 * out; they are not on this order.
 */
export function orderFromBooking(b: Booking, courses: Course[] = [], rates?: RateContext): OrderRecord | undefined {
  const seats = paidSeats(b);
  if (!seats.length) return undefined;
  const asSold: Booking = { ...b, playerStates: b.playerStates.map((p) => (p.paid ? { ...p, paid: false } : p)) };
  const lines = buildTeeTimeCart(asSold, courses, rates, seats);
  const t = orderTotals(lines);
  // When it was paid is not known — only that it was, before the session. Not the tee time: a
  // prepaid 2:48 PM round would otherwise read as paid three hours from now.
  const time = b.paymentRecord?.time ?? '';
  return {
    orderNumber: orderNumberFromId(b.id),
    date: b.date,
    time,
    // Nobody signed in took it — it was paid before the session.
    staffId: '',
    label: `Tee time · ${b.name}`,
    lines,
    subtotal: t.subtotal,
    tax: t.tax,
    total: t.total,
    tip: 0,
    // The seed does not say how a tee time was paid; a card is what a pre-paid tee time almost
    // always is. `paymentRecord`, when a booking has one, says otherwise.
    tenders: [{ paymentId: '', method: b.paymentRecord?.method ?? 'card', amount: t.total }],
    refunds: [],
    bookingId: b.id,
  };
}

/** A number printed on a reservation, resolved to the order behind it. */
export function bookingOrder(
  bookings: Booking[],
  orderNumber: string,
  courses: Course[] = [],
  rates?: RateContext,
): BookingOrder | undefined {
  const booking = bookingForOrderNumber(bookings, orderNumber);
  const order = booking && orderFromBooking(booking, courses, rates);
  return booking && order ? { order, booking } : undefined;
}

/**
 * Every tee time on `date` paid before the session — the golf half of a day's orders, for search.
 * A booking already rung through the register this session has a real record under the same number,
 * and that record wins: `recorded` is the set of numbers `state.orders` already holds.
 */
export function bookingOrdersOn(
  bookings: Booking[],
  date: string | null,
  recorded: ReadonlySet<string>,
  courses: Course[] = [],
  rates?: RateContext,
): BookingOrder[] {
  const out: BookingOrder[] = [];
  for (const b of bookings) {
    if (date && b.date !== date) continue;
    if (!paidSeats(b).length || recorded.has(orderNumberFromId(b.id))) continue;
    const order = orderFromBooking(b, courses, rates);
    if (order) out.push({ order, booking: b });
  }
  return out;
}
