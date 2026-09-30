import type { CartItem } from '../types';

/**
 * A paid order, as it was sold (V1 → V2, Wave 3) — what Order Lookup finds and refunds.
 *
 * Wave 2's payment ledger records *payments*: a method, an amount, a tip. A refund needs the *order*
 * behind them — what was bought, at what price, with what tax — so each paid order is now kept whole,
 * lines and all, with the payments that settled it. One order can have several payments (a gift card
 * for part, a card for the rest), which is why the two are separate records that point at each other.
 *
 * Justin's choice for Order Lookup: **find, view and refund** — the whole order or chosen lines, back
 * to the original tender. No reopening a paid order onto the register.
 */

export interface PaymentRef {
  customerId?: string;
  giftCardId?: string;
  eventId?: string;
  cardLast4?: string;
}

export interface OrderTender {
  paymentId: string;
  method: string;
  amount: number;
  ref?: PaymentRef;
}

export interface RefundRecord {
  id: string;
  date: string;
  time: string;
  staffId: string;
  /** Which lines, by index into `OrderRecord.lines`, and how many of each. */
  lines: { index: number; qty: number }[];
  /** Goods plus their share of the tax. Positive — it is recorded as money going back. */
  amount: number;
  /** The tender it went back to — the largest part, when it was split. */
  method: string;
  ref?: PaymentRef;
  paymentId: string;
  reason?: string;
  /**
   * Where each dollar went, when the order was paid by more than one tender. `tender` indexes
   * `OrderRecord.tenders`; `paymentId` is the refund's own (negative) payment. Absent on a refund
   * to a single tender, which `method` / `ref` / `paymentId` describe whole.
   */
  parts?: RefundPart[];
}

export interface RefundPart {
  tender: number;
  method: string;
  ref?: PaymentRef;
  amount: number;
  paymentId: string;
}

