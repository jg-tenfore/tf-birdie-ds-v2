import { shifts } from '../../theme/tokens';
import { RATE_PRICING } from '../data/courses';
import { ALL_GOLFERS } from '../data/golfers';
import type { Booking, Golfer, TimeRowPrice } from '../types';
import { seatCustomer } from './seat-customer';

/**
 * The published rate card, as a lookup — what a round *should* cost at a time, for a length
 * and a kind of golfer.
 *
 * `RATE_PRICING` is the card the Tee Time Prices dialog and the phone's Rate Card screen
 * show: one table per time-of-day band (early / peak / twilight, the tee sheet's own
 * `shifts`), each row a rate class with an 18- and a 9-hole price. The card is the same on
 * every course in this data set, so a course doesn't change the answer — only the band,
 * the hole count and the class do. An operator's per-row price override (`timePrices`,
 * set from a time label's menu) takes precedence for the rows it covers.
 *
 * The class belongs to the **player**, not the booking: a member seated in a guest's group
 * plays on the membership row, a guest in a member's group on the rack rate
 * (`seatRateClass`). The booking's own class (`bookingRateClass`) is only the fallback for a
 * seat nobody can be identified on.
 */

/** Everything outside the booking that the rate for it depends on. */
export interface RateContext {
  /** The operator's per-row price overrides, keyed by `timeRowKey`. */
  timePrices?: Record<string, TimeRowPrice>;
  /**
   * Every customer, for telling who is a member (`seatRateClass`). Pass `rateContext(state)`
   * so a customer created this session counts; defaults to the demo roster.
   */
  roster?: readonly Golfer[];
}

export type RateBand = 'early' | 'peak' | 'twilight';

/** Key for the time-note and time-price maps: `YYYY-M-D_minutesFromMidnight`. */
export const timeRowKey = (date: Date, timeMin: number): string =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${timeMin}`;

/** The same key for a booking's own row, from its `YYYY-MM-DD` date. */
export function bookingRowKey(b: Pick<Booking, 'date' | 'timeMin'>): string {
  const [y, m, d] = b.date.split('-').map(Number);
  return `${y}-${m}-${d}_${b.timeMin}`;
}

const bandEnd = (k: 'early' | 'peak') => shifts[k].endH * 60 + shifts[k].endM;

/** Which band of the card a tee time falls in — the tee sheet's shift boundaries. */
export function rateBand(timeMin: number): RateBand {
  if (timeMin < bandEnd('early')) return 'early';
  if (timeMin < bandEnd('peak')) return 'peak';
  return 'twilight';
}

/** The card row members play on — included in the membership, so $0 at every band. */
export const MEMBER_RATE = 'Membership 7 Days';

/** The card's rack row name — the public non-resident rate every non-member plays on. */
const rackRate = (band: RateBand): string =>
  RATE_PRICING[band].find((r) => r.rack)?.rate ?? RATE_PRICING[band][0].rate;

/**
 * Which row of the card a booking as a whole is priced on — the class it was booked as.
 * Members play on the membership row; everyone else — reservations, walk-ins, groups — on
 * the card's rack rate (the row marked `rack`, the public non-resident rate that anchors it).
 * A seat uses it only when its own player can't be identified (`seatRateClass`).
 */
export function bookingRateClass(b: Pick<Booking, 'status'>, band: RateBand = 'peak'): string {
  return b.status === 'member' ? MEMBER_RATE : rackRate(band);
}

/**
 * Is the player on seat `i` a member? Read from who is sitting there, in order:
 *
 *  1. the seat's customer record (`seatCustomer`: a linked `crmId`, or the booker's phone)
 *     — a member if the record carries a membership;
 *  2. a named guest's own `memberType` (set when a customer was linked, even if the record
 *     isn't in this roster);
 *  3. otherwise the booking's class — an unlinked seat is priced as the booking was.
 *
 * Never from the seat's name: "Kim, D." on a guest booking pays the guest rate until
 * someone links Kim, David to the seat (`seatSuggestion` offers that link; it doesn't price).
 */
export function seatIsMember(b: Booking, i: number, roster: readonly Golfer[] = ALL_GOLFERS): boolean {
  const customer = seatCustomer(b, i, roster);
  if (customer) return customer.type === 'Member' || Boolean(customer.memberType);
  const guest = b.guests?.[i];
  if (guest && guest.memberType !== undefined) return guest.memberType != null;
  return b.status === 'member';
}

/** The card row seat `i` is priced on: the membership row for a member, else rack. */
export function seatRateClass(b: Booking, i: number, rates: RateContext = {}, band: RateBand = rateBand(b.timeMin)): string {
  return seatIsMember(b, i, rates.roster) ? MEMBER_RATE : rackRate(band);
}

/**
 * The card's price for `holes` on this booking's row, for a rate class — the booking's own
 * unless one is given (pass `seatRateClass` for a player). Its band decides the table; the
 * row's green-fee override wins when the operator set one (except on the membership row —
 * an override reprices the public round, not what a membership includes).
 */
export function rateCardFee(
  b: Pick<Booking, 'status' | 'timeMin' | 'date'>,
  holes: 9 | 18,
  rates: RateContext = {},
  rateClass: string = bookingRateClass(b, rateBand(b.timeMin)),
): number {
  const band = rateBand(b.timeMin);
  const override = rates.timePrices?.[bookingRowKey(b)]?.fee;
  if (override != null && rateClass !== MEMBER_RATE) return override;
  const row = RATE_PRICING[band].find((r) => r.rate === rateClass);
  if (!row) return 0;
  return holes === 18 ? row.p18 : row.p9;
}
