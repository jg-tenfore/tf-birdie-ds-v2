import {
  autoRate,
  autoTransport,
  defaultTransportFor,
  discountAmount,
  discountById,
  price as ratePrice,
  ratesForTeeTime,
  rateAllowsHoles,
  transportById,
  type DiscountPreset,
  type GreenFeeRate,
  type RateCatalogKey,
  type TransportRate,
} from '../data/rate-catalog';
import { customerForPhone, liveCustomer, roster, type CustomerEdits } from '../data/roster';
import { bookingName } from '../data/customers';

import type { Customer } from '../data/customers';
import type { Booking } from '../types';
import { rateBand } from './rates';

/**
 * What a seat is sold on — the rate, the transport and the discount behind its price.
 *
 * This is the layer Weston's third round adds. Before it, a seat's fee was a number that came
 * from one row of the rate card; now it comes from a **named rate** the counter can see and
 * change, a **named transport row** that can cost money even when the player walks, and an
 * optional discount that leaves a reason behind.
 *
 * Everything here is additive on purpose. A seat that nobody has touched carries no `rateId`
 * and prices exactly as it did before — which is what keeps two hundred authored bookings, and
 * every test written against them, telling the truth. The catalog only takes over once someone
 * picks a tile.
 */

/** Everything outside the booking that pricing a seat depends on. */
export interface SeatPricingContext {
  /** Which catalog the surface is reading. `heavy` is story-only. */
  catalog?: RateCatalogKey;
  /**
   * Session edits to customer records.
   *
   * Passed so that a customer type added in the record actually changes what the seat pays —
   * otherwise the record would show one thing and the row charge another, which is the bug
   * class this whole round keeps running into.
   */
  customers?: CustomerEdits;
}

/**
 * The customer record in seat `i`, by reliable key only.
 *
 * The same rule the rest of the POS resolves a seat by: a linked record, or for the booker the
 * booking's phone. **Never the seat's name** — "Kim, D." might be Kim, David or a stranger who
 * shares his surname, and pricing a round on that guess is the mistake this whole round of work
 * exists to prevent. A name that looks like a customer is a *suggestion* elsewhere; it prices
 * nothing until someone links it.
 */
export function seatRecord(b: Booking, i: number, edits: CustomerEdits = {}): Customer | null {
  const crmId = b.guests?.[i]?.crmId;
  if (crmId) {
    const linked = liveCustomer(crmId, edits);
    if (linked) return linked;
  }
  if (i === 0) {
    const booker = customerForPhone(b.phone);
    return booker ? liveCustomer(booker.id, edits) : null;
  }
  return null;
}

