import { describe, expect, it } from 'vitest';
import { venue, venueBookings } from '../data/venues';
import { createInitialState, reducer } from '../state/pos-store';
import type { Booking } from '../types';
import { buildTeeTimeCart, cartIsSettled, cartTotals, payableTotal } from './cart';
import {
  holesFee,
  playerFee,
  reservationDue,
  roundLabel,
  setGroupTransport,
  setPlayerFee,
  setPlayerHoles,
  setPlayerTransport,
} from './reservation';

/**
 * Loading a reservation into the register — the Weston Edits bug fixes. Each `describe` is
 * one bug from the Loom, asserted on the pure functions so it can't quietly come back.
 */

const eighteen = venueBookings('eighteen');
/**
 * Morris, G. — the booking in the recording: 2 players, 9 holes, 2:00 PM (twilight). $29 in the
 * recording; the fixtures now price from the rate card (`fixturePrice`), so $26, the twilight nine.
 * An `R-` reservation the seed slate used to mark `walkin`; the generator now reads it as
 * `booked` (`statusForConf`), so it prices at the reservation's $20 cart and $3 tax a seat.
 */
const morris = (): Booking => ({ ...eighteen.find((b) => b.id === 'p43')! });
const unpaid = (b: Booking): Booking => ({
  ...b,
  pay: 'open',
  playerStates: b.playerStates.map((p) => ({ ...p, paid: false, noShow: false })),
});
const paid = (b: Booking): Booking => ({
  ...b,
  pay: 'paid',
  playerStates: b.playerStates.map((p) => ({ ...p, paid: true, noShow: false })),
});
const apply = (b: Booking, patch: Partial<Booking>): Booking => ({ ...b, ...patch });
const courses = venue('eighteen').courses;

describe('bug 3 — a reserved tee time labelled Walk-in, and holes/course from the wrong club', () => {
  it('names the round, not the channel', () => {
    const [line] = buildTeeTimeCart(unpaid(morris()), courses);
    expect(morris().conf).toMatch(/^R-/);
    expect(morris().status).toBe('booked');
    expect(line.name).toBe('Tee Time 9 holes');
  });

  it('reads holes off the booking, not the three-nines COURSES', () => {
    const b18 = unpaid(eighteen.find((b) => b.holes === '18H' && b.status === 'booked')!);
    expect(buildTeeTimeCart(b18, courses)[0].name).toBe('Tee Time 18 holes');
  });

  it("resolves the course name at the 18-hole club, even without the venue's list", () => {
    expect(buildTeeTimeCart(morris())[0].teeTime?.courseName).toBe('Championship · Front 9');
  });

  it('labels a mixed party with both lengths', () => {
    const b = unpaid(morris());
    expect(roundLabel(apply(b, setPlayerHoles(b, 1, 18)))).toBe('Tee Time 9/18 holes');
  });
});

describe('bug 4 — the register charged a different price than the booking', () => {
  it("prices every seat at the booking's own rate, with no time-of-day discount on top", () => {
    const b = unpaid(morris());
    const cart = buildTeeTimeCart(b, courses);
    expect(cart[0].unitPrice).toBe(26);
    expect(cart[0].players!.every((p) => p.modifierTags.every((t) => !t.isDiscount))).toBe(true);
    expect(payableTotal(cart) - cartTotals(cart).tax).toBe(52);
    expect(reservationDue(b)).toBe(52);
  });
});

describe('bug 5 — a paid booking asked to be paid again', () => {
  it('brings paid seats across, marked, at $0 and with no tax', () => {
    const cart = buildTeeTimeCart(paid(morris()), courses);
    expect(cart[0].players!.every((p) => p.paid)).toBe(true);
    expect(cart.some((i) => i.isTax)).toBe(false);
    expect(payableTotal(cart)).toBe(0);
    expect(cartIsSettled(cart)).toBe(true);
  });

  it('charges only the seats still owing', () => {
    const b = unpaid(morris());
    b.playerStates = b.playerStates.map((p, i) => ({ ...p, paid: i === 0 }));
    const cart = buildTeeTimeCart(b, courses);
    expect(payableTotal(cart)).toBe(26 + 3);
    expect(cartIsSettled(cart)).toBe(false);
  });

  it('marks the seats paid once the register takes payment', () => {
    const b = unpaid(morris());
    let s = createInitialState({ venueId: 'eighteen', bookings: [b] });
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    s = reducer(s, { type: 'recordPayment', method: 'card', amount: 63 });
    expect(s.bookings[0].pay).toBe('paid');
    expect(s.bookings[0].playerStates.every((p) => p.paid)).toBe(true);
  });
});

