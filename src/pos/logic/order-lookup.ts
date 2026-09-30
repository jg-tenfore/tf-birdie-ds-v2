import type { CartItem } from '../types';
import { playerPrice } from './cart';
import { allRefundable, matchesOrder, refundedTotal, type OrderRecord, type PaymentRef } from './orders';
import type { PaymentRecord } from './restaurant';

/**
 * The arithmetic and wording of Order Lookup (V1 → V2, Wave 3). Pure, so the screen, the refund
 * dialog, Orders & Tips and their tests all say the same thing about the same order.
 */

/**
 * A tender as a person would read it off a receipt: `Card •••• 4421`, `Cash`, `Gift card`.
 * An event is named when the caller knows it, because "Event EV-301" means nothing at the counter.
 */
export function tenderLabel(method: string, ref?: PaymentRef, eventName?: string): string {
  switch (method) {
    case 'card':
      // A live payment in the prototype has no card number; placeholder dashes read as a fault.
      return ref?.cardLast4 ? `Card •••• ${ref.cardLast4}` : 'Card';
    case 'cash':
      return 'Cash';
    case 'giftcard':
      return ref?.giftCardId ? `Gift card ${ref.giftCardId}` : 'Gift card';
    case 'house':
      return 'House account';
    case 'cardonfile':
      return ref?.cardLast4 ? `Card on file •••• ${ref.cardLast4}` : 'Card on file';
    case 'event':
      return eventName ? `Event · ${eventName}` : ref?.eventId ? `Event ${ref.eventId}` : 'Event';
    default:
      return method ? method[0].toUpperCase() + method.slice(1) : '—';
  }
}

/** A tax row is a line on the order but not a thing anyone bought. */
export const isTaxLine = (l: CartItem): boolean => Boolean(l.isTax) || l.name === 'Taxes';

/**
 * What a line charged, before tax. A tee time is priced seat by seat (its fee, transport and
 * discounts), exactly as checkout's receipt prices it; a voided dish charged nothing.
 */
export function lineAmount(l: CartItem): number {
  if (l.dish?.voided) return 0;
  if (l.isCheckIn && l.players?.length) return Math.round(l.players.reduce((s, p) => s + playerPrice(l.unitPrice ?? 0, p), 0) * 100) / 100;
  return Math.round((l.price || 0) * (l.qty || 1) * 100) / 100;
}

/** The order's lines as the guest bought them — tax rows left out, indices kept for refunds. */
export const orderItems = (order: OrderRecord): { line: CartItem; index: number }[] =>
  order.lines.flatMap((line, index) => (isTaxLine(line) ? [] : [{ line, index }]));

/** "Chicken Tenders, 2× Coffee" — what a results row says was bought. Three names, then a count. */
export function lineSummary(order: OrderRecord, max = 3): string {
  const items = orderItems(order).map(({ line }) =>
    // A round is found by when it tees off as much as by what it was.
    line.isCheckIn ? (line.teeTime ? `${line.name} at ${line.teeTime.label}` : line.name) : line.qty > 1 ? `${line.qty}× ${line.name}` : line.name,
  );
  if (items.length <= max) return items.join(', ');
  return `${items.slice(0, max).join(', ')} +${items.length - max} more`;
}

/** Nothing refunded, some of it, or all of it — the badge on a results row. */
export function refundState(order: OrderRecord): 'none' | 'partial' | 'full' {
  if (!order.refunds.length) return 'none';
  return allRefundable(order).length ? 'partial' : 'full';
}

/** What is left of the order once refunds are taken off. */
export const netTotal = (order: OrderRecord): number => Math.round((order.total - refundedTotal(order)) * 100) / 100;

/**
 * Every payment id that touched each order — sales and refunds. `matchesOrder` already reads the
 * tenders' ids; a refund's payment id lives only in the ledger, and someone holding a refund slip
 * searches by it too.
 */
export function paymentIdsByOrder(payments: PaymentRecord[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const p of payments) (out[p.orderNumber] ??= []).push(p.id);
  return out;
}

/** `7:08 AM` → minutes past midnight. Anything unreadable — a time nobody recorded — is −1. */
export function clockMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return -1;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
}

/**
 * The results list: one box, matched against every field at once, live — and a date, or none.
 *
 * v1 had three stacked boxes (order ID, payment ID, product) that read as AND, behaved as OR, and
 * did nothing until SEARCH. This is what they were trying to be. Newest first, because the order
 * someone is asking about is nearly always the last few; orders with no time of payment (tee times
 * paid before the session) come after, in tee-time order.
 */
export function lookupOrders<T extends { order: OrderRecord }>(
  entries: T[],
  opts: { query: string; date: string | null; paymentIds?: Record<string, string[]> },
): T[] {
  return entries
    .filter(({ order }) => (!opts.date || order.date === opts.date) && matchesOrder(order, opts.query, opts.paymentIds))
    // Reversed before the sort, so two orders rung in the same minute still read newest first.
    .reverse()
    .sort(
      (a, b) =>
        b.order.date.localeCompare(a.order.date) ||
        clockMinutes(b.order.time) - clockMinutes(a.order.time) ||
        teeMin(a.order) - teeMin(b.order),
    );
}

const teeMin = (o: OrderRecord): number => o.lines.find((l) => l.teeTime)?.teeTime?.timeMin ?? 0;
