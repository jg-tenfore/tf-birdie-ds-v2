import { DISCOUNT_TYPES, accountingCategoryOf, type AccountingCategory, type DiscountKind, type DiscountType } from '../data/discount-types';
import { productSettings } from '../data/products';
import type { CartItem } from '../types';

/**
 * Discounts at the register (Nov 26, "checkout that's right" — V1 → V2): **all** of Buck's discount
 * kinds, on any line or on the whole order, each limited to its categories.
 *
 * Buck › Products › Discount Types has three kinds (`data/discount-types.ts`):
 *
 * - **percent** — "Senior 22%": that share off.
 * - **amount** — "Dollar Off $1": that many dollars off each one (each seat, on a round).
 * - **cost plus** — "Employee Merch Discount, cost + 15%": the price becomes the product's cost plus
 *   that share. Only where the cost is known (`data/products.ts`) — otherwise the type is not offered,
 *   never faked from the price — and only on a line, since an order has no one cost.
 *
 * A type Buck flags for approval needs a manager: the person signed in, or a manager's PIN at the
 * moment it is applied, which the discount keeps as `approvedBy`.
 *
 * A **line discount** rides on its line (`CartItem.lineDiscount`). An **order discount** — a type, or a
 * promo code — is a line of its own with its name (`CartItem.orderDiscount`), priced from the lines it
 * applies to and shown negative. Both come off before tax, so the tax is on what is charged.
 */

/** A discount as applied — Buck's type or a promo code, and who approved it. */
export interface AppliedDiscount {
  typeId?: number;
  /** The promo code it came from. */
  code?: string;
  /** "Senior · 22% off", "Dollar Off · $1.00 off each", "Cost Plus · cost + 10%". */
  label: string;
  kind: DiscountKind;
  value: number;
  /** The categories it may come off (order discounts). */
  categories?: AccountingCategory[];
  /** The manager who approved it, when the type needs one. */
  approvedBy?: string;
}

/** To the cent, half up — 31.625 is 31.63, not the 31.62 binary floating point would give. */
const cents = (n: number) => Math.round((n + Math.sign(n) * 1e-9) * 100) / 100;
const usd = (n: number) => `$${n.toFixed(2)}`;

/** How a type reads as a discount: "Senior · 22% off", "Dollar Off · $1.00 off each", "Cost Plus · cost + 10%". */
export function typeLabel(t: Pick<DiscountType, 'description' | 'kind' | 'value'>): string {
  if (t.kind === 'amount') return `${t.description} · ${usd(t.value)} off each`;
  if (t.kind === 'costPlus') return `${t.description} · cost + ${t.value}%`;
  return `${t.description} · ${t.value === 100 ? 'comped' : `${t.value}% off`}`;
}

/** Lines a discount can never touch: tax rows, markers, gift cards, payments onto an account, an event's charges. */
export function isDiscountable(l: CartItem): boolean {
  return !(l.isTax || l.name === 'Taxes' || l.name === 'Tax Exempt' || l.serviceCharge || l.orderDiscount || l.giftCard || l.accountPayment || l.eventBill || l.dish?.voided);
}

/** What a line discount takes off `gross`, to the cent, never more than the line. */
export function lineDiscountAmount(l: CartItem, gross: number): number {
  const d = l.lineDiscount;
  if (!d || gross <= 0) return 0;
  if (d.kind === 'percent') return cents(Math.min(gross, (gross * d.value) / 100));
  if (d.kind === 'amount') return cents(Math.min(gross, d.value * Math.max(1, l.qty)));
  const cost = productSettings(l.name)?.cost;
  if (cost == null || l.isCheckIn) return 0;
  const target = cents(cost * (1 + d.value / 100));
  return cents(Math.max(0, Math.min(gross, (l.price - target) * l.qty)));
}

/** What an order discount takes off its eligible lines' `base` (already net of line discounts). */
export function orderDiscountAmount(d: AppliedDiscount, base: number): number {
  if (base <= 0) return 0;
  if (d.kind === 'percent') return cents(Math.min(base, (base * d.value) / 100));
  if (d.kind === 'amount') return cents(Math.min(base, d.value));
  return 0;
}

/** Whether a line is in a discount's categories. */
export const inCategories = (l: CartItem, categories: readonly AccountingCategory[] | undefined): boolean => {
  if (!categories) return true;
  const c = accountingCategoryOf(l);
  return c != null && categories.includes(c);
};

/** One type as the register offers it: applicable, and whether it needs a manager. */
export interface DiscountOffer {
  type: DiscountType;
  label: string;
  needsManager: boolean;
}

/**
 * The Buck types a **line** can take: every kind whose categories include the line's; cost plus only
 * when the product's cost is known, and not on a round.
 */
export function lineDiscountOffers(l: CartItem, isManager: boolean): DiscountOffer[] {
  if (!isDiscountable(l) || l.dish) return [];
  const category = accountingCategoryOf(l);
  if (!category) return [];
  const cost = productSettings(l.name)?.cost;
  return DISCOUNT_TYPES.filter((t) => t.categories.includes(category))
    .filter((t) => t.kind !== 'costPlus' || (cost != null && !l.isCheckIn && cost * (1 + t.value / 100) < l.price))
    .map((type) => ({ type, label: typeLabel(type), needsManager: type.approval && !isManager }));
}

