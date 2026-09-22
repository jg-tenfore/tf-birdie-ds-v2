import {
  autoRate,
  autoTransport,
  defaultTransportFor,
  discountAmount,
  discountById,
  price as ratePrice,
  ratesForTeeTime,
  transportById,
  type DiscountPreset,
  type GreenFeeRate,
  type RateCatalogKey,
  type TransportRate,
} from '../data/rate-catalog';
import { customerForId, customerForPhone } from '../data/roster';
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
export function seatRecord(b: Booking, i: number): Customer | null {
  const crmId = b.guests?.[i]?.crmId;
  if (crmId) {
    const linked = customerForId(crmId);
    if (linked) return linked;
  }
  if (i === 0) return customerForPhone(b.phone);
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
  return autoRate(grid, seatRecord(b, i), holes);
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
  const rate = seatTransportRate(b, i);
  // A punch-card cart charges nothing and spends a punch instead. The punch is deducted when
  // the round is checked in, not here — pricing must stay a pure read.
  return rate.punchCard ? 0 : rate.price;
}

/** Does this seat's transport spend a punch rather than money? */
export const seatUsesPunch = (b: Booking, i: number): boolean =>
  Boolean(b.playerStates[i]?.transportFee == null && seatTransportRate(b, i).punchCard);

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
  const greenFee = +(gross - discount).toFixed(2);
  const transport = seatTransportRate(b, i);
  const transportFee = seatTransportFee(b, i);
  return {
    rate: seatRate(b, i, ctx),
    gross,
    discount,
    greenFee,
    transport,
    transportFee,
    usesPunch: seatUsesPunch(b, i),
    reason: seatDiscountReason(b, i),
    total: +(greenFee + transportFee).toFixed(2),
  };
}