export interface OrderRecord {
  orderNumber: string;
  date: string;
  time: string;
  staffId: string;
  /** How a person would find it again: "Table 3 · Delgado", "Pro Shop", "Counter". */
  label: string;
  lines: CartItem[];
  /** Before tax. */
  subtotal: number;
  tax: number;
  /** Subtotal plus tax — what was charged, tip aside. */
  total: number;
  tip: number;
  tenders: OrderTender[];
  refunds: RefundRecord[];
  tabId?: string;
  bookingId?: string;
  customerId?: string;
  eventId?: string;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** How many of a line have already been refunded. */
export const refundedQty = (order: OrderRecord, index: number): number =>
  order.refunds.reduce((n, r) => n + r.lines.filter((l) => l.index === index).reduce((m, l) => m + l.qty, 0), 0);

/**
 * How many of a line can still be refunded. A voided dish cost nothing and a tax row is not a thing
 * anyone bought, so neither is refundable on its own.
 */
export function refundableQty(order: OrderRecord, index: number): number {
  const l = order.lines[index];
  if (!l || l.isTax || l.name === 'Taxes' || l.dish?.voided || !(l.price > 0 || (l.unitPrice ?? 0) > 0)) return 0;
  return Math.max(0, l.qty - refundedQty(order, index));
}

/** One unit of a line, before tax. */
const unitOf = (l: CartItem) => (l.isCheckIn ? (l.unitPrice ?? l.price) : l.price);

/**
 * What refunding `picks` gives back: the goods, plus their proportional share of the order's tax.
 * Proportional rather than recomputed, so refunding every line one at a time adds up to exactly what
 * a whole-order refund would — to the cent.
 */
export function refundAmount(order: OrderRecord, picks: { index: number; qty: number }[]): number {
  const goods = picks.reduce((s, p) => {
    const l = order.lines[p.index];
    const qty = Math.min(p.qty, refundableQty(order, p.index));
    return l ? s + unitOf(l) * qty : s;
  }, 0);
  const tax = order.subtotal > 0 ? (goods / order.subtotal) * order.tax : 0;
  return cents(goods + tax);
}

/** Everything still refundable, as picks — what "Refund the whole order" means. */
export const allRefundable = (order: OrderRecord): { index: number; qty: number }[] =>
  order.lines.map((_, index) => ({ index, qty: refundableQty(order, index) })).filter((p) => p.qty > 0);

/** What has gone back already. */
export const refundedTotal = (order: OrderRecord): number => cents(order.refunds.reduce((s, r) => s + r.amount, 0));

/**
 * Where a refund goes: back to the tender that paid the most, so a $5 gift card and a $95 card
 * refunds to the card. Ties go to the last tender — the one the customer finished with. What a
 * one-line summary names; `refundSplit` decides where the money actually goes.
 */
export function refundTender(order: OrderRecord): OrderTender | undefined {
  return order.tenders.reduce<OrderTender | undefined>((best, t) => (!best || t.amount >= best.amount ? t : best), undefined);
}

/** What each tender has had back already, by index. */
function refundedByTender(order: OrderRecord): number[] {
  const back = order.tenders.map(() => 0);
  for (const r of order.refunds) {
    if (r.parts) for (const p of r.parts) back[p.tender] += p.amount;
    else {
      const i = order.tenders.findIndex((t) => t.method === r.method && t.ref?.giftCardId === r.ref?.giftCardId);
      back[i >= 0 ? i : order.tenders.length - 1] += r.amount;
    }
  }
  return back;
}

/**
 * Where a refund's money goes, when an order was paid by more than one tender.
 *
 * "Back to the original tender" has to mean *each* original tender. Sending it all to the one that
 * paid most — the first cut — put a $28 refund on a gift card that had paid $17 of it, including the
 * two beers the card was not allowed to buy. So:
 *
 * - **Gift cards first, but only up to `cardShare`** — the part of the refund a card was good for
 *   (the reducer works it out from the cards' categories). The beers never go on a card.
 * - **The rest to the other tenders, last first.** On a split, the last tender is the one that paid
 *   what the earlier ones could not.
 * - **No tender gets back more than it paid**, less what it has had back already.
 *
 * Refunding a whole order therefore returns exactly what each tender paid.
 */
export function refundSplit(order: OrderRecord, amount: number, cardShare = 0): { tender: number; amount: number }[] {
  const back = refundedByTender(order);
  const room = order.tenders.map((t, i) => cents(Math.max(0, t.amount - back[i])));
  const out = order.tenders.map(() => 0);
  let left = cents(amount);
  let cardLeft = cents(Math.min(cardShare, amount));
  order.tenders.forEach((t, i) => {
    if (t.method !== 'giftcard' || left <= 0) return;
    const give = cents(Math.min(room[i], cardLeft, left));
    out[i] += give;
    room[i] = cents(room[i] - give);
    cardLeft = cents(cardLeft - give);
    left = cents(left - give);
  });
  for (let i = order.tenders.length - 1; i >= 0 && left > 0; i--) {
    if (order.tenders[i].method === 'giftcard') continue;
    const give = cents(Math.min(room[i], left));
    out[i] += give;
    left = cents(left - give);
  }
  // Rounding, or an order whose only room left is on a card: the last tender takes the cent.
  if (left > 0 && out.length) out[out.length - 1] = cents(out[out.length - 1] + left);
  return out.map((a, tender) => ({ tender, amount: cents(a) })).filter((p) => p.amount > 0);
}

/**
 * Search across every field at once. v1's Order Lookup stacked three identical boxes — order ID,
 * payment ID, product — that read as AND and behaved as OR, and ran nothing until SEARCH. One box
 * that matches any of them, live, is what those three were trying to be.
 */
export function matchesOrder(order: OrderRecord, query: string, paymentIds: Record<string, string[]> = {}): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return true;
  const hay = [
    order.orderNumber.replace(/^#/, ''),
    order.label,
    ...order.lines.map((l) => l.name),
    ...order.tenders.map((t) => t.paymentId),
    ...order.tenders.map((t) => t.ref?.cardLast4 ?? ''),
    ...(paymentIds[order.orderNumber] ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}