/**
 * The Buck types the **whole order** can take: percent and amount types that apply to at least one
 * line on it. Cost plus is per line — an order has no one cost — so it is not offered here.
 */
export function orderDiscountOffers(cart: CartItem[], isManager: boolean): DiscountOffer[] {
  const cats = new Set(cart.filter(isDiscountable).map(accountingCategoryOf).filter(Boolean));
  return DISCOUNT_TYPES.filter((t) => t.kind !== 'costPlus' && t.categories.some((c) => cats.has(c))).map((type) => ({
    type,
    label: typeLabel(type),
    needsManager: type.approval && !isManager,
  }));
}

/** A Buck type, applied. */
export const applied = (t: DiscountType, approvedBy?: string): AppliedDiscount => ({
  typeId: t.id,
  label: typeLabel(t),
  kind: t.kind,
  value: t.value,
  categories: t.categories,
  ...(approvedBy && { approvedBy }),
});

/**
 * Every line's charge before tax with the register's discounts taken off, index for index with the
 * cart — line discounts first, then each order discount shared across the lines it applies to by what
 * they charge. Also what each discount came to, for the lines that show them.
 */
export function discountedNets(
  cart: CartItem[],
  payable: (l: CartItem) => number,
): { nets: number[]; lineOff: number[]; orderOff: Record<number, number> } {
  // `payable` charges nothing for a tax row or a marker; a gift card or an account payment charges in full.
  const nets = cart.map((l) => payable(l));
  const lineOff = cart.map((l, i) => (isDiscountable(l) ? lineDiscountAmount(l, nets[i]) : 0));
  for (let i = 0; i < nets.length; i++) nets[i] = cents(nets[i] - lineOff[i]);
  const orderOff: Record<number, number> = {};
  cart.forEach((l, i) => {
    const d = l.orderDiscount;
    if (!d) return;
    const weights = cart.map((x, j) => (isDiscountable(x) && inCategories(x, d.categories) ? Math.max(0, nets[j]) : 0));
    const base = cents(weights.reduce((s, w) => s + w, 0));
    const off = orderDiscountAmount(d, base);
    orderOff[i] = off;
    if (!off) return;
    // Shared by what each line charges, to the cent.
    let left = off;
    const idx = weights.map((w, j) => (w > 0 ? j : -1)).filter((j) => j >= 0);
    idx.forEach((j, k) => {
      const share = k === idx.length - 1 ? left : cents((weights[j] / base) * off);
      nets[j] = cents(nets[j] - share);
      left = cents(left - share);
    });
  });
  return { nets, lineOff, orderOff };
}

/** The discounts on an order by name, for the receipt: each line's and each order discount's. */
export function discountLines(cart: CartItem[], payable: (l: CartItem) => number): { id: string; label: string; amount: number }[] {
  const { lineOff, orderOff } = discountedNets(cart, payable);
  const out: { id: string; label: string; amount: number }[] = [];
  cart.forEach((l, i) => {
    if (lineOff[i] > 0 && l.lineDiscount) out.push({ id: `line-${i}`, label: `${l.lineDiscount.label} · ${l.name}`, amount: -lineOff[i] });
    if (l.orderDiscount && (orderOff[i] ?? 0) > 0) out.push({ id: `order-${i}`, label: l.orderDiscount.label, amount: -orderOff[i] });
  });
  return out;
}

// ─── Promo codes ────────────────────────────────────────────────────────────

/** A promo code, as an order discount. */
export const promoDiscount = (p: import('../data/promo-codes').PromoCode): AppliedDiscount => ({
  code: p.code,
  label: p.label,
  kind: p.kind,
  value: p.value,
  categories: p.categories,
});

/**
 * Why `code` cannot go on this order, or `null`: it is unknown, expired, the order already has a code,
 * nothing on it is in the code's categories, or it is short of the code's minimum.
 */
export function promoProblem(
  code: string,
  cart: CartItem[],
  payable: (l: CartItem) => number,
  lookup: (code: string) => import('../data/promo-codes').PromoCode | undefined,
  expired: (p: import('../data/promo-codes').PromoCode) => boolean,
): string | null {
  const c = code.trim().toUpperCase();
  if (!c) return 'Type or scan a code.';
  const p = lookup(c);
  if (!p) return `No promo code “${c}”.`;
  if (expired(p)) return `${p.code} expired on ${p.expires}.`;
  const already = cart.find((l) => l.orderDiscount?.code);
  if (already) return `This order already has ${already.orderDiscount!.code} — one code an order.`;
  const { nets } = discountedNets(cart, payable);
  const base = cents(cart.reduce((s, l, i) => (isDiscountable(l) && inCategories(l, p.categories) ? s + Math.max(0, nets[i]) : s), 0));
  if (base <= 0) return `Nothing on this order is something ${p.code} is for (${p.categories.join(', ').toLowerCase()}).`;
  if (p.minimum && base < p.minimum) return `${p.code} needs ${usd(p.minimum)} of ${p.categories.join(', ').toLowerCase()}; this order has ${usd(base)}.`;
  return null;
}
