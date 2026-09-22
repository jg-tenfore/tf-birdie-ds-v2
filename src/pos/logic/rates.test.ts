import { describe, expect, it } from 'vitest';
import { RATE_PRICING } from '../data/courses';
import { venueBookings } from '../data/venues';
import { createInitialState, rateContext, reducer, timeRowKey } from '../state/pos-store';
import type { Booking } from '../types';
import { buildTeeTimeCart } from './cart';
import { bookingRateClass, bookingRowKey, rateBand, rateCardFee } from './rates';
import { holesFee, playerFee, resetPlayerFee, setPlayerFee, setPlayerHoles } from './reservation';

/**
 * Decision 2 (Weston Edits follow-ups): a player switched between 9 and 18 holes defaults to
 * the rate card's price for that length, at the tee time's band, for the booking's class —
 * not a 35 : 59 ratio off the booking's own rate.
 */

const apply = (b: Booking, patch: Partial<Booking>): Booking => ({ ...b, ...patch });
const rack = (band: 'early' | 'peak' | 'twilight') => RATE_PRICING[band].find((r) => r.rack)!;

/** A $29 nine at a given time, unpaid. */
const nine = (timeMin: number, status: Booking['status'] = 'booked'): Booking => ({
  id: 'x',
  date: '2026-05-21',
  course: 'champ-front',
  slot: 0,
  timeMin,
  name: 'Test, A.',
  players: 2,
  cart: 'walking',
  status,
  phone: '',
  conf: 'R-1',
  pay: 'open',
  price: status === 'member' ? 0 : 29,
  holes: '9H',
  playerStates: [
    { paid: false, step: -1, noShow: false },
    { paid: false, step: -1, noShow: false },
  ],
});

describe('rate card lookup', () => {
  it("bands a tee time by the sheet's shifts", () => {
    expect(rateBand(6 * 60)).toBe('early');
    expect(rateBand(9 * 60 + 52)).toBe('early');
    expect(rateBand(10 * 60)).toBe('peak');
    expect(rateBand(13 * 60 + 52)).toBe('peak');
    expect(rateBand(14 * 60)).toBe('twilight');
  });

  it('prices guests on the rack rate and members on the membership row', () => {
    expect(bookingRateClass({ status: 'booked' })).toBe('Weekday Non Resident');
    expect(bookingRateClass({ status: 'walkin' })).toBe('Weekday Non Resident');
    expect(bookingRateClass({ status: 'member' })).toBe('Membership 7 Days');
  });

  it('reads 18 and 9 off the card for each band', () => {
    for (const [band, t] of [['early', 420], ['peak', 660], ['twilight', 900]] as const) {
      expect(rateCardFee(nine(t), 18)).toBe(rack(band).p18);
      expect(rateCardFee(nine(t), 9)).toBe(rack(band).p9);
    }
    expect(rateCardFee(nine(660, 'member'), 18)).toBe(0);
  });

  it("uses a row's green-fee override when the operator set one", () => {
    const b = nine(660);
    const timePrices = { [bookingRowKey(b)]: { fee: 65 } };
    expect(bookingRowKey(b)).toBe(timeRowKey(new Date(2026, 4, 21), 660));
    expect(rateCardFee(b, 18, { timePrices })).toBe(65);
    // A membership isn't repriced by a public-rate override.
    expect(rateCardFee(nine(660, 'member'), 18, { timePrices })).toBe(0);
  });
});

describe('switching holes defaults to the rate card', () => {
  it('9 → 18 reads the 18-hole price for the band; back to 9 is the booking rate again', () => {
    const b = nine(660);
    const to18 = apply(b, setPlayerHoles(b, 1, 18));
    expect(playerFee(to18, 1)).toBe(rack('peak').p18);
    expect(playerFee(to18, 0)).toBe(29); // untouched player keeps the booking's own rate
    expect(playerFee(apply(to18, setPlayerHoles(to18, 1, 9)), 1)).toBe(29);
  });

  it('18 → 9 on an 18-hole booking reads the 9-hole price', () => {
    const b = { ...nine(420), holes: '18H', price: 100 };
    expect(holesFee(b, 0, 9)).toBe(rack('early').p9);
    expect(holesFee(b, 0, 18)).toBe(100);
  });

  it('keeps a staff override, and Reset returns to the card', () => {
    let b = nine(900);
    b = apply(b, setPlayerHoles(b, 1, 18));
    b = apply(b, setPlayerFee(b, 1, 30));
    expect(playerFee(b, 1)).toBe(30);
    b = apply(b, resetPlayerFee(b, 1));
    expect(playerFee(b, 1)).toBe(rack('twilight').p18);
    // Typing the card price back in is not an override.
    expect(apply(b, setPlayerFee(b, 1, rack('twilight').p18)).playerStates[1].fee).toBeUndefined();
  });

  it('a comped booking stays comped', () => {
    const b = { ...nine(660), price: 0 };
    expect(holesFee(b, 1, 18)).toBe(0);
  });

  it('the register loads the switched fee, override included', () => {
    const src = venueBookings('eighteen').find((x) => x.date === '2026-05-21' && x.holes === '9H' && x.status === 'booked' && x.price > 0 && x.players >= 2)!;
    const b = { ...src, pay: 'open' as const, playerStates: src.playerStates.map((p) => ({ ...p, paid: false, noShow: false })) };
    let s = createInitialState({ venueId: 'eighteen', bookings: [b] });
    s = reducer(s, { type: 'setTimePrice', key: bookingRowKey(b), price: { fee: 61 } });
    s = reducer(s, { type: 'patchBooking', bookingId: b.id, patch: setPlayerHoles(b, 1, 18) });
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    expect(s.cart[0].players![1].fee).toBe(61);
    const cart = buildTeeTimeCart(s.bookings[0], s.courses, rateContext(s));
    expect(cart[0].players![1].fee).toBe(61);
  });
});
