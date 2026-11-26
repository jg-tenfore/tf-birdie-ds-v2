import { SERVICE_CHARGES, TAX_RATE_FIELDS, TAX_SERVICE_CHARGES, TAX_TYPES, type ServiceChargeId, type TaxField, type TaxType } from '../data/buck-club';
import { CATALOG } from '../data/catalog';
import { menuItem } from '../data/menu';
import { productSettings } from '../data/products';
import type { CartItem } from '../types';

/**
 * Buck's pricing at the register (Nov 26, "checkout that's right" — V1 → V2): **tax per line** by
 * Buck's tax types, and Buck's **service charges** as lines of their own.
 *
 * The register used to charge one sales-tax rate on everything that was not a tee-sheet round. Buck
 * sets a tax per kind of line — tee fee, transportation, open food, open liquor — each with a stacking
 * Tax Rate 2, and a product can carry its own. This is that model:
 *
 * 1. **What kind of line** (`taxFieldOf`): a green fee, a cart, food from a menu, a beer — by the
 *    product's own settings first (`data/products.ts`), then by Birdie's catalog category, the way
 *    a Buck product without its own takes its kind's rate. A round's green fee and its cart are two
 *    kinds, so a seat is taxed as both.
 * 2. **The rate** is that kind's Tax Rate plus its Tax Rate 2 (`TAX_RATE_FIELDS`). A line of no kind
 *    takes the default tax type — the rate Settings shows as the terminal's sales tax.
 * 3. **Service charges** (`SERVICE_CHARGES`): the F&B charge on a table's tab, the event charge on an
 *    event's bill, and any added by hand — each its own line. Untaxed unless the club turns on Buck's
 *    **Tax service charges** (`ClubPricing.taxServiceCharges`): then a food-and-drink charge is taxed
 *    at the Food Tax rate and any other at the sales tax.
 *
 * **One tax model everywhere** (Nov 26 decision): a tee time from the sheet is taxed like a round rung
 * up at the counter — its green fees at the tee-fee rate, its carts at transportation. The booking's
 * flat per-seat `Taxes` line still rides along (the archived edition charges it), but here it charges
 * nothing. A gift card, a payment onto a house account and an event's already-taxed charges carry no
 * tax, as before. A Tax Exempt line zeroes tax.
 *
 * Everything is computed **per line** first and summed, so a credit, a split by item or a refund can
 * take any line's exact share (`priceOrder(...).lines`) and the parts always add up to the total.
 */

/** Buck's club pricing: tax types, the per-kind fields, the service-charge percentages. */
export interface ClubPricing {
  taxTypes: TaxType[];
  fields: Record<TaxField, { tax: string; tax2: string | null }>;
  serviceCharges: Record<ServiceChargeId, number>;
  /** Buck › Taxes & Fees › **Tax service charges**. Off by default: each club follows its state's rule. */
  taxServiceCharges: boolean;
}

/** The club as Buck configures it (`buck-club.ts`). A story can push other values, as Buck would. */
export const clubPricingDefaults = (): ClubPricing => ({
  taxTypes: TAX_TYPES.map((t) => ({ ...t })),
  fields: Object.fromEntries(TAX_RATE_FIELDS.map((f) => [f.field, { tax: f.tax, tax2: f.tax2 }])) as ClubPricing['fields'],
  serviceCharges: Object.fromEntries(SERVICE_CHARGES.map((c) => [c.id, c.percent])) as Record<ServiceChargeId, number>,
  taxServiceCharges: TAX_SERVICE_CHARGES,
});

/** How an order is priced in V1 → V2: Buck's club pricing, the terminal's sales tax, and what kind of order it is. */
export interface Pricing {
  kind: 'buck';
  club: ClubPricing;
  /** The default tax type's rate — Settings' sales tax. */
  salesRate: number;
  /** A table's tab: the F&B Service Charge applies to its food and drink. */
  dineIn?: boolean;
  /** An event's bill: the Event Service Charge applies. */
  eventBill?: boolean;
}

/** The current edition's pricing at the club's defaults — what V1 → V2 charges, for tests and stories. */
export const buckPricing = (extra: Partial<Omit<Pricing, 'kind'>> = {}): Pricing => ({
  kind: 'buck',
  club: clubPricingDefaults(),
  salesRate: TAX_TYPES.find((t) => t.isDefault)?.rate ?? 0.08,
  ...extra,
});

export const isPricing = (p: unknown): p is Pricing => typeof p === 'object' && p !== null && (p as Pricing).kind === 'buck';

