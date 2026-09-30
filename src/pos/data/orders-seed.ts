import type { CartItem } from '../types';
import { orderTotals } from '../logic/cart';
import type { OrderRecord } from '../logic/orders';
import { dishLine, type PaymentRecord } from '../logic/restaurant';
import { DEMO_TODAY } from './bookings';
import { CATALOG } from './catalog';
import { toDateStr } from './courses';
import { menuItem } from './menu';

/**
 * The morning's orders, and the payments that settled them (V1 → V2, Waves 2–3).
 *
 * Wave 2 seeded fifteen payments with hand-written amounts, because the ledger held payments and
 * nothing else. Order Lookup needs to see *what was bought*, and a refund needs the lines — so the
 * payments are now derived from orders: each order's lines are real catalog and menu items, its total
 * is the register's own arithmetic, and its payment is exactly that total. A payment cannot disagree
 * with the order it paid for, because it is computed from it.
 */

const DAY = toDateStr(DEMO_TODAY());

const catalogPrice = new Map(Object.values(CATALOG).flatMap((c) => c.items.map((i) => [i.n, i.p] as const)));

/** A register line for a catalog item. */
function item(name: string, qty = 1): CartItem {
  const p = catalogPrice.get(name);
  if (p == null) throw new Error(`orders seed: no catalog item "${name}"`);
  return { name, price: p, qty };
}

let seq = 0;
/** A dish, already sent — these orders are finished. */
function dish(id: string, qty = 1): CartItem {
  const m = menuItem(id);
  if (!m) throw new Error(`orders seed: no menu item "${id}"`);
  seq += 1;
  const l = dishLine(m, [], { lineId: `L-S${String(seq).padStart(3, '0')}`, qty });
  return { ...l, dish: { ...l.dish!, sentAt: 'earlier' } };
}

type Spec = {
  time: string;
  method: 'card' | 'cash';
  /** Tip as a share of the total — or a fixed amount, for cash. */
  tipPct?: number;
  tip?: number;
  last4?: string;
  staffId: string;
  label: string;
  lines: CartItem[];
};

const SPECS: Spec[] = [
  { time: '7:08 AM', method: 'card', tipPct: 18, last4: '4421', staffId: 's-3', label: 'Counter', lines: [dish('counter-chicken-tenders'), item('Coffee', 2)] },
  { time: '7:22 AM', method: 'card', tipPct: 20, last4: '0187', staffId: 's-3', label: 'Counter', lines: [dish('counter-clubhouse-blt', 2), item('Iced Tea', 2)] },
  { time: '7:40 AM', method: 'cash', tip: 0, staffId: 's-3', label: 'Counter', lines: [item('Hot Dog'), item('Soda'), item('Chips')] },
  { time: '7:55 AM', method: 'card', tipPct: 18, last4: '7730', staffId: 's-2', label: 'Counter', lines: [dish('counter-nashville-hot-chicken-sandwich', 2), dish('counter-basket-of-fries'), item('Gatorade', 2)] },
  { time: '8:10 AM', method: 'card', tipPct: 0, last4: '2215', staffId: 's-6', label: 'Pro Shop', lines: [item('Titleist Pro V1 Sleeve', 2), item('Golf Glove Mens')] },
  { time: '8:31 AM', method: 'card', tipPct: 18, last4: '9054', staffId: 's-3', label: 'Counter', lines: [dish('counter-southwest-chicken-wrap'), item('Smoothie')] },
  { time: '8:52 AM', method: 'card', tipPct: 19, last4: '3368', staffId: 's-2', label: 'Counter', lines: [dish('counter-clubhouse-cheeseburger', 2), dish('counter-basket-of-fries', 2), item('Soda', 2)] },
  { time: '9:15 AM', method: 'cash', tip: 2, staffId: 's-4', label: 'Bar', lines: [item('Beer Domestic', 2)] },
  { time: '9:40 AM', method: 'card', tipPct: 0, last4: '6612', staffId: 's-6', label: 'Pro Shop', lines: [item('Golf Polo Course Logo'), item('Titleist Pro V1 Box')] },
  { time: '10:02 AM', method: 'card', tipPct: 18, last4: '1149', staffId: 's-3', label: 'Counter', lines: [dish('counter-meatball-marinara'), dish('counter-roast-beef-cheddar'), item('Water', 2)] },
  { time: '10:26 AM', method: 'card', tipPct: 0, last4: '8820', staffId: 's-2', label: 'Counter', lines: [item('Energy Drink', 2), item('Pretzel', 2)] },
  { time: '10:48 AM', method: 'card', tipPct: 20, last4: '5503', staffId: 's-2', label: 'Counter', lines: [dish('counter-lobster-roll-fries', 2), dish('counter-josh-cabernet-sauvignon', 2)] },
  { time: '11:05 AM', method: 'card', tipPct: 19, last4: '2276', staffId: 's-4', label: 'Bar', lines: [dish('counter-sapporo-premium', 3), dish('counter-basket-of-fries')] },
  { time: '11:20 AM', method: 'card', tipPct: 20, last4: '4410', staffId: 's-4', label: 'Bar', lines: [dish('counter-miller-lite', 2)] },
  { time: '11:37 AM', method: 'card', tipPct: 18, last4: '9981', staffId: 's-3', label: 'Counter', lines: [dish('counter-clubhouse-cheeseburger'), dish('counter-crispy-chicken-sandwich'), dish('counter-corona-extra', 2)] },
];

const cents = (n: number) => Math.round(n * 100) / 100;

const built = SPECS.map((s, i) => {
  const t = orderTotals(s.lines);
  const tip = s.tip ?? cents((t.total * (s.tipPct ?? 0)) / 100);
  const orderNumber = `#A-${String(20400 + i * 37).padStart(5, '0')}`;
  const paymentId = `P-${2001 + i}`;
  const ref = s.last4 ? { cardLast4: s.last4 } : undefined;
  const payment: PaymentRecord = {
    id: paymentId,
    date: DAY,
    time: s.time,
    method: s.method,
    amount: t.total,
    tip,
    cardLast4: s.last4,
    orderNumber,
    staffId: s.staffId,
    kind: 'sale',
    ref,
  };
  const order: OrderRecord = {
    orderNumber,
    date: DAY,
    time: s.time,
    staffId: s.staffId,
    label: s.label,
    lines: s.lines,
    subtotal: t.subtotal,
    tax: t.tax,
    total: t.total,
    tip,
    tenders: [{ paymentId, method: s.method, amount: t.total, ref }],
    refunds: [],
  };
  return { payment, order };
});

export const SEED_ORDERS: OrderRecord[] = built.map((b) => b.order);
export const SEED_PAYMENTS: PaymentRecord[] = built.map((b) => b.payment);
