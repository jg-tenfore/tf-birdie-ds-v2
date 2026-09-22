import { RATE_PRICING } from './courses';
import type { Customer } from './customers';
import { isMember } from './customers';
import type { RateBand } from '../logic/rates';
import type { Transport } from '../types';

/**
 * The rate catalog — what the course *sells*, and to whom.
 *
 * The old prototype priced a seat by looking up one row of a table. Weston's model is
 * different and it is the point of this round: when you open a player's fee you are not
 * offered every rate in the system, you are offered **every rate that could apply to this tee
 * time on this date** — the ones whose band, day and hole count cover the slot. The system
 * pre-picks the one the player is owed from their own record, and staff can still choose any
 * other tile, because the counter's job includes saying "you're getting the member rate today"
 * to someone who technically isn't.
 *
 * Two things live here that the rate card alone cannot express:
 *
 *  - **Eligibility.** A rate is tied to memberships, customer types, bands, days or hole
 *    counts. That is what makes the tile grid a short list instead of a catalog dump, and what
 *    lets the grid separate "eligible" from "everything else" when a course sells a lot.
 *  - **Transport as a priced catalog.** Riding is not a boolean. A course sells several carts
 *    at different prices, a member cart at nothing, a punch-card cart that consumes a punch,
 *    and — the case that breaks a walk/ride toggle — a *trail fee for walking*.
 */

export interface RateEligibility {
  /** Anyone. Mutually exclusive with the narrowing fields below. */
  open?: boolean;
  /** Any customer holding a membership. */
  membersOnly?: boolean;
  /** Only customers holding one of these memberships by name. */
  memberships?: string[];
  /** Only customers carrying one of these customer types. */
  customerTypes?: string[];
  /** Bands this rate is sold in. Absent means every band. */
  bands?: RateBand[];
  /** Days of the week it is sold on, 0 = Sunday. Absent means every day. */
  days?: number[];
  /** Hole counts it is sold for. Absent means both. */
  holes?: Array<9 | 18>;
}

export interface GreenFeeRate {
  id: string;
  name: string;
  p18: number;
  p9: number;
  /** The public non-resident rate that anchors the card. */
  rack?: boolean;
  /** Shown on the tile when the rate is a discount off rack rather than a price of its own. */
  percentOff?: number;
  eligibility: RateEligibility;
}

/**
 * Who each row of the standard card is for.
 *
 * Keyed by the rate's name so the prices stay in `RATE_PRICING` — one source for what a round
 * costs, and this file only says who may buy it. A row with no rule is open to anyone, which is
 * the right default: an unknown rate should be offerable, not hidden.
 */
const STANDARD_RULES: Record<string, RateEligibility> = {
  'Weekday Resident': { customerTypes: ['Resident', 'Resident 22 Test'], days: [1, 2, 3, 4, 5] },
  'Weekday Senior Resident': {
    customerTypes: ['Senior'],
    days: [1, 2, 3, 4, 5],
  },
  'Weekday Junior': { customerTypes: ['Junior'], days: [1, 2, 3, 4, 5] },
  'Membership Weekday': { memberships: ['Weekday Golf'], days: [1, 2, 3, 4, 5] },
  'Membership 7 Days': { memberships: ['Full Golf', 'Corporate — 4 seat', '30 Day booking window'] },
  'Junior Membership Weekday': { memberships: ['Junior'], days: [1, 2, 3, 4, 5] },
  Employee: { customerTypes: ['Employee'] },
  'Family Full Membership': { memberships: ['Full Golf'] },
  'Family Weekday': { memberships: ['Weekday Golf', 'Trial Month'] },
  'Weekday Non Resident': { open: true },
};

/**
 * A course that sells a lot of rates.
 *
 * Weston's note was that some courses have far more than ten, and the tile grid has to survive
 * it. Twenty-six rows, drawn from the naming the old prototype used, so the overflow treatment
 * — eligible first, then a filter over everything else — has something real to work against.
 * Story-only: no prototype ships this catalog.
 */
export const HEAVY_RATE_PRICING: Record<RateBand, Array<Omit<GreenFeeRate, 'id'>>> = buildHeavy();