/** A service charge on the order — added by hand, or by Buck's rule. */
export interface CartServiceCharge {
  id: ServiceChargeId | 'custom';
  label: string;
  /** A percentage of what it applies to… */
  percent?: number;
  /** …or a flat amount. */
  amount?: number;
  /** Food and drink only, or the whole order. */
  appliesTo: 'fnb' | 'all';
}

const cents = (n: number) => Math.round(n * 100) / 100;
const isTaxRow = (l: CartItem) => Boolean(l.isTax) || l.name === 'Taxes';

const CATALOG_CATEGORY: Map<string, string> = new Map(Object.entries(CATALOG).flatMap(([cat, def]) => def.items.map((i) => [i.n, cat] as const)));

/** The register's rentals that are transport, taxed as a cart. */
const TRANSPORT_RENTALS = new Set(['Riding Cart 18', 'Riding Cart 9', 'Pull Cart']);

/** A part of a line, by the kind Buck taxes it as. `null` is "no kind" — the default tax type. */
export interface TaxPart {
  field: TaxField | null;
  /** What this part charges, before tax. */
  amount: number;
  /** The product's own tax, overriding the kind's. */
  own?: { tax?: string; tax2?: string | null };
}

/** Whether a line carries tax at all. */
export function isTaxable(line: CartItem): boolean {
  return !(isTaxRow(line) || line.giftCard || line.accountPayment || line.eventBill || line.serviceCharge || line.orderDiscount || line.name === 'Tax Exempt');
}

/** The kind of a catalog or menu line by name, when it is one of Buck's four. */
function fieldOfName(line: CartItem): TaxField | null {
  if (line.dish) {
    const item = menuItem(line.dish.menuItemId);
    return item && (item.category === 'Beer' || item.category === 'Wine') ? 'liquor' : 'food';
  }
  if (TRANSPORT_RENTALS.has(line.name)) return 'transportation';
  const cat = CATALOG_CATEGORY.get(line.name);
  if (cat === 'ALCOHOL') return 'liquor';
  if (cat === 'SNACKS' || cat === 'DRINKS') return 'food';
  if (cat === 'CHECK IN' || cat === 'PACKAGES') return 'teeFee';
  return null;
}

/**
 * A line split into the kinds Buck taxes: a round's green fees and its carts; a combo's components
 * by their own kinds, shared out of the combo price by list price; anything else whole.
 */
export function taxPartsOf(line: CartItem, net: number): TaxPart[] {
  if (!isTaxable(line) || net === 0) return [];
  const own = productSettings(line.name);
  const ownTax = own && (own.tax !== undefined || own.tax2 !== undefined) ? { tax: own.tax, tax2: own.tax2 } : undefined;
  if (line.isCheckIn && line.players?.length) {
    let fee = 0;
    let transport = 0;
    for (const p of line.players) {
      if (p.paid || p.noShow) continue;
      let f = p.fee ?? line.unitPrice ?? 0;
      let t = 0;
      for (const tag of p.modifierTags ?? []) {
        if (tag.isTransport) t = tag.p;
        else if (tag.isDiscount) f += tag.p;
        else f = tag.p;
      }
      fee += Math.max(0, f);
      transport += t;
    }
    const gross = fee + transport;
    if (gross <= 0) return [];
    // Any discount on the line (`net` below the seats' charge) comes off both parts in proportion.
    const k = net / gross;
    return [
      { field: 'teeFee' as const, amount: fee * k, own: ownTax },
      { field: 'transportation' as const, amount: transport * k },
    ].filter((p) => p.amount !== 0);
  }
  if (line.isCheckIn || line.resourceBookingId) return [{ field: line.isCheckIn ? 'teeFee' : null, amount: net, own: ownTax }];
  if (line.combo) {
    const list = line.combo.components.reduce((s, c) => s + c.p * c.qty, 0);
    if (list > 0) {
      return line.combo.components.map((c) => ({
        field: fieldOfName({ name: c.name, price: c.p, qty: c.qty }),
        amount: (c.p * c.qty * net) / list,
      }));
    }
  }
  return [{ field: fieldOfName(line), amount: net, own: ownTax }];
}

const defaultType = (p: Pricing) => p.club.taxTypes.find((t) => t.isDefault)?.id ?? 'sales';

/**
 * The type a line is charged under. A type set to **Same as sales tax** (Food Tax, until Buck gives it
 * a rate of its own) is charged as the default type — one Sales Tax line, not two at the same rate.
 */
