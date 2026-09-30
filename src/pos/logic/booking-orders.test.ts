import { describe, expect, it } from 'vitest';
import { DEMO_TODAY } from '../data/bookings';
import { toDateStr } from '../data/courses';
import { venue, venueBookings } from '../data/venues';
import { createInitialState, rateContext, reducer } from '../state/pos-store';
import { amountDue } from '../state/operations';
import type { Booking } from '../types';
import { bookingForOrderNumber, bookingOrder, bookingOrdersOn, orderFromBooking } from './booking-orders';
import { buildTeeTimeCart, orderTotals } from './cart';
import { orderNumber, orderNumberFromId } from './reservation';

/**
 * A reservation's order number, resolved when no order was ever rung under it — the seeded tee
 * sheet was paid before the session began (V1 → V2, Wave 3).
 */

const bookings = venueBookings('eighteen');
const courses = venue('eighteen').courses;
const TODAY = toDateStr(DEMO_TODAY());
const paidToday = (): Booking =>
  bookings.find((b) => b.date === TODAY && b.status !== 'member' && b.players >= 2 && b.playerStates.every((p) => p.paid))!;
const unpaidToday = (): Booking =>
  bookings.find((b) => b.date === TODAY && b.status === 'booked' && b.players >= 2 && b.playerStates.every((p) => !p.paid && !p.noShow))!;

describe('finding the booking behind a number', () => {
  it('finds a paid tee time by the number its reservation prints', () => {
    const b = paidToday();
    expect(bookingForOrderNumber(bookings, orderNumber(b)!)?.id).toBe(b.id);
  });

  it('finds nothing for an unpaid one — it has no order yet', () => {
    const b = unpaidToday();
    expect(orderNumber(b)).toBeNull();
    expect(bookingForOrderNumber(bookings, orderNumberFromId(b.id))).toBeUndefined();
  });
});

describe('the order a paid tee time was sold on', () => {
  it('prices the paid seats as they were sold, with their tax, paid in full by one tender', () => {
    const b = paidToday();
    const o = orderFromBooking(b, courses)!;
    const asSold = buildTeeTimeCart({ ...b, playerStates: b.playerStates.map((p) => ({ ...p, paid: false })) }, courses);
    expect(o.orderNumber).toBe(orderNumber(b));
    expect(o.total).toBe(orderTotals(asSold).total);
    expect(o.total).toBeGreaterThan(0);
    expect(o.lines[0].isCheckIn).toBe(true);
    expect(o.lines[0].qty).toBe(b.players);
    expect(o.tenders).toEqual([{ paymentId: '', method: 'card', amount: o.total }]);
    expect(o.bookingId).toBe(b.id);
    expect(o.refunds).toEqual([]);
  });

  it('covers only the seats that were paid', () => {
    const b = unpaidToday();
    const part: Booking = { ...b, playerStates: b.playerStates.map((p, i) => ({ ...p, paid: i === 0 })) };
    const o = orderFromBooking(part, courses)!;
    expect(o.lines[0].qty).toBe(1);
    expect(o.total).toBeLessThan(orderFromBooking({ ...b, playerStates: b.playerStates.map((p) => ({ ...p, paid: true })) }, courses)!.total);
  });

  it('agrees to the cent with the order the register records when the same tee time is paid now', () => {
    const b = unpaidToday();
    let s = createInitialState({ venueId: 'eighteen', bookings });
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    s = reducer(s, { type: 'recordPayment', method: 'card', amount: amountDue(s) });
    const recorded = s.orders.at(-1)!;
    const after = s.bookings.find((x) => x.id === b.id)!;
    const built = orderFromBooking(after, s.courses, rateContext(s))!;
    expect(built.orderNumber).toBe(recorded.orderNumber);
    expect(built.total).toBe(recorded.total);
  });

  it('resolves through `bookingOrder`, and says nothing for a number nobody printed', () => {
    const b = paidToday();
    expect(bookingOrder(bookings, orderNumber(b)!, courses)?.booking.id).toBe(b.id);
    expect(bookingOrder(bookings, '#A-00000', courses)).toBeUndefined();
  });
});

describe("a day's tee-time orders, for search", () => {
  it('lists the day’s paid tee times and nothing from other days', () => {
    const day = bookingOrdersOn(bookings, TODAY, new Set(), courses);
    expect(day.length).toBeGreaterThan(0);
    expect(day.every((e) => e.order.date === TODAY)).toBe(true);
    expect(day.some((e) => e.booking.id === paidToday().id)).toBe(true);
  });

  it('leaves out a tee time the register already has a real record for', () => {
    const b = paidToday();
    const day = bookingOrdersOn(bookings, TODAY, new Set([orderNumber(b)!]), courses);
    expect(day.some((e) => e.booking.id === b.id)).toBe(false);
  });
});
