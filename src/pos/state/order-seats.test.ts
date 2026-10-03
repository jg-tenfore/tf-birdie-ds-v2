import { describe, expect, it } from 'vitest';
import { venueBookings } from '../data/venues';
import { orderSeatsOf } from './order-seats';
import { orderTotals } from '../logic/cart';
import { playerFee, setPlayerTransport } from '../logic/reservation';
import { seatPrice } from '../logic/seat-pricing';
import { rateContext } from './rate-context';
import { createInitialState, reducer, type PosState } from './pos-store';

/**
 * V1 → V2, 100226 · Player rows v2: Add, Add, Pay — asserted through the store's reducer, so the
 * test covers what the rows and the footer actually dispatch.
 */

const king = venueBookings('eighteen').find((b) => b.id === 'p15_p1')!;

const base = (extra: Partial<PosState> = {}): PosState =>
  createInitialState({ venueId: 'eighteen', view: 'tee', currentDate: new Date(2026, 4, 22), transportFromRow: true, ...extra });

const run = (s: PosState, ...actions: Parameters<typeof reducer>[1][]): PosState => actions.reduce(reducer, s);

const golfNames = (s: PosState) => s.cart.filter((i) => i.isCheckIn).flatMap((i) => i.players?.map((p) => p.name) ?? []);

describe('Add, Add, Pay', () => {
  it('Add puts each player on the order and opens the rail', () => {
    const s = run(base({ leftPanelCollapsed: true }), { type: 'addSeatToOrder', bookingId: king.id, seat: 0 }, { type: 'addSeatToOrder', bookingId: king.id, seat: 1 });
    expect(s.orderSeats).toEqual([0, 1]);
    expect(s.leftPanelCollapsed).toBe(false);
    expect(golfNames(s)).toEqual(['King, D.', 'Guest 2']);
  });

  it('takes one player back off and leaves the rest', () => {
    const s = run(
      base(),
      { type: 'addSeatToOrder', bookingId: king.id, seat: 0 },
      { type: 'addSeatToOrder', bookingId: king.id, seat: 2 },
      { type: 'removeSeatFromOrder', bookingId: king.id, seat: 0 },
    );
    expect(s.orderSeats).toEqual([2]);
    expect(golfNames(s)).toEqual(['Brennan, K.']);
  });

  it('taking the last player off empties the golf, and the order is no longer this booking', () => {
    const s = run(base(), { type: 'addSeatToOrder', bookingId: king.id, seat: 1 }, { type: 'removeSeatFromOrder', bookingId: king.id, seat: 1 });
    expect(s.cart).toEqual([]);
    expect(s.orderSeats).toBeNull();
    expect(s.selectedBookingId).toBeNull();
  });

  it('keeps retail on the order when the last player comes off', () => {
    const s = run(
      base(),
      { type: 'addSeatToOrder', bookingId: king.id, seat: 1 },
      { type: 'addItem', name: 'Water', price: 2.5 },
      { type: 'removeSeatFromOrder', bookingId: king.id, seat: 1 },
    );
    expect(s.cart.map((i) => i.name)).toEqual(['Water']);
  });

  it('a whole-booking order is every seat; taking one off leaves the other three', () => {
    const s = run(base(), { type: 'loadBooking', bookingId: king.id }, { type: 'removeSeatFromOrder', bookingId: king.id, seat: 3 });
    expect(s.orderSeats).toEqual([0, 1, 2]);
  });

  it('Pay checks in just the players on the order and opens checkout', () => {
    const s = run(
      base({ reservationPanel: { bookingId: king.id, tab: 'players', playerIndex: 0 } }),
      { type: 'addSeatToOrder', bookingId: king.id, seat: 0 },
      { type: 'addSeatToOrder', bookingId: king.id, seat: 1 },
      { type: 'payOrderSeats', bookingId: king.id },
    );
    const b = s.bookings.find((x) => x.id === king.id)!;
    expect(b.playerStates.map((p) => p.step >= 0)).toEqual([true, true, false, false]);
    expect(s.view).toBe('pos');
    expect(s.reservationPanel).toBeNull();
    expect(s.modal).toEqual({ kind: 'checkout' });
    // Still just the two of them on the order.
    expect(s.orderSeats).toEqual([0, 1]);
  });

  it('orderSeatsOf reads a whole-booking order as every seat, and another booking’s as none', () => {
    expect(orderSeatsOf(king.id, null, king)).toEqual([0, 1, 2, 3]);
    expect(orderSeatsOf(king.id, [2], king)).toEqual([2]);
    expect(orderSeatsOf('someone-else', [2], king)).toEqual([]);
  });

  it('a walker is charged the Walking row the player row shows', () => {
    let s = base();
    s = run(s, { type: 'patchBooking', bookingId: king.id, patch: setPlayerTransport(king, 1, 'walking') });
    const b = s.bookings.find((x) => x.id === king.id)!;
    const row = seatPrice(b, 1, playerFee(b, 1, rateContext(s)), { catalog: s.weston.rateCatalog, customers: s.customerEdits });
    expect(row.transport.name).toBe('Walking');
    expect(row.transportFee).toBeGreaterThan(0);
    s = run(s, { type: 'addSeatToOrder', bookingId: king.id, seat: 1 });
    expect(orderTotals(s.cart).goods).toBe(row.total);
  });
});