export function chargedType(id: string, p: Pricing): string {
  const t = p.club.taxTypes.find((x) => x.id === id);
  return t?.sameAsDefault ? defaultType(p) : id;
}

/** The tax types a part is charged — its kind's Tax Rate and Tax Rate 2, or the product's own. */
function typesFor(part: TaxPart, p: Pricing): string[] {
  const def = defaultType(p);
  const charged = (ids: (string | null | undefined)[]) => [...new Set(ids.filter((x): x is string => Boolean(x)).map((x) => chargedType(x, p)))];
  if (part.own) {
    const base = part.own.tax ?? (part.field ? p.club.fields[part.field].tax : def);
    const second = part.own.tax2 !== undefined ? part.own.tax2 : part.field ? p.club.fields[part.field].tax2 : null;
    return charged([base, second]);
  }
  if (!part.field) return [def];
  const f = p.club.fields[part.field];
  return charged([f.tax, f.tax2]);
}

/** A tax type's rate: the default type is the terminal's sales tax (Settings), and so is one set Same as sales tax. */
export function taxRateOfType(id: string, p: Pricing): number {
  const t = p.club.taxTypes.find((x) => x.id === id);
  if (!t) return 0;
  return t.isDefault || t.sameAsDefault ? p.salesRate : t.rate;
}

/** "Sales Tax 8%", "Alcohol Tax 6.7%" — how a tax line reads on the order and the receipt. */
export function taxTypeName(id: string, p: Pricing): string {
  const t = p.club.taxTypes.find((x) => x.id === id);
  const rate = taxRateOfType(id, p) * 100;
  return `${t?.name ?? id} ${+rate.toFixed(3)}%`;
}

/** One line of the order, priced. */
export interface PricedLine {
  /** What it charges before tax — discounts off. */
  net: number;
  /** Its tax, by tax type. */
  taxes: Record<string, number>;
  /** Its share of the service charges. */
  service: number;
  /** `net + tax + service`. */
  total: number;
}

export interface PricedOrder {
  lines: PricedLine[];
  /** Tax by type, rounded per type. */
  taxes: { id: string; label: string; amount: number }[];
  service: { id: string; label: string; amount: number }[];
  /** Sum of the lines' charges before tax. */
  goods: number;
  tax: number;
  serviceTotal: number;
  exempt: boolean;
  total: number;
}

/** What a line charges before tax and service: its price, less any discount on it. */
export type NetOf = (line: CartItem, index: number) => number;

/**
 * The order, priced by Buck's rules. `netOf` is each line's charge before tax (the cart module passes
 * one with discounts applied); tax rows, service-charge lines and the Tax Exempt marker charge nothing
 * themselves.
 */