function buildHeavy(): Record<RateBand, Array<Omit<GreenFeeRate, 'id'>>> {
  const rows: Array<{ name: string; base18: number; base9: number; rule: RateEligibility; rack?: boolean; percentOff?: number }> = [
    { name: 'Rack Prime', base18: 72, base9: 46, rule: { open: true }, rack: true },
    { name: 'Rack Standard', base18: 64, base9: 41, rule: { open: true } },
    { name: 'Course Level Fee', base18: 58, base9: 36, rule: { open: true } },
    { name: 'Online Discount', base18: 52, base9: 33, rule: { open: true }, percentOff: 10 },
    { name: 'Birdie Club', base18: 54, base9: 34, rule: { open: true }, percentOff: 25 },
    { name: 'Weekday Resident', base18: 58, base9: 36, rule: { customerTypes: ['Resident'], days: [1, 2, 3, 4, 5] } },
    { name: 'Weekend Resident', base18: 66, base9: 42, rule: { customerTypes: ['Resident'], days: [0, 6] } },
    { name: 'Resident Senior', base18: 53, base9: 33, rule: { customerTypes: ['Resident', 'Senior'] } },
    { name: 'Non Resident Senior', base18: 61, base9: 39, rule: { customerTypes: ['Senior'] } },
    { name: 'Junior', base18: 38, base9: 22, rule: { customerTypes: ['Junior'] } },
    { name: 'Junior Twilight', base18: 26, base9: 16, rule: { customerTypes: ['Junior'], bands: ['twilight'] } },
    { name: 'Military', base18: 44, base9: 28, rule: { customerTypes: ['Military'] } },
    { name: 'First Responder', base18: 44, base9: 28, rule: { customerTypes: ['Hero'] } },
    { name: 'Employee', base18: 0, base9: 0, rule: { customerTypes: ['Employee'] } },
    { name: 'Employee Guest', base18: 30, base9: 18, rule: { customerTypes: ['Guest of Members'] } },
    { name: 'Membership 7 Days', base18: 0, base9: 0, rule: { memberships: ['Full Golf', 'Corporate — 4 seat'] } },
    { name: 'Membership Weekday', base18: 0, base9: 0, rule: { memberships: ['Weekday Golf'], days: [1, 2, 3, 4, 5] } },
    { name: 'Membership Trial', base18: 18, base9: 11, rule: { memberships: ['Trial Month'] } },
    { name: 'Junior Membership', base18: 0, base9: 0, rule: { memberships: ['Junior'] } },
    { name: 'Social Membership', base18: 46, base9: 29, rule: { memberships: ['Social'] } },
    { name: 'Guest of Member', base18: 48, base9: 30, rule: { customerTypes: ['Guest of Members'] } },
    { name: 'Diamond Card', base18: 40, base9: 25, rule: { customerTypes: ['Diamond'] } },
    { name: 'Premium Single', base18: 62, base9: 39, rule: { customerTypes: ['premium single'], holes: [18] } },
    { name: 'League Rate', base18: 36, base9: 22, rule: { open: true } },
    { name: 'Outing Rate', base18: 42, base9: 26, rule: { open: true } },
    { name: 'Replay', base18: 28, base9: 17, rule: { open: true, bands: ['twilight'] } },
  ];

  // Prices step down through the day the way the standard card does: peak is the authored
  // number, early is about 25% under it and twilight about 40%, rounded to the dollar. Keeping
  // one authored figure per rate means a rate can't accidentally cost more at twilight.
  const scale = (n: number, f: number) => (n === 0 ? 0 : Math.round(n * f));
  const band = (f: number) =>
    rows.map((r) => ({
      name: r.name,
      p18: scale(r.base18, f),
      p9: scale(r.base9, f),
      rack: r.rack,
      percentOff: r.percentOff,
      eligibility: r.rule,
    }));

  return { early: band(0.75), peak: band(1), twilight: band(0.6) };
}