describe('bugs 6 & 7 — tax on nothing, and a booking stuck to an empty order', () => {
  it('removing the round removes its tax and detaches the booking', () => {
    const b = unpaid(morris());
    let s = createInitialState({ venueId: 'eighteen', bookings: [b] });
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    expect(s.cart.some((i) => i.isTax)).toBe(true);
    s = reducer(s, { type: 'removeItem', index: 0 });
    expect(s.cart).toEqual([]);
    expect(s.selectedBookingId).toBeNull();
    expect(payableTotal(s.cart)).toBe(0);
    expect(cartTotals(s.cart).tax).toBe(0);
  });

  it('ignores a stray tax row with nothing to tax', () => {
    const stray = [{ name: 'Taxes', price: 5, qty: 1, isSubItem: true, isTax: true }];
    expect(cartTotals(stray).tax).toBe(0);
    expect(payableTotal(stray)).toBe(0);
  });

  it('keeps retail on the order when only the round goes', () => {
    const b = unpaid(morris());
    let s = createInitialState({ venueId: 'eighteen', bookings: [b] });
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    s = reducer(s, { type: 'addItem', name: 'Water', price: 2.5 });
    s = reducer(s, { type: 'removeItem', index: 0 });
    expect(s.cart.map((i) => i.name)).toEqual(['Water']);
  });
});

describe('per-player holes, fees and transport reach the register', () => {
  it("switches a player to 18 at the rate card's 18-hole price, and back again", () => {
    const b = unpaid(morris());
    const to18 = apply(b, setPlayerHoles(b, 1, 18));
    // 2:00 PM is twilight; the rack rate's 18 holes there is $42.
    expect(holesFee(b, 1, 18)).toBe(42);
    expect(playerFee(to18, 1)).toBe(42);
    expect(apply(to18, setPlayerHoles(to18, 1, 9)).playerStates[1]).not.toHaveProperty('holes', 18);
    expect(playerFee(apply(to18, setPlayerHoles(to18, 1, 9)), 1)).toBe(26);
  });

  it('prices each seat as the reservation shows it', () => {
    let b = unpaid(morris());
    b = apply(b, setPlayerHoles(b, 1, 18));
    b = apply(b, setPlayerFee(b, 0, 25));
    b = apply(b, setPlayerTransport(b, 1, 'cart'));
    const cart = buildTeeTimeCart(b, courses);
    const tax = cartTotals(cart).tax;
    // 25 + 42 green fees, plus the reservation's $20 riding cart for seat 2.
    expect(payableTotal(cart) - tax).toBe(25 + 42 + 20);
    expect(cart[0].players![1].holes).toBe(18);
    expect(cart[0].players![1].transport).toBe('cart');
  });

  it('typing the default fee back clears the override', () => {
    const b = unpaid(morris());
    expect(apply(b, setPlayerFee(b, 0, 26)).playerStates[0].fee).toBeUndefined();
  });

  it('moves the whole group on one transport choice', () => {
    let b = unpaid(morris());
    b = apply(b, setPlayerTransport(b, 1, 'push'));
    b = apply(b, setGroupTransport(b, 'cart'));
    expect(b.cart).toBe('cart');
    expect(b.playerStates.every((p) => p.transport === undefined)).toBe(true);
  });

  it('leaves an untouched booking priced exactly as it was', () => {
    const b = unpaid(eighteen.find((x) => x.status === 'booked' && x.players === 4)!);
    const cart = buildTeeTimeCart(b, courses);
    expect(cart[0].players!.every((p) => p.fee === undefined)).toBe(true);
    expect(cart[0].unitPrice).toBe(b.price);
  });
});

describe('reservation panel state', () => {
  it('opens, switches booking, and closes on load', () => {
    const [a, b] = eighteen.filter((x) => x.date === morris().date && x.players > 1);
    let s = createInitialState({ venueId: 'eighteen' });
    s = reducer(s, { type: 'openReservation', bookingId: a.id });
    expect(s.reservationPanel).toEqual({ bookingId: a.id, tab: 'players', playerIndex: 0 });
    s = reducer(s, { type: 'setReservationTab', tab: 'customer', playerIndex: 1 });
    s = reducer(s, { type: 'openReservation', bookingId: a.id });
    expect(s.reservationPanel?.tab).toBe('customer');
    s = reducer(s, { type: 'openReservation', bookingId: b.id });
    expect(s.reservationPanel).toEqual({ bookingId: b.id, tab: 'players', playerIndex: 0 });
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    expect(s.reservationPanel).toBeNull();
  });

  it('closes when its booking is deleted', () => {
    let s = createInitialState({ venueId: 'eighteen' });
    s = reducer(s, { type: 'openReservation', bookingId: 'p43' });
    s = reducer(s, { type: 'deleteBookings', bookingIds: ['p43'] });
    expect(s.reservationPanel).toBeNull();
  });
});