/** The date the booking sits on, for the day-of-week rules on a rate. */
function bookingDate(b: Booking): Date {
  const [y, m, d] = b.date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Every rate sellable on this booking's slot for a hole count — the tile grid's contents. */
export const seatRateGrid = (b: Booking, holes: 9 | 18, ctx: SeatPricingContext = {}): GreenFeeRate[] =>
  ratesForTeeTime(rateBand(b.timeMin), bookingDate(b), holes, ctx.catalog ?? 'standard');

/**
 * The rate seat `i` is sold on.
 *
 * The seat's own choice if someone picked a tile; otherwise the rate the system would pick for
 * whoever is sitting there. Returns null only when the grid is empty, which a real catalog
 * never is.
 */
export function seatRate(b: Booking, i: number, ctx: SeatPricingContext = {}): GreenFeeRate | null {
  const holes = b.playerStates[i]?.holes ?? (b.holes === '18H' ? 18 : 9);
  const grid = seatRateGrid(b, holes, ctx);
  const chosen = b.playerStates[i]?.rateId;
  if (chosen) {
    const found = grid.find((r) => r.id === chosen);
    if (found) return found;
  }
  return autoRate(grid, seatRecord(b, i, ctx.customers), holes);
}

/**
 * Has anyone chosen a rate for this seat?
 *
 * The distinction matters to callers: a chosen rate is a decision to preserve across a 9 ↔ 18
 * switch, an unchosen one is just what the system currently thinks.
 */
export const seatRateIsChosen = (b: Booking, i: number): boolean => b.playerStates[i]?.rateId != null;

/** The catalog's price for seat `i` before any discount, or null when no rate applies. */
export function seatCatalogFee(b: Booking, i: number, ctx: SeatPricingContext = {}): number | null {
  const rate = seatRate(b, i, ctx);
  if (!rate) return null;
  const holes = b.playerStates[i]?.holes ?? (b.holes === '18H' ? 18 : 9);
  return ratePrice(rate, holes);
}

// ─── Transport ──────────────────────────────────────────────────────────────

/** The transport row seat `i` is sold on: its own choice, else the best one for its mode. */
export function seatTransportRate(b: Booking, i: number): TransportRate {
  const chosen = transportById(b.playerStates[i]?.transportRateId);
  if (chosen) return chosen;
  const mode = b.playerStates[i]?.transport ?? b.cart;
  return autoTransport(mode, seatRecord(b, i)) ?? defaultTransportFor(mode);
}

/** What transport costs this seat — a typed-over price wins, as it does for the green fee. */
export function seatTransportFee(b: Booking, i: number): number {
  const override = b.playerStates[i]?.transportFee;
  if (override != null) return override;
  return seatTransportRate(b, i).price;
}

// ─── Punch cards ────────────────────────────────────────────────────────────

/**
 * Is this seat's round on a punch card?
 *
 * A punch buys the **round**, not the ride: the green fee goes to zero and transport is still
 * billed. The punch itself is spent at check-in, not here — pricing stays a pure read, and an
 * applied punch on a reservation nobody checked in has not been used.
 */
export const seatUsesPunch = (b: Booking, i: number): boolean => b.playerStates[i]?.punch != null;

/** Whose card is paying, and which one — it need not be the player's own. */
export const seatPunch = (b: Booking, i: number) => b.playerStates[i]?.punch ?? null;

/**
 * Can this seat switch to `holes`?
 *
 * False when the rate it is on is not sold for that length. The toggle is blocked rather than
 * repriced: dropping a player from Premium Single to whatever comes next, silently, is a price
 * change nobody asked for.
 */
export const seatCanSwitchHoles = (b: Booking, i: number, holes: 9 | 18, ctx: SeatPricingContext = {}): boolean =>
  rateAllowsHoles(seatRate(b, i, ctx), holes);

// ─── Discounts ──────────────────────────────────────────────────────────────

export const seatDiscountPreset = (b: Booking, i: number): DiscountPreset | null =>
  discountById(b.playerStates[i]?.discountId);

/** What the seat's discount takes off a fee. Zero when there is none. */
export function seatDiscount(b: Booking, i: number, fee: number): number {
  const preset = seatDiscountPreset(b, i);
  if (!preset) return 0;
  return discountAmount(preset, fee, b.playerStates[i]?.discountManual);
}

/** Why a seat is cheap — printed on the row and carried to the register line. */
export const seatDiscountReason = (b: Booking, i: number): string | null =>
  seatDiscountPreset(b, i)?.reason ?? null;

// ─── Summary ────────────────────────────────────────────────────────────────

/** Everything the player row and the register line need to print one seat's money. */
export interface SeatPrice {
  rate: GreenFeeRate | null;
  /** The green fee before the discount. */
  gross: number;
  discount: number;
  /** What the seat actually owes for the round. */
  greenFee: number;
  transport: TransportRate;
  transportFee: number;
  usesPunch: boolean;
  /** Whose punch card settled the round, when one did. */
  punch: { customerId: string; cardName: string } | null;
  reason: string | null;
  /** Green fee plus transport, after the discount — the number on the right of the row. */
  total: number;
}

/**
 * One seat's money, assembled.
 *
 * `baseFee` is what the caller's existing pricing says the seat costs — `playerFee`, which
 * already knows about manual overrides and the booking's own rate. It is used whenever nobody
 * has chosen a rate, so this function can be dropped into a row without changing what an
 * untouched booking charges.
 */
export function seatPrice(b: Booking, i: number, baseFee: number, ctx: SeatPricingContext = {}): SeatPrice {
  const manual = b.playerStates[i]?.fee;
  const catalog = seatCatalogFee(b, i, ctx);
  const gross = manual ?? (seatRateIsChosen(b, i) && catalog != null ? catalog : baseFee);
  const discount = seatDiscount(b, i, gross);
  // A punch settles the round outright, so the green fee is zero however it was priced — but
  // `gross` is kept so the row can still show what the round was worth.
  const usesPunch = seatUsesPunch(b, i);
  const greenFee = usesPunch ? 0 : +(gross - discount).toFixed(2);
  const transport = seatTransportRate(b, i);
  const transportFee = seatTransportFee(b, i);
  return {
    rate: seatRate(b, i, ctx),
    gross,
    discount,
    greenFee,
    transport,
    transportFee,
    usesPunch,
    punch: seatPunch(b, i),
    reason: usesPunch ? (b.playerStates[i]?.punch?.cardName ?? 'Punch card') : seatDiscountReason(b, i),
    total: +(greenFee + transportFee).toFixed(2),
  };
}

// ─── The seam the order prices through ──────────────────────────────────────

/**
 * What seat `i` actually owes for the round, after a discount or a punch card.
 *
 * `playerFee` answers a narrower question — what the *rate* charges — and the row, the
 * reservation's total, the cart line and the tax all have to agree with what the counter is
 * about to take. Round 3 added three ways for those to diverge (a discount, a punch, a typed
 * transport price), and every one of them was a display-only change until this existed: the row
 * read $0 while Check in & pay still charged the green fee.
 */
export const seatNetGreenFee = (b: Booking, i: number, baseFee: number, ctx: SeatPricingContext = {}): number =>
  seatPrice(b, i, baseFee, ctx).greenFee;

/**
 * The transport price the seat was explicitly put on, or `undefined` to leave it alone.
 *
 * Deliberately not "the catalog price always". A booking nobody has touched carries no
 * transport row, and repricing it from the catalog would move two hundred authored bookings and
 * every total written against them. The catalog takes over only once someone picks a row or
 * types a price — the same rule the green fee follows.
 */
export function seatTransportOverride(b: Booking, i: number): number | undefined {
  const p = b.playerStates[i];
  if (p?.transportFee != null) return p.transportFee;
  if (p?.transportRateId != null) return seatTransportRate(b, i).price;
  return undefined;
}

/**
 * A customer this seat's name *might* be — display only, never pricing.
 *
 * The counterpart to `seatRecord`'s strictness. A seat called "Kim, D." on a guest booking
 * pays the booking's rate, because a name is not an identification; but the counter can still
 * see that Kim, David exists and link him in one tap, which is what makes the seat his.
 *
 * This existed from round 1 on the Customer tab and was lost when the tab was replaced by the
 * customer record. Restoring it here rather than in `seat-customer.ts` so it resolves against
 * the deep roster, and so the two halves of the rule — what prices a seat, and what is merely
 * offered — sit next to each other where nobody can confuse them.
 *
 * Returns nothing for a seat that already resolves, and nothing for "Guest 3".
 */
export function seatSuggestedRecord(b: Booking, i: number, edits: CustomerEdits = {}): Customer | null {
  if (seatRecord(b, i, edits)) return null;
  const name = i === 0 ? b.name : b.guests?.[i]?.name;
  if (!name || /^Guest \d+$/.test(name)) return null;
  const match = matchRosterByName(name);
  return match ? liveCustomer(match.id, edits) : null;
}

/**
 * The roster record whose booking name a seat's name looks like.
 *
 * Tolerates the sheet's abbreviated form — "Farnsworth, W." should suggest Farnsworth, Weston —
 * by matching on surname plus a first-name prefix. Deliberately searched over the whole roster
 * rather than the 28-record golfer list: the suggestion is about who the demo actually knows,
 * and the narrow list would have quietly suggested nobody for most seats.
 *
 * A surname shared by several people suggests none of them. Offering one of three Brennevins
 * with a Link button is worse than offering nothing, because it invites a tap that silently
 * prices the round as the wrong person.
 */
function matchRosterByName(name: string): Customer | null {
  const norm = (x: string) => x.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
  const target = norm(name);
  if (!target) return null;

  const exact = roster.filter((c) => norm(bookingName(c)) === target);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;

  const [surname, initial] = target.split(' ');
  if (!surname || !initial) return null;
  const near = roster.filter((c) => {
    const [s, f] = norm(bookingName(c)).split(' ');
    return s === surname && f?.startsWith(initial.replace(/\.$/, ''));
  });
  return near.length === 1 ? near[0] : null;
}