/** `rate-weekday-resident` — stable across catalogs, so a seat's saved rate survives a reload. */
export const rateId = (name: string): string =>
  `rate-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** Which catalog a surface is reading. `heavy` is story-only. */
export type RateCatalogKey = 'standard' | 'heavy';

/** Every rate the catalog sells in a band, before eligibility narrows it. */
export function catalogRates(band: RateBand, catalog: RateCatalogKey = 'standard'): GreenFeeRate[] {
  if (catalog === 'heavy') {
    return HEAVY_RATE_PRICING[band].map((r) => ({ ...r, id: rateId(r.name) }));
  }
  return RATE_PRICING[band].map((r) => ({
    id: rateId(r.rate),
    name: r.rate,
    p18: r.p18,
    p9: r.p9,
    rack: r.rack,
    percentOff: r.discount,
    eligibility: STANDARD_RULES[r.rate] ?? { open: true },
  }));
}

/**
 * The rates sellable for one tee time — the grid's contents.
 *
 * Narrowed by the slot itself, not by who is sitting in it: band, day of week and hole count.
 * Everything that survives is a tile, because staff can put a player on any of them. Who
 * *qualifies* is a separate question (`isEligible`), and the grid uses it to sort and group
 * rather than to hide.
 */
export function ratesForTeeTime(
  band: RateBand,
  date: Date,
  holes: 9 | 18,
  catalog: RateCatalogKey = 'standard',
): GreenFeeRate[] {
  const day = date.getDay();
  return catalogRates(band, catalog).filter((r) => {
    const e = r.eligibility;
    if (e.bands && !e.bands.includes(band)) return false;
    if (e.days && !e.days.includes(day)) return false;
    if (e.holes && !e.holes.includes(holes)) return false;
    return true;
  });
}

/**
 * Does this customer qualify for this rate on their own record?
 *
 * Takes anything carrying an eligibility rule, so green fees and transport rows answer the
 * question the same way — there is one definition of "qualifies", not two that drift.
 */
export function isEligible(rate: { eligibility: RateEligibility }, customer: Customer | null): boolean {
  const e = rate.eligibility;
  if (e.open) return true;
  if (!customer) return false;
  if (e.membersOnly && isMember(customer)) return true;
  if (e.memberships?.some((m) => customer.memberships.some((h) => h.name === m))) return true;
  // Any, not all — the same reading as `memberships` above. Requiring every listed type meant
  // a customer carrying plain `Resident` failed the Weekday Resident row, which lists two
  // spellings of the same thing.
  if (e.customerTypes?.some((t) => customer.customerTypes.includes(t))) return true;
  return false;
}

/** The rates this customer qualifies for, cheapest first — what the grid shows under Eligible. */
export const eligibleRates = (rates: GreenFeeRate[], customer: Customer | null, holes: 9 | 18): GreenFeeRate[] =>
  rates.filter((r) => isEligible(r, customer)).sort((a, b) => price(a, holes) - price(b, holes));

/** What a rate charges for a hole count. */
export const price = (rate: GreenFeeRate, holes: 9 | 18): number => (holes === 18 ? rate.p18 : rate.p9);

/**
 * The rate the system picks for a seat — "it'll automatically give you what you're supposed to
 * get". The best price the player qualifies for, falling back to the card's rack row when
 * nobody is identified, because an unlinked seat pays the public rate until someone says
 * otherwise.
 */
export function autoRate(rates: GreenFeeRate[], customer: Customer | null, holes: 9 | 18): GreenFeeRate | null {
  const eligible = eligibleRates(rates, customer, holes);
  if (eligible.length > 0) return eligible[0];
  return rates.find((r) => r.rack) ?? rates[0] ?? null;
}

export const rateById = (rates: GreenFeeRate[], id: string | undefined): GreenFeeRate | null =>
  (id ? rates.find((r) => r.id === id) : null) ?? null;

// ─── Transport ──────────────────────────────────────────────────────────────

export interface TransportRate {
  id: string;
  name: string;
  price: number;
  /** Which of the three modes the row counts as, for the group toggles and the chip glyph. */
  mode: Transport;
  /** The course's default for its mode — what the walk / ride / push toggle picks. */
  default?: boolean;
  eligibility: RateEligibility;
}

/**
 * Transport, priced.
 *
 * Note the walking row costs money. A trail fee is common and a walk/ride boolean cannot
 * express it, which is why transport had to become a catalog rather than an enum — and why the
 * icon toggle now selects a *default rate* for a mode rather than a mode itself.
 *
 * There is no punch-card row here. A punch card holds prepaid **rounds**, so it pays the green
 * fee and the cart is billed separately (`PlayerState.punch`) — the old prototype's "Free Punch
 * Cart" conflated the two, and a walker and a rider would have spent the same punch for
 * different value.
 */
export const TRANSPORT_RATES: TransportRate[] = [
  { id: 'tr-riding-cart', name: 'Riding Cart', price: 26.82, mode: 'cart', default: true, eligibility: { open: true } },
  { id: 'tr-cart-plus', name: 'Cart Plus', price: 32, mode: 'cart', eligibility: { open: true } },
  { id: 'tr-member-cart', name: 'Member Cart', price: 0, mode: 'cart', eligibility: { membersOnly: true } },
  { id: 'tr-walking', name: 'Walking', price: 8.58, mode: 'walking', default: true, eligibility: { open: true } },
  { id: 'tr-walking-member', name: 'Walking, member', price: 0, mode: 'walking', eligibility: { membersOnly: true } },
  { id: 'tr-push-cart', name: 'Push Cart', price: 6, mode: 'push', default: true, eligibility: { open: true } },
];

/** Transport rows sellable to this player — everything, with the ineligible ones marked. */
export const transportRates = (): TransportRate[] => TRANSPORT_RATES;

export const transportById = (id: string | undefined): TransportRate | null =>
  (id ? TRANSPORT_RATES.find((t) => t.id === id) : null) ?? null;

/** The row the walk / ride / push toggle selects for a mode. */
export const defaultTransportFor = (mode: Transport): TransportRate =>
  TRANSPORT_RATES.find((t) => t.mode === mode && t.default) ?? TRANSPORT_RATES[0];

/**
 * The transport row the system picks for a player: the cheapest they qualify for in the mode
 * the booking is on, so a member in a guest's group rides on the member cart without anyone
 * choosing it.
 */
export function autoTransport(mode: Transport, customer: Customer | null): TransportRate {
  const inMode = TRANSPORT_RATES.filter((t) => t.mode === mode);
  const usable = inMode.filter((t) => isEligible(t, customer));
  return usable.sort((a, b) => a.price - b.price)[0] ?? defaultTransportFor(mode);
}

/** The punch cards this customer still has rounds on — what the tile offers. */
export const usablePunchCards = (c: Customer | null) =>
  (c?.punchCards ?? []).filter((p) => p.remaining > 0);

/** Does this customer hold a punch card with anything left on it? */
export const hasPunchCard = (c: Customer | null): boolean => usablePunchCards(c).length > 0;

/**
 * Is this rate sold for that hole count?
 *
 * Used to block the 9 ↔ 18 toggle rather than reprice behind the counter's back: a seat on an
 * 18-only rate cannot be switched to nine until someone changes the rate, and the toggle says
 * so instead of silently dropping them somewhere else.
 */
export const rateAllowsHoles = (rate: GreenFeeRate | null, holes: 9 | 18): boolean =>
  !rate?.eligibility.holes || rate.eligibility.holes.includes(holes);

// ─── Discounts ──────────────────────────────────────────────────────────────

export interface DiscountPreset {
  id: string;
  label: string;
  /** `comp` zeroes the seat; `percent` takes a share off; `amount` is typed by staff. */
  kind: 'comp' | 'percent' | 'amount';
  percent?: number;
  /** Printed on the player row and the register line, so a $0 seat says why. */
  reason: string;
}

/**
 * The presets in the third tile row.
 *
 * Weston's case is "you're the son of a staff guest, let me comp you" — which has to be one tap
 * and has to leave a reason behind, because a $0 seat with no explanation is the thing an
 * owner asks about at the end of the month.
 */
export const DISCOUNT_PRESETS: DiscountPreset[] = [
  { id: 'disc-comp', label: 'Comp', kind: 'comp', reason: 'Comped' },
  { id: 'disc-50', label: '50% off', kind: 'percent', percent: 50, reason: '50% off' },
  { id: 'disc-25', label: '25% off', kind: 'percent', percent: 25, reason: '25% off' },
  { id: 'disc-employee', label: 'Employee', kind: 'comp', reason: 'Employee' },
  { id: 'disc-manual', label: 'Amount…', kind: 'amount', reason: 'Manual discount' },
];

export const discountById = (id: string | undefined): DiscountPreset | null =>
  (id ? DISCOUNT_PRESETS.find((d) => d.id === id) : null) ?? null;

/** What a discount takes off a fee. A manual amount carries its own value on the seat. */
export function discountAmount(preset: DiscountPreset | null, fee: number, manual?: number): number {
  if (!preset) return 0;
  if (preset.kind === 'comp') return fee;
  if (preset.kind === 'percent') return +((fee * (preset.percent ?? 0)) / 100).toFixed(2);
  return Math.min(fee, manual ?? 0);
}