export function priceOrder(cart: CartItem[], p: Pricing, netOf: NetOf): PricedOrder {
  const exempt = cart.some((l) => l.name === 'Tax Exempt');
  const net = cart.map((l, i) => (isTaxRow(l) || l.serviceCharge || l.orderDiscount || l.name === 'Tax Exempt' ? 0 : cents(netOf(l, i))));
  const goods = cents(net.reduce((s, n) => s + n, 0));

  // ── Service charges — first, because the club may tax them ──
  const isFnb = (l: CartItem) => {
    const f = fieldOfName(l);
    return Boolean(l.dish) || f === 'food' || f === 'liquor' || Boolean(l.combo && taxPartsOf(l, 1).some((x) => x.field === 'food' || x.field === 'liquor'));
  };
  const charges: { id: string; label: string; weights: number[]; amount: number; fnb: boolean }[] = [];
  const pct = (base: number[], percent: number) => cents((base.reduce((s, x) => s + x, 0) * percent) / 100);
  const fnbBase = cart.map((l, i) => (isFnb(l) ? net[i] : 0));
  const allBase = net.map((n, i) => (cart[i].giftCard || cart[i].accountPayment ? 0 : n));
  if (p.dineIn && p.club.serviceCharges.fnb > 0 && !cart.some((l) => l.serviceCharge?.id === 'fnb')) {
    const amount = pct(fnbBase, p.club.serviceCharges.fnb);
    if (amount) charges.push({ id: 'fnb', label: `F&B Service Charge ${p.club.serviceCharges.fnb}%`, weights: fnbBase, amount, fnb: true });
  }
  if (p.eventBill && p.club.serviceCharges.event > 0 && !cart.some((l) => l.serviceCharge?.id === 'event')) {
    const amount = pct(allBase, p.club.serviceCharges.event);
    if (amount) charges.push({ id: 'event', label: `Event Service Charge ${p.club.serviceCharges.event}%`, weights: allBase, amount, fnb: false });
  }
  cart.forEach((l, i) => {
    const sc = l.serviceCharge;
    if (!sc) return;
    const base = sc.appliesTo === 'fnb' ? fnbBase : allBase;
    const amount = sc.amount != null ? cents(sc.amount) : pct(base, sc.percent ?? 0);
    if (!amount) return;
    // A flat charge with nothing to hang off sits on its own line.
    const weights = base.some((x) => x) ? base : cart.map((_, j) => (j === i ? 1 : 0));
    charges.push({ id: `${sc.id}-${i}`, label: sc.percent != null ? `${sc.label} ${sc.percent}%` : sc.label, weights, amount, fnb: sc.appliesTo === 'fnb' });
  });
  const lineService = cart.map(() => 0);
  const shares = charges.map((c) => allocate(c.amount, c.weights));
  shares.forEach((share) => share.forEach((a, i) => (lineService[i] = cents(lineService[i] + a))));

  // ── Tax, per line and type ──
  // Every line by its parts — a tee time from the sheet too: its green fees at the tee-fee rate, its
  // carts at transportation. The booking's own flat `Taxes` line charges nothing here.
  const raw: Record<string, number[]> = {};
  const add = (id: string, i: number, amount: number) => {
    const rate = taxRateOfType(id, p);
    if (rate) (raw[id] ??= cart.map(() => 0))[i] += amount * rate;
  };
  if (!exempt) {
    cart.forEach((l, i) => {
      for (const part of taxPartsOf(l, net[i])) for (const id of typesFor(part, p)) add(id, i, part.amount);
    });
    // Buck's Tax service charges: a food-and-drink charge at the Food Tax rate, any other at sales tax.
    if (p.club.taxServiceCharges) {
      const foodType = chargedType(p.club.fields.food.tax, p);
      charges.forEach((c, k) => shares[k].forEach((a, i) => a && add(c.fnb ? foodType : defaultType(p), i, a)));
    }
  }
  const taxes: PricedOrder['taxes'] = [];
  const lineTax: Record<string, number>[] = cart.map(() => ({}));
  for (const t of p.club.taxTypes) {
    const r = raw[t.id];
    if (!r) continue;
    const total = cents(r.reduce((s, x) => s + x, 0));
    if (!total) continue;
    taxes.push({ id: t.id, label: taxTypeName(t.id, p), amount: total });
    allocate(total, r).forEach((a, i) => a && (lineTax[i][t.id] = a));
  }

  const tax = cents(taxes.reduce((s, t) => s + t.amount, 0));
  const serviceTotal = cents(charges.reduce((s, c) => s + c.amount, 0));
  const total = cents(goods + tax + serviceTotal);
  const lines = cart.map((_, i) => {
    const lt = Object.values(lineTax[i]).reduce((s, x) => s + x, 0);
    return { net: net[i], taxes: lineTax[i], service: lineService[i], total: cents(net[i] + lt + lineService[i]) };
  });
  // Rounding: the lines add up to the total, to the cent.
  const left = cents(total - lines.reduce((s, l) => s + l.total, 0));
  if (left && lines.length) {
    let at = 0;
    lines.forEach((l, i) => {
      if (Math.abs(l.total) > Math.abs(lines[at].total)) at = i;
    });
    lines[at] = { ...lines[at], total: cents(lines[at].total + left) };
  }
  return {
    lines,
    taxes,
    service: charges.map((c) => ({ id: c.id, label: c.label, amount: c.amount })),
    goods,
    tax,
    serviceTotal,
    exempt,
    total,
  };
}

/** `amount` split across `weights` to the cent, the rounding cent on the heaviest. */
function allocate(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!sum || !amount) return weights.map(() => 0);
  const parts = weights.map((w) => cents((w / sum) * amount));
  const left = cents(amount - parts.reduce((s, x) => s + x, 0));
  if (left) {
    let at = 0;
    weights.forEach((w, i) => {
      if (Math.abs(w) > Math.abs(weights[at])) at = i;
    });
    parts[at] = cents(parts[at] + left);
  }
  return parts;
}

/** The card surcharge on `amount` — Buck's Credit Card Surcharge, 0% at this club. */
export const cardSurcharge = (amount: number, p: number | Pricing): number =>
  isPricing(p) && p.club.serviceCharges.card > 0 ? cents((amount * p.club.serviceCharges.card) / 100) : 0;
