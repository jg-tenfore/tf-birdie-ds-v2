import type { Booking } from '../types';
import { bookingName } from './customers';
import { customerForName, customerForPhone, roster } from './roster';

/**
 * Link a share of demo seats to real customer records.
 *
 * ## Why the fixtures needed this
 *
 * Round 3 established the rule this whole edition turns on: **a name is not an
 * identification.** A seat prices off a linked record or off the booker's phone, never off
 * the string printed on the chip — that rule is what fixed a class of wrong-price bugs.
 *
 * The side effect was a prototype where almost nothing was linked. Of the 853 bookings on the
 * 18-hole club, **93 had a booker who resolved and not one seat anywhere carried a `crmId`**.
 * So every guest seat opened the search screen, and a reviewer could not see what a linked
 * player looks like without first linking one by hand. The rule was being demonstrated
 * exclusively by its negative case.
 *
 * This does at fixture time what staff do at the counter: confirms an identity. It is emphatically
 * **not** name-matching at runtime — that is the bug. A record is attached here, once, and from
 * then on `seatRecord` reads the `crmId` like any other link.
 *
 * ## What it links
 *
 * | Seat | Rule |
 * |---|---|
 * | The booker | Linked where the chip's name matches a roster record, on about two thirds of bookings |
 * | Guests | About a third are given a real customer — both the name and the `crmId`, so the row and the record agree |
 *
 * Deliberately partial. A sheet where everybody resolves would hide the case the counter
 * actually meets most often — a party of four with one known member and three strangers — and
 * that case is the reason **Change golfer** exists.
 *
 * Deterministic from the booking id, so a screenshot taken today and one taken next week show
 * the same people.
 */

/** FNV-1a. Small, stable, and good enough to spread seats across a roster. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Customers worth putting on a seat: a name, and something to look at on the record. */
const LINKABLE = roster.filter((c) => c.firstName && c.lastName && c.phone);

export function linkDemoSeats(list: Booking[]): Booking[] {
  return list.map((b) => {
    const guests = [...(b.guests ?? [])];
    let touched = false;

    const seat = (i: number) => guests[i] ?? { name: '' };

    // ── The booker ──────────────────────────────────────────────────────────
    // Only ever to the record that already carries this name, so the chip on the tee sheet
    // and the record behind it never disagree.
    // Never over a booker who already resolves by phone. The phone is the stronger signal —
    // it is how the booking was actually taken — and a name link written on top of it silently
    // repoints the seat at a different record. That is what broke the ID.me fixtures the first
    // time this ran: the verified customer resolved by phone, and a same-name record took the
    // seat from them.
    const resolvesByPhone = Boolean(customerForPhone(b.phone));
    if (!resolvesByPhone && !guests[0]?.crmId && hash(`${b.id}:booker`) % 100 < 66) {
      const match = customerForName(b.name);
      if (match) {
        guests[0] = { ...seat(0), name: seat(0).name || b.name, crmId: match.id };
        touched = true;
      }
    }

    // ── The rest of the party ───────────────────────────────────────────────
    // A guest seat has no name to honour, so it gets both: the customer's booking name and
    // the link to them.
    for (let i = 1; i < b.players; i++) {
      if (guests[i]?.crmId) continue;
      const roll = hash(`${b.id}:${i}`);
      if (roll % 100 >= 34) continue;
      const who = LINKABLE[roll % LINKABLE.length];
      // Never the same person twice in one party — a foursome of one golfer reads as a bug.
      if (guests.some((g) => g?.crmId === who.id)) continue;
      guests[i] = { ...seat(i), name: bookingName(who), crmId: who.id };
      touched = true;
    }

    return touched ? { ...b, guests } : b;
  });
}
