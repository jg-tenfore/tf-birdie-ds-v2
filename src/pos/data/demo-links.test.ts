import { describe, expect, it } from 'vitest';
import { seatRecord } from '../logic/seat-pricing';
import { customerForPhone } from './roster';
import { venueBookings } from './venues';

/**
 * The fixture linking pass.
 *
 * Round 3's rule — a name is not an identification — left the prototype with almost nothing
 * linked: 93 of 853 bookings had a booker who resolved, and **not one seat anywhere carried a
 * `crmId`**. The rule was only ever demonstrated by its negative case, and a reviewer could not
 * see a linked player without first linking one by hand.
 *
 * `linkDemoSeats` does at fixture time what staff do at the counter. These tests pin the two
 * properties that make it safe rather than just plentiful.
 */
describe('demo seat links', () => {
  const bookings = venueBookings('eighteen');

  it('links enough seats to be worth looking at, but not all of them', () => {
    let seats = 0;
    let linked = 0;
    let partiesWithNobody = 0;
    for (const b of bookings) {
      let n = 0;
      for (let i = 0; i < b.players; i++) {
        seats++;
        if (seatRecord(b, i)) {
          linked++;
          n++;
        }
      }
      if (n === 0) partiesWithNobody++;
    }
    expect(linked / seats).toBeGreaterThan(0.3);
    expect(linked / seats).toBeLessThan(0.7);
    // The case the counter meets most often, and the reason Change golfer exists: a party
    // where nobody is known. A sheet where everyone resolves would hide it.
    expect(partiesWithNobody).toBeGreaterThan(50);
  });

  it('never overrides a booker who already resolves by phone', () => {
    // The phone is how the booking was actually taken. A name link written on top of it
    // silently repoints the seat at a same-named record — which is exactly how the first
    // version of this pass stole the ID.me customers out of their own seats.
    for (const b of bookings) {
      const byPhone = customerForPhone(b.phone);
      if (!byPhone) continue;
      expect(seatRecord(b, 0)?.id, `booking ${b.id} lost its phone-resolved booker`).toBe(byPhone.id);
    }
  });

  it('never seats the same person twice in one party', () => {
    for (const b of bookings) {
      const ids = Array.from({ length: b.players }, (_, i) => seatRecord(b, i)?.id).filter(Boolean);
      expect(new Set(ids).size, `booking ${b.id} has a duplicate golfer`).toBe(ids.length);
    }
  });

  it('is deterministic — the same call twice gives the same people', () => {
    const again = venueBookings('eighteen');
    const shape = (list: typeof bookings) =>
      list.map((b) => b.guests?.map((g) => g?.crmId ?? '').join(',') ?? '').join('|');
    expect(shape(again)).toBe(shape(bookings));
  });
});
