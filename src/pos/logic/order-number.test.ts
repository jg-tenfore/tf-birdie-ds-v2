import { describe, expect, it } from 'vitest';
import { orderNumber } from './reservation';
import { venueBookings } from '../data/venues';
import type { Booking } from '../types';

/**
 * The order number is derived, not stored, so these pin the two properties that makes
 * worthwhile: it is stable, and it only exists once money has changed hands.
 */

const seat = (paid: boolean, noShow = false) => ({ step: 0, paid, noShow }) as Booking['playerStates'][number];
const booking = (id: string, states: Booking['playerStates']) =>
  ({ id, playerStates: states }) as Booking;

describe('orderNumber', () => {
  it('is null until something has been paid', () => {
    expect(orderNumber(booking('a1', [seat(false), seat(false)]))).toBeNull();
  });

  it('is null for a party that never showed, since nothing was charged', () => {
    expect(orderNumber(booking('a2', [seat(false, true), seat(false, true)]))).toBeNull();
  });

  it('exists as soon as one seat is paid, not only when the whole party is', () => {
    // A split party pays one seat at a time; the order opens on the first tender.
    expect(orderNumber(booking('a3', [seat(true), seat(false)]))).toMatch(/^#A-\d{5}$/);
  });

  it('is the same every time for the same booking', () => {
    const b = booking('p01', [seat(true)]);
    expect(orderNumber(b)).toBe(orderNumber(b));
    expect(orderNumber(booking('p01', [seat(true), seat(true)]))).toBe(orderNumber(b));
  });

  it('differs between bookings', () => {
    const a = orderNumber(booking('p01', [seat(true)]));
    const b = orderNumber(booking('p02', [seat(true)]));
    expect(a).not.toBe(b);
  });

  it('gives every paid booking on the sheet a well-formed, unique-enough number', () => {
    const paid = venueBookings('three-nines').filter((b) =>
      (b.playerStates ?? []).some((p) => p.paid),
    );
    expect(paid.length).toBeGreaterThan(10);

    const numbers = paid.map((b) => orderNumber(b)!);
    for (const n of numbers) expect(n).toMatch(/^#A-\d{5}$/);

    // Collisions are possible in principle — it is a hash into 90k slots — but a demo sheet
    // showing the same order number on two different tee times is the bug this guards.
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
