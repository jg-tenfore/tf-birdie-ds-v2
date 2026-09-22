import { findMemberByName, findMemberByPhone, idMeGroupOf } from '../data/golfers';
import type { Booking, Golfer, IdMeGroup } from '../types';

/**
 * Who is sitting in a reservation's seat — the customer record behind a player row.
 *
 * Shared by the tablet's Customer tab, the phone and pricing (`seatIsMember`), so all of
 * them resolve a player the same way — from a reliable key only:
 *
 *  1. a linked record (`guests[i].crmId`) — set when someone was picked from the roster;
 *  2. for the booker, the booking's phone — the reliable key the tee sheet already uses.
 *
 * **Never the seat's name.** "Kim, D." might be Kim, David or a stranger who shares his
 * surname; silently applying a member's pricing on a guess is exactly the mistake a POS must
 * not make. A seat whose name *looks like* a customer is offered as a suggestion
 * (`seatSuggestion`) with a Link action — linking it is what makes it that customer.
 *
 * Unlinked seats resolve to nobody, which is what shows "Link a customer".
 */
export function seatCustomer(b: Booking, i: number, roster: readonly Golfer[]): Golfer | undefined {
  const crmId = b.guests?.[i]?.crmId;
  if (crmId) {
    const linked = roster.find((g) => g.id === crmId);
    if (linked) return linked;
  }
  if (i === 0) return findMemberByPhone(b.phone, roster);
  return undefined;
}

/**
 * A customer the seat's name *might* be — display only. For an unlinked seat whose name
 * matches a roster record (tolerating the sheet's abbreviated `'Farnsworth, W.'` form), the
 * Customer tab shows "Suggested: Farnsworth, William · Link". It never prices anything and
 * never counts as a membership: only linking it (`assignPlayer`, which sets `crmId`) does.
 * Unnamed seats ("Guest 3") and seats already resolved by `seatCustomer` suggest nobody.
 */
export function seatSuggestion(b: Booking, i: number, roster: readonly Golfer[]): Golfer | undefined {
  if (seatCustomer(b, i, roster)) return undefined;
  const name = i === 0 ? b.name : b.guests?.[i]?.name;
  if (!name || /^Guest \d+$/.test(name)) return undefined;
  return findMemberByName(name, roster);
}

/** The seat's ID.me group, if its customer is verified. */
export const seatIdMe = (b: Booking, i: number, roster: readonly Golfer[]): IdMeGroup | undefined =>
  idMeGroupOf(seatCustomer(b, i, roster)?.id);

/**
 * A customer's visits: every booking in the window they are on — as the booker (by phone)
 * or as a linked guest — newest first. Blocks and events are not visits.
 */
export function customerVisits(bookings: readonly Booking[], g: Golfer): Booking[] {
  const digits = g.phone.replace(/\D/g, '');
  return bookings
    .filter((b) => b.pay !== 'block' && b.pay !== 'event')
    .filter(
      (b) =>
        (digits && b.phone.replace(/\D/g, '') === digits) ||
        (b.guests ?? []).some((x) => x?.crmId === g.id),
    )
    .sort((a, b) => (a.date === b.date ? b.timeMin - a.timeMin : a.date < b.date ? 1 : -1));
}
