import { demoNow } from '../data/bookings';
import { toDateStr } from '../data/courses';
import type { CustomerGiftCard } from '../data/customers';
import { SEED_EVENTS, eventGolf, eventSpend, type EventCharge, type GolfEvent } from '../data/events';
import { SEED_ORDERS } from '../data/orders-seed';
import { liveCustomer, liveRoster } from '../data/roster';
import { SEED_OPEN_SHIFT, SEED_PUNCHES, SEED_SHIFT_HISTORY, type Punch, type Shift } from '../data/staff-seed';
import { staffByPin } from '../data/staff';
import { STOCK_ITEMS, applyStock, seedStock, type InventoryCount, type StockedCategory } from '../data/stock';
import { lineTotals, orderTotals } from '../logic/cart';
import { allRefundable, refundAmount, refundSplit, type OrderRecord, type OrderTender, type PaymentRef, type RefundPart, type RefundRecord } from '../logic/orders';
import { giftCardCovers } from '../logic/tenders';
import { DEFAULT_GIFT_CATEGORIES } from '../data/spend';
import type { PaymentRecord } from '../logic/restaurant';
import { drawerWorkings } from '../logic/shift';
import type { Booking, CartItem } from '../types';
import { bookingOrder } from '../logic/booking-orders';
import { orderNumberFromId } from '../logic/reservation';
import { rateContext } from './rate-context';
import type { PosState } from './pos-store';
import { applyCredit } from './credit-ledger';
import { currentPart, pricingOf } from './checkout';
import { withNewCustomer } from './new-customer';
import { isCreditMethod } from '../logic/credit-tenders';
import type { DrawerEvent } from './register-extras';

/**
 * The back office's slice of the store (V1 → V2, Wave 3): customers' accounts, orders and refunds,
 * events, stock, the drawer, the clock, and who is signed in.
 *
 * Built like `restaurant.ts`: **every Wave 3 action is defined here**, so the screens — built in
 * parallel — dispatch and never edit the store.
 *
 * ## Justin's decisions, which this enforces
 *
 * - **Order Lookup finds, views and refunds** — the whole order or chosen lines, back to the tender
 *   that paid the most. No reopening a paid order.
 * - **PIN sign-in only.** Everything is attributed to the person signed in; no manager approvals.
 * - **House account and card on file are checkout tenders**, not buttons on the customer record — so
 *   "look someone up" and "take money" stay separate jobs, which v1 merged onto one screen.
 * - **An event carries its golf and its spend**, and a tab or an order can be charged to it.
 * - **Live stock that sales take down**, corrected by a count.
 * - **A gift card is good for everything but alcohol** by default, and checkout enforces it.
 */

// ─── State ──────────────────────────────────────────────────────────────────

export interface AccountEntry {
  id: string;
  customerId: string;
  date: string;
  time: string;
  /** `charge` puts money on the account; `payment` pays it off; `refund` takes a charge back. */
  kind: 'charge' | 'payment' | 'refund';
  /** Always positive; `kind` says which way it moved. */
  amount: number;
  orderNumber?: string;
  staffId: string;
}

/** A split tender in progress: a gift card has paid part of the order, and the rest is still due. */
export interface SplitTender {
  orderNumber: string;
  paid: number;
  tenders: OrderTender[];
}

export interface OperationsState {
  /** False shows the PIN pad over everything. V1 → V2 opens signed in, as the first staff member. */
  signedIn: boolean;
  orders: OrderRecord[];
  stock: Record<string, number>;
  inventoryCounts: InventoryCount[];
  events: GolfEvent[];
  /**
   * The drawer open now; `null` once closed and before the next is opened. Not `shift` — the tee
   * sheet's time band already has that name on the store, and a spread would have overwritten it.
   */
  drawerShift: Shift | null;
  drawerHistory: Shift[];
  punches: Punch[];
  accountEntries: AccountEntry[];
  splitTender: SplitTender | null;
  /** A house-account payment on the register, being paid. */
  payingAccountId: string | null;
  /** An event's bill on the register, being paid by its organiser. */
  payingEventId: string | null;
  /** What each screen has open — deep-linkable. */
  selectedOrderNumber: string | null;
  selectedEventId: string | null;
  selectedCustomerId: string | null;
  activeCountId: string | null;
  opsSeq: { refund: number; entry: number; charge: number; count: number; punch: number; shift: number; event: number; customer: number };
}

export const operationsDefaults = (): OperationsState => ({
  signedIn: true,
  orders: SEED_ORDERS,
  stock: seedStock(),
  inventoryCounts: [],
  events: SEED_EVENTS,
  drawerShift: SEED_OPEN_SHIFT,
  drawerHistory: SEED_SHIFT_HISTORY,
  punches: SEED_PUNCHES,
  accountEntries: [],
  splitTender: null,
  payingAccountId: null,
  payingEventId: null,
  selectedOrderNumber: null,
  selectedEventId: null,
  selectedCustomerId: null,
  activeCountId: null,
  opsSeq: { refund: 0, entry: 0, charge: 0, count: 0, punch: 200, shift: 206, event: 302, customer: 0 },
});

// ─── Dialogs ────────────────────────────────────────────────────────────────

/** Wave 3's dialogs, merged into `Modal` by `pos-store.ts`. Each has its own file; see `modals/OperationsDialogs.tsx`. */
export type OperationsModal =
  // `tip`: what checkout recalculated in, charged on the tender with the order.
  | { kind: 'tenderGiftCard'; tip?: number }
  | { kind: 'tenderHouseAccount'; tip?: number }
  | { kind: 'tenderCardOnFile'; tip?: number }
  | { kind: 'tenderEvent'; tip?: number }
  | { kind: 'tenderCheck'; tip?: number }
  | { kind: 'refundOrder'; orderNumber: string }
  | { kind: 'eventForm'; id?: string }
  /** `name`: what a search found nobody for, to start the new record from. */
  | { kind: 'customerForm'; id?: string; name?: string }
  | { kind: 'shiftOpen' }
  | { kind: 'shiftClose' }
  | { kind: 'cashDrop' }
  | { kind: 'countForm' };

const MODAL_KINDS = new Set<string>([
  'tenderGiftCard',
  'tenderHouseAccount',
  'tenderCardOnFile',
  'tenderEvent',
  'tenderCheck',
  'refundOrder',
  'eventForm',
  'customerForm',
  'shiftOpen',
  'shiftClose',
  'cashDrop',
  'countForm',
]);

export const isOperationsModal = (m: { kind: string }): m is OperationsModal => MODAL_KINDS.has(m.kind);

// ─── Actions ────────────────────────────────────────────────────────────────

export type OperationsAction =
  // Sign-in and the clock
  | { type: 'signIn'; pin: string }
  | { type: 'signOut' }
  | { type: 'clockIn'; staffId?: string }
  | { type: 'clockOut'; staffId?: string }
  // The drawer
  | { type: 'openShift'; startCash: number }
  | { type: 'cashDrop'; amount: number; note?: string }
  | { type: 'closeShift'; countedCash: number; countedChecks: number; note?: string }
  // Stock
  | { type: 'startCount'; category: StockedCategory; title?: string }
  | { type: 'setCounted'; countId: string; name: string; counted: number | null }
  /** Sets every counted item's stock to what was counted. Uncounted items are left alone. */
  | { type: 'saveCount'; countId: string }
  | { type: 'discardCount'; countId: string }
  // Customers
  | {
      type: 'createCustomer';
      input: { firstName: string; lastName: string; email?: string; phone?: string; birthday?: string; notes?: string; types?: string[] };
    }
  /** Loads a member's balance onto the register to be paid off. */
  | { type: 'payAccount'; customerId: string; amount?: number }
  // Events
  | { type: 'createEvent'; event: Omit<GolfEvent, 'id' | 'ledger' | 'status'> & { status?: GolfEvent['status'] } }
  | { type: 'patchEvent'; id: string; patch: Partial<Omit<GolfEvent, 'id'>> }
  /** A charge not from an order — insurance, prizes paid out of the event's budget. */
  | { type: 'chargeEvent'; eventId: string; description: string; qty: number; amount: number }
  | { type: 'removeEventCharge'; eventId: string; chargeId: string }
  /** Loads an event's bill onto the register for its organiser to pay. */
  | { type: 'billEvent'; eventId: string }
  // Tenders and refunds
  /**
   * Part of the order paid now — a gift card that does not cover it all, or one part of a split check.
   * The rest stays due. `amount` is the order's share; a `tip` and a card `surcharge` ride with it.
   */
  | { type: 'payPart'; method: string; amount: number; ref?: PaymentRef; tip?: number; surcharge?: number }
  | { type: 'refundOrder'; orderNumber: string; picks?: { index: number; qty: number }[]; reason?: string }
  // What each screen has open
  | { type: 'selectOrder'; orderNumber: string | null }
  | { type: 'selectEvent'; eventId: string | null }
  | { type: 'selectCustomer'; customerId: string | null }
  | { type: 'setActiveCount'; countId: string | null }
  /**
   * An event's outing onto the sheet. Adds the tee times not already there, and marks their days
   * filled so the demo-day generator leaves them to the outing.
   */
  | { type: 'addEventBookings'; bookings: Booking[] }
  /**
   * Order Lookup, open on one order — where a reservation's order number goes in V1 → V2, because
   * what Weston wanted from it was "go to that order and refund". The breadcrumb is the same one
   * `openPaidOrder` leaves, so the reservation is one tap back.
   */
  | { type: 'openOrderLookup'; orderNumber: string; fromBookingId?: string };

const ACTION_TYPES = new Set<string>([
  'signIn',
  'signOut',
  'clockIn',
  'clockOut',
  'openShift',
  'cashDrop',
  'closeShift',
  'startCount',
  'setCounted',
  'saveCount',
  'discardCount',
  'createCustomer',
  'payAccount',
  'createEvent',
  'patchEvent',
  'chargeEvent',
  'removeEventCharge',
  'billEvent',
  'payPart',
  'refundOrder',
  'selectOrder',
  'selectEvent',
  'selectCustomer',
  'setActiveCount',
  'addEventBookings',
  'openOrderLookup',
]);

export const isOperationsAction = (a: { type: string }): a is OperationsAction => ACTION_TYPES.has(a.type);

// ─── Shared queries ─────────────────────────────────────────────────────────

const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const cents = (n: number) => Math.round(n * 100) / 100;

export const orderByNumber = (s: Pick<OperationsState, 'orders'>, n: string | null | undefined): OrderRecord | undefined =>
  n ? s.orders.find((o) => o.orderNumber === n) : undefined;

/**
 * Whether the register has an order still being rung up. A paid order waiting on **New order** is
 * finished — loading a bill or a balance starts the next order rather than refusing.
 */
export const registerBusy = (s: Pick<PosState, 'cart' | 'lastPayment'>): boolean => s.cart.length > 0 && !s.lastPayment;

/**
 * Where a refund of `picks` would go, tender by tender — what the refund dialog shows and what
 * `refundOrder` does, so the two cannot disagree. A gift card takes back only the part of the
 * refund it was good for (its categories, from the card itself); see `refundSplit`.
 */
export function refundPlan(
  s: PosState,
  order: OrderRecord,
  picks: { index: number; qty: number }[],
): { tender: OrderTender; index: number; amount: number }[] {
  const amount = refundAmount(order, picks);
  if (amount <= 0) return [];
  const returned = picks.map((p) => ({ ...order.lines[p.index], qty: p.qty }));
  const cards = order.tenders.filter((t) => t.method === 'giftcard' && t.ref?.giftCardId);
  const categories = [...new Set(cards.flatMap((t) => findGiftCard(s, t.ref!.giftCardId!, t.ref?.customerId)?.card.categories ?? DEFAULT_GIFT_CATEGORIES))];
  const cardShare = cards.length ? giftCardCovers({ balance: Number.POSITIVE_INFINITY, categories }, returned, Number.POSITIVE_INFINITY) : 0;
  // A credit's share: what it paid of the lines going back, in proportion to how many go back.
  const creditShare: Record<number, number> = {};
  order.tenders.forEach((t, i) => {
    const covers = t.ref?.credit?.covers;
    if (!isCreditMethod(t.method) || !covers) return;
    creditShare[i] = cents(picks.reduce((s, p) => s + (covers[p.index] ?? 0) * (p.qty / Math.max(1, order.lines[p.index]?.qty ?? 1)), 0));
  });
  return refundSplit(order, amount, cardShare, creditShare).map((p) => ({ tender: order.tenders[p.tender], index: p.tender, amount: p.amount }));
}

/**
 * An order by number, wherever it is: a record this session holds, or a tee time paid before the
 * session, built from its booking (`logic/booking-orders.ts`). What Order Lookup, the refund dialog
 * and `refundOrder` all read, so the three cannot disagree about what an order is.
 */
export function lookupOrder(s: PosState, orderNumber: string | null | undefined): OrderRecord | undefined {
  if (!orderNumber) return undefined;
  return orderByNumber(s, orderNumber) ?? bookingOrder(s.bookings, orderNumber, s.courses, rateContext(s))?.order;
}

export const eventById = (s: Pick<OperationsState, 'events'>, id: string | null | undefined): GolfEvent | undefined =>
  id ? s.events.find((e) => e.id === id) : undefined;

/** Who is on the clock right now. */
export const onTheClock = (s: Pick<OperationsState, 'punches'>, staffId: string): Punch | undefined =>
  s.punches.find((p) => p.staffId === staffId && !p.out);

/** What is still due on the register: the order's total, less any part already paid. */
/**
 * The sales tax the register charges — Settings' (V1 → V2), which every edition without Settings
 * leaves at 8%. An order already paid keeps the tax it was rung with; only the order being rung
 * reads this.
 */
export const taxRateOf = (s: Pick<PosState, 'terminalSettings'>): number => s.terminalSettings.checkout.taxRate;

/** What the register state needs to price its order (`pricingOf`). */
type Priced = Pick<PosState, 'cart' | 'terminalSettings' | 'buckCheckout' | 'clubPricing'> & Partial<Pick<PosState, 'payingTabId' | 'tabs' | 'payingEventId'>>;

/** The register's order, totalled at the terminal's pricing — Buck's per line in V1 → V2 (`pricingOf`). */
export const registerTotals = (s: Priced) => orderTotals(s.cart, pricingOf(s));

export function amountDue(s: Priced & Pick<PosState, 'splitTender'>): number {
  return cents(Math.max(0, registerTotals(s).total - (s.splitTender?.paid ?? 0)));
}

/** What each line of the register's order charges with its tax (`lineTotals`), at the terminal's pricing. */
export const registerLineTotals = (s: Priced): number[] => lineTotals(s.cart, pricingOf(s));

/**
 * What the next tender should take: everything still due — or, on a split check (Nov 26), what is left
 * of the part being paid.
 */
export const dueNow = (s: Priced & Pick<PosState, 'splitTender'> & Partial<Pick<PosState, 'checkSplit'>>): number => {
  const all = amountDue(s);
  const split = s.checkSplit;
  if (!split) return all;
  const i = currentPart(split);
  return cents(Math.min(all, Math.max(0, split.parts[i].amount - split.paid[i])));
};

/** An event's whole bill: its golf (taxed at checkout) plus everything charged to it (already taxed). */
export function eventBill(event: GolfEvent, bookings: PosState['bookings']) {
  const golf = eventGolf(event, bookings);
  return { golf, spend: eventSpend(event) };
}

/**
 * Every gift card the session knows about — on customer records, and those sold to someone not on the
 * roster (Wave 1's `issuedGiftCards`, `onRecord: false`).
 */
export function allGiftCards(s: Pick<PosState, 'customerEdits' | 'issuedGiftCards'>): { card: CustomerGiftCard; customerId?: string; holder: string }[] {
  const out: { card: CustomerGiftCard; customerId?: string; holder: string }[] = [];
  const seen = new Set<string>();
  const add = (card: CustomerGiftCard, customerId: string | undefined, holder: string) => {
    if (seen.has(card.id)) return;
    seen.add(card.id);
    out.push({ card, customerId, holder });
  };
  // The whole roster, not just edited records — most cards were seeded on customers nobody has touched.
  for (const c of liveRoster(s.customerEdits)) for (const card of c.giftCards) add(card, c.id, c.displayName);
  for (const i of s.issuedGiftCards) add(i.card, i.recipient.customerId, i.recipient.name);
  return out;
}

/** Find a card wherever it lives — on a record (committed or edited), or in the session's issued log. */
export function findGiftCard(
  s: Pick<PosState, 'customerEdits' | 'issuedGiftCards'>,
  cardId: string,
  customerId?: string,
): { card: CustomerGiftCard; customerId?: string } | undefined {
  if (customerId) {
    const c = liveCustomer(customerId, s.customerEdits);
    const card = c?.giftCards.find((g) => g.id === cardId);
    if (card) return { card, customerId };
  }
  const hit = allGiftCards(s).find((x) => x.card.id === cardId);
  return hit && { card: hit.card, customerId: hit.customerId };
}

// ─── Side effects that more than one action needs ───────────────────────────

/** Change a gift card's balance by `delta` (negative to spend), wherever it lives. */
function moveGiftCard(state: PosState, cardId: string, customerId: string | undefined, delta: number): Pick<PosState, 'customerEdits' | 'issuedGiftCards'> {
  const apply = (g: CustomerGiftCard): CustomerGiftCard =>
    g.id === cardId ? { ...g, balance: cents(g.balance + delta), spent: cents(g.spent - delta) } : g;
  let customerEdits = state.customerEdits;
  // Whoever holds it, when the tender did not say: a card number is enough to find the card.
  customerId ??= findGiftCard(state, cardId)?.customerId;
  if (customerId) {
    const c = liveCustomer(customerId, state.customerEdits);
    if (c?.giftCards.some((g) => g.id === cardId)) {
      customerEdits = { ...customerEdits, [customerId]: { ...customerEdits[customerId], giftCards: c.giftCards.map(apply) } };
    }
  }
  const issuedGiftCards = state.issuedGiftCards.map((i) => (i.card.id === cardId ? { ...i, card: apply(i.card) } : i));
  return { customerEdits, issuedGiftCards };
}

/** Change a customer's house-account balance by `delta` (positive to charge). */
function moveBalance(state: PosState, customerId: string, delta: number): Pick<PosState, 'customerEdits'> {
  const c = liveCustomer(customerId, state.customerEdits);
  if (!c) return { customerEdits: state.customerEdits };
  return { customerEdits: { ...state.customerEdits, [customerId]: { ...state.customerEdits[customerId], balance: cents(c.balance + delta) } } };
}

/**
 * What a tender draws on, applied: a card spent, an account charged, an event billed.
 *
 * `tip` is drawn on the same tender as the order it came with — a tip left on a gift card comes
 * off the card, a tip on a house account goes on the member's bill, a tip charged to an event is a
 * line on the organiser's. A card reader's tip needs nothing here: the card is charged elsewhere.
 * `amount` stays the order's share, which is what a refund may give back.
 */
function applyTender(
  state: PosState,
  method: string,
  amount: number,
  ref: PaymentRef | undefined,
  orderNumber: string,
  sign: 1 | -1,
  tip = 0,
): PosState {
  const now = demoNow();
  const staffId = state.operatorId;
  // A rain check, punch card, credit book or lesson credit (Nov 26). Credits never carry a tip.
  if (ref?.credit) return applyCredit(state, ref.credit, sign, amount, orderNumber);
  if (method === 'giftcard' && ref?.giftCardId) {
    return { ...state, ...moveGiftCard(state, ref.giftCardId, ref.customerId, -sign * cents(amount + tip)) };
  }
  if (method === 'house' && ref?.customerId) {
    const entry: AccountEntry = {
      id: `AE-${state.opsSeq.entry + 1}`,
      customerId: ref.customerId,
      date: toDateStr(now),
      time: clock(now),
      kind: sign === 1 ? 'charge' : 'refund',
      amount: cents(amount + tip),
      orderNumber,
      staffId,
    };
    return {
      ...state,
      ...moveBalance(state, ref.customerId, sign * cents(amount + tip)),
      accountEntries: [...state.accountEntries, entry],
      opsSeq: { ...state.opsSeq, entry: state.opsSeq.entry + 1 },
    };
  }
  if (method === 'event' && ref?.eventId) {
    // Charged to an event: the order's lines join its ledger, tax included, so the organiser's bill
    // reads as what was served rather than one lump. A refund goes on as a negative charge.
    const lines = state.cart.filter((l) => !l.isTax && l.name !== 'Taxes' && !l.serviceCharge);
    const t = registerTotals(state);
    // Buck's per-line pricing (V1 → V2): each line's own tax and service; otherwise the tax by share.
    const exact = state.buckCheckout ? registerLineTotals(state) : null;
    const lineTotal = (l: CartItem) =>
      exact ? exact[state.cart.indexOf(l)] : l.price * l.qty + (t.subtotal > 0 ? ((l.price * l.qty) / t.subtotal) * t.tax : 0);
    let seq = state.opsSeq.charge;
    const charges: EventCharge[] =
      sign === 1
        ? lines.map((l) => ({
            id: `EC-${(seq += 1)}`,
            date: toDateStr(now),
            time: clock(now),
            description: l.name,
            qty: l.qty,
            amount: cents(lineTotal(l)),
            orderNumber,
            staffId,
          }))
        : [{ id: `EC-${(seq += 1)}`, date: toDateStr(now), time: clock(now), description: `Refund · ${orderNumber}`, qty: 1, amount: -cents(amount), orderNumber, staffId }];
    if (sign === 1 && tip > 0) {
      charges.push({ id: `EC-${(seq += 1)}`, date: toDateStr(now), time: clock(now), description: 'Tip', qty: 1, amount: cents(tip), orderNumber, staffId });
    }
    return {
      ...state,
      events: state.events.map((e) => (e.id === ref.eventId ? { ...e, ledger: [...e.ledger, ...charges] } : e)),
      opsSeq: { ...state.opsSeq, charge: seq },
    };
  }
  return state;
}

// ─── Reducer ────────────────────────────────────────────────────────────────

export function operationsReducer(state: PosState, action: OperationsAction): PosState {
  const now = demoNow();
  const today = toDateStr(now);
  const seq = state.opsSeq;

  switch (action.type) {
    case 'signIn': {
      // Settings' roster (V1 → V2): someone added there can sign in, someone deactivated cannot.
      const who = staffByPin(action.pin, state.staffRoster);
      return who ? { ...state, signedIn: true, operatorId: who.id } : state;
    }
    case 'signOut':
      return { ...state, signedIn: false, navOpen: false };

    case 'clockIn': {
      const staffId = action.staffId ?? state.operatorId;
      if (onTheClock(state, staffId)) return state;
      const punch: Punch = { id: `PU-${seq.punch + 1}`, staffId, date: today, in: clock(now) };
      return { ...state, punches: [...state.punches, punch], opsSeq: { ...seq, punch: seq.punch + 1 } };
    }
    case 'clockOut': {
      const staffId = action.staffId ?? state.operatorId;
      const open = onTheClock(state, staffId);
      if (!open) return state;
      return { ...state, punches: state.punches.map((p) => (p.id === open.id ? { ...p, out: clock(now) } : p)) };
    }

    case 'openShift': {
      if (state.drawerShift) return state;
      const shift: Shift = { id: `SH-${seq.shift + 1}`, staffId: state.operatorId, date: today, openedAt: clock(now), startCash: cents(action.startCash) };
      return { ...state, drawerShift: shift, opsSeq: { ...seq, shift: seq.shift + 1 } };
    }
    case 'cashDrop': {
      if (!state.drawerShift || action.amount <= 0) return state;
      const n = state.registerSeq.drawer + 1;
      const event: DrawerEvent = {
        id: `DE-${String(n).padStart(4, '0')}`,
        kind: 'drop',
        amount: cents(action.amount),
        cashDelta: -cents(action.amount),
        note: action.note?.trim() || undefined,
        operator: state.operatorId,
        date: today,
        time: clock(now),
      };
      return { ...state, drawerEvents: [...state.drawerEvents, event], registerSeq: { ...state.registerSeq, drawer: n } };
    }
    case 'closeShift': {
      if (!state.drawerShift) return state;
      const closing = { ...state.drawerShift, closedAt: clock(now) };
      const w = drawerWorkings(closing, state.payments, state.drawerEvents);
      const closed: Shift = {
        ...closing,
        expectedCash: w.expected,
        expectedChecks: w.checks,
        countedCash: cents(action.countedCash),
        countedChecks: cents(action.countedChecks),
        note: action.note?.trim() || undefined,
      };
      return { ...state, drawerShift: null, drawerHistory: [closed, ...state.drawerHistory] };
    }

    case 'startCount': {
      const id = `IC-${seq.count + 1}`;
      const count: InventoryCount = {
        id,
        title: action.title?.trim() || `${action.category[0]}${action.category.slice(1).toLowerCase()} · ${today}`,
        category: action.category,
        date: today,
        staffId: state.operatorId,
        // `expected` is fixed when the count begins, so a sale made while counting shows as what it is.
        lines: STOCK_ITEMS.filter((i) => i.category === action.category).map((i) => ({ name: i.name, expected: state.stock[i.name] ?? 0, counted: null })),
        status: 'draft',
      };
      return { ...state, inventoryCounts: [...state.inventoryCounts, count], activeCountId: id, opsSeq: { ...seq, count: seq.count + 1 } };
    }
    case 'setCounted':
      return {
        ...state,
        inventoryCounts: state.inventoryCounts.map((c) =>
          c.id === action.countId && c.status === 'draft'
            ? {
                ...c,
                lines: c.lines.map((l) =>
                  l.name === action.name ? { ...l, counted: action.counted == null ? null : Math.max(0, Math.round(action.counted)) } : l,
                ),
              }
            : c,
        ),
      };
    case 'saveCount': {
      const count = state.inventoryCounts.find((c) => c.id === action.countId);
      if (!count || count.status !== 'draft') return state;
      const stock = { ...state.stock };
      for (const l of count.lines) if (l.counted != null) stock[l.name] = l.counted;
      return {
        ...state,
        stock,
        inventoryCounts: state.inventoryCounts.map((c) => (c.id === count.id ? { ...c, status: 'saved', savedAt: clock(now) } : c)),
      };
    }
    case 'discardCount':
      return {
        ...state,
        inventoryCounts: state.inventoryCounts.filter((c) => !(c.id === action.countId && c.status === 'draft')),
        activeCountId: state.activeCountId === action.countId ? null : state.activeCountId,
      };

    case 'createCustomer': {
      const made = withNewCustomer(state, action.input);
      return { ...made.state, selectedCustomerId: made.customer.id };
    }
    case 'payAccount': {
      const c = liveCustomer(action.customerId, state.customerEdits);
      if (!c || c.balance <= 0 || registerBusy(state)) return state;
      const amount = cents(Math.min(action.amount ?? c.balance, c.balance));
      const line: CartItem = { name: `Account payment · ${c.firstName} ${c.lastName}`.trim(), price: amount, unitPrice: amount, qty: 1, accountPayment: { customerId: c.id } };
      return { ...state, cart: [line], payingAccountId: c.id, selectedBookingId: null, view: 'pos', leftPanelCollapsed: false };
    }

    case 'createEvent': {
      const id = `EV-${seq.event + 1}`;
      const e: GolfEvent = { ...action.event, id, ledger: [], status: action.event.status ?? 'upcoming' };
      return { ...state, events: [...state.events, e], selectedEventId: id, opsSeq: { ...seq, event: seq.event + 1 } };
    }
    case 'patchEvent':
      return { ...state, events: state.events.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)) };
    case 'chargeEvent': {
      const target = eventById(state, action.eventId);
      // A billed event is closed — the organiser has paid. Nothing more goes on it.
      if (!target || target.status === 'billed' || !action.description.trim()) return state;
      const charge: EventCharge = {
        id: `EC-${seq.charge + 1}`,
        date: today,
        time: clock(now),
        description: action.description.trim(),
        qty: Math.max(1, action.qty),
        amount: cents(action.amount),
        staffId: state.operatorId,
      };
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.eventId ? { ...e, ledger: [...e.ledger, charge] } : e)),
        opsSeq: { ...seq, charge: seq.charge + 1 },
      };
    }
    case 'removeEventCharge':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.eventId && e.status !== 'billed' ? { ...e, ledger: e.ledger.filter((c) => c.id !== action.chargeId) } : e,
        ),
      };
    case 'billEvent': {
      const e = eventById(state, action.eventId);
      if (!e || e.status === 'billed' || registerBusy(state)) return state;
      const { golf, spend } = eventBill(e, state.bookings);
      const lines: CartItem[] = [];
      // Golf is a sale, taxed at checkout; the spend was taxed when it was charged, so it rides untaxed.
      if (golf.amount > 0) lines.push({ name: `Golf · ${e.name} · ${golf.players} players`, price: golf.amount, unitPrice: golf.amount, qty: 1, eventBill: undefined });
      if (spend !== 0) lines.push({ name: `Charges · ${e.name}`, price: spend, unitPrice: spend, qty: 1, eventBill: { eventId: e.id } });
      if (!lines.length) return state;
      return { ...state, cart: lines, payingEventId: e.id, selectedBookingId: null, view: 'pos', leftPanelCollapsed: false };
    }

    case 'payPart': {
      const due = amountDue(state);
      const amount = cents(Math.min(action.amount, due));
      if (amount <= 0 || amount >= due) return state; // the whole remainder is `recordPayment`'s job
      // A tee time keeps its reservation's order number on a split too, as it does paid whole.
      const orderNumber =
        state.splitTender?.orderNumber ?? (state.selectedBookingId ? orderNumberFromId(state.selectedBookingId) : `#A-${30000 + state.restaurantSeq.payment + 1}`);
      const paymentId = `P-${state.restaurantSeq.payment + 1}`;
      const tip = cents(Math.max(0, action.tip ?? 0));
      const surcharge = cents(Math.max(0, action.surcharge ?? 0));
      const payment: PaymentRecord = {
        id: paymentId,
        date: today,
        time: clock(now),
        method: action.method,
        amount: cents(amount + surcharge),
        tip,
        orderNumber,
        staffId: state.operatorId,
        kind: 'sale',
        ...(surcharge ? { surcharge } : {}),
        ref: action.ref,
        cardLast4: action.ref?.cardLast4,
      };
      const after = applyTender(state, action.method, amount, action.ref, orderNumber, 1, tip);
      // A split check (Nov 26): the part being paid has this much more on it.
      const split = state.checkSplit;
      const part = currentPart(split);
      return {
        ...after,
        payments: [...after.payments, payment],
        restaurantSeq: { ...after.restaurantSeq, payment: after.restaurantSeq.payment + 1 },
        splitTender: {
          orderNumber,
          paid: cents((state.splitTender?.paid ?? 0) + amount),
          tenders: [...(state.splitTender?.tenders ?? []), { paymentId, method: action.method, amount, ref: action.ref }],
        },
        ...(split && { checkSplit: { ...split, paid: split.paid.map((p, i) => (i === part ? cents(p + amount) : p)) } }),
      };
    }

    case 'refundOrder': {
      // A tee time paid before the session has no record yet: it is built from its booking (the
      // same record Order Lookup shows) and kept from its first refund on, so a second refund sees
      // the first and cannot give the same seat back twice.
      const held = orderByNumber(state, action.orderNumber);
      const order = held ?? lookupOrder(state, action.orderNumber);
      if (!order) return state;
      const picks = (action.picks ?? allRefundable(order)).filter((p) => p.qty > 0);
      const amount = refundAmount(order, picks);
      const plan = refundPlan(state, order, picks);
      if (amount <= 0 || plan.length === 0) return state;
      // One negative payment per tender the money goes back to, each reversed on its own tender.
      const returned = picks.map((p) => ({ ...order.lines[p.index], qty: p.qty }));
      let after: PosState = { ...state, cart: returned };
      let paymentSeq = state.restaurantSeq.payment;
      const parts: RefundPart[] = [];
      const payments: PaymentRecord[] = [];
      for (const { tender, index, amount: partAmount } of plan) {
        paymentSeq += 1;
        const paymentId = `P-${paymentSeq}`;
        parts.push({ tender: index, method: tender.method, ref: tender.ref, amount: partAmount, paymentId });
        payments.push({
          id: paymentId,
          date: today,
          time: clock(now),
          method: tender.method,
          amount: -partAmount,
          tip: 0,
          orderNumber: order.orderNumber,
          staffId: state.operatorId,
          kind: 'refund',
          ref: tender.ref,
          cardLast4: tender.ref?.cardLast4,
        });
        after = applyTender(after, tender.method, partAmount, tender.ref, order.orderNumber, -1);
      }
      const largest = parts.reduce((a, b) => (b.amount > a.amount ? b : a));
      const refund: RefundRecord = {
        id: `RF-${seq.refund + 1}`,
        date: today,
        time: clock(now),
        staffId: state.operatorId,
        lines: picks,
        amount,
        method: largest.method,
        ref: largest.ref,
        paymentId: largest.paymentId,
        reason: action.reason?.trim() || undefined,
        ...(parts.length > 1 && { parts }),
      };
      // Back onto the shelf.
      return {
        ...after,
        cart: state.cart,
        stock: applyStock(state.stock, returned, 1),
        orders: held
          ? state.orders.map((o) => (o.orderNumber === order.orderNumber ? { ...o, refunds: [...o.refunds, refund] } : o))
          : [...state.orders, { ...order, refunds: [refund] }],
        payments: [...after.payments, ...payments],
        restaurantSeq: { ...after.restaurantSeq, payment: paymentSeq },
        opsSeq: { ...after.opsSeq, refund: after.opsSeq.refund + 1 },
      };
    }

    case 'selectOrder':
      return { ...state, selectedOrderNumber: action.orderNumber };
    case 'selectEvent':
      return { ...state, selectedEventId: action.eventId };
    case 'selectCustomer':
      return { ...state, selectedCustomerId: action.customerId };
    case 'setActiveCount':
      return { ...state, activeCountId: action.countId };
    case 'addEventBookings': {
      const have = new Set(state.bookings.map((b) => b.id));
      const add = action.bookings.filter((b) => !have.has(b.id));
      if (add.length === 0) return state;
      const dates = [...new Set(add.map((b) => b.date))].filter((d) => !state.generatedDates.includes(d));
      return { ...state, bookings: [...state.bookings, ...add], generatedDates: [...state.generatedDates, ...dates] };
    }
    case 'openOrderLookup':
      return {
        ...state,
        view: 'orderlookup',
        leftPanelCollapsed: true,
        selectedOrderNumber: action.orderNumber,
        reservationPanel: null,
        returnToBooking: action.fromBookingId ?? null,
      };
  }
}

/**
 * What `recordPayment` adds for the back office, run **after** the other payment hooks and on their
 * result — never beside them. Gift-card issuing (Wave 1), the payment ledger (Wave 2) and this all
 * touch customer records; spreading three results computed from the same starting state would let
 * the last silently undo the others, so `pos-store.ts` threads them in order and this sees the rest.
 *
 * It records the order whole, takes stock off the shelf, applies what the tender drew on, and closes a
 * split tender, an account payment or an event bill.
 */
export function recordOperationsPayment(
  state: PosState,
  payment: { method: string; amount: number; tip?: number; surcharge?: number; ref?: PaymentRef; paymentId: string; orderNumber: string },
): PosState {
  const t = registerTotals(state);
  // The order's share of the payment: not the tip, nor a card surcharge (Buck's, V1 → V2) — neither is refunded with the goods.
  const tender: OrderTender = { paymentId: payment.paymentId, method: payment.method, amount: cents(payment.amount - (payment.tip ?? 0) - (payment.surcharge ?? 0)), ref: payment.ref };
  const tenders = [...(state.splitTender?.tenders ?? []), tender];
  const booking = state.selectedBookingId ? state.bookings.find((b) => b.id === state.selectedBookingId) : undefined;
  const tab = state.payingTabId ? state.tabs.find((x) => x.id === state.payingTabId) : undefined;
  const order: OrderRecord = {
    orderNumber: payment.orderNumber,
    date: toDateStr(demoNow()),
    time: clock(demoNow()),
    staffId: tab?.serverId ?? state.operatorId,
    label: tab ? tab.name : booking ? `Tee time · ${booking.name}` : state.payingEventId ? `Event bill` : state.payingAccountId ? 'Account payment' : state.view === 'quickorder' ? 'Counter' : 'Pro Shop',
    lines: state.cart,
    subtotal: t.subtotal,
    tax: t.tax,
    total: t.total,
    tip: payment.tip ?? 0,
    tenders,
    refunds: [],
    tabId: tab?.id,
    bookingId: booking?.id,
    customerId: payment.ref?.customerId ?? state.payingAccountId ?? undefined,
    eventId: payment.ref?.eventId ?? state.payingEventId ?? undefined,
    // A split check (Nov 26): its parts, each paid by the tenders above.
    ...(state.checkSplit && { split: { mode: state.checkSplit.mode, parts: state.checkSplit.parts.map((p) => ({ label: p.label, amount: p.amount })) } }),
    // Buck's per-line pricing (V1 → V2): each line's exact share, and the receipt's tax and service lines.
    ...(state.buckCheckout && {
      lineTotals: registerLineTotals(state),
      taxes: t.taxes,
      serviceCharges: t.serviceCharges,
      service: t.service,
    }),
  };

  let next = applyTender(state, payment.method, tender.amount, payment.ref, payment.orderNumber, 1, payment.tip ?? 0);

  // An account payment pays the balance down; an event bill marks the event settled.
  if (state.payingAccountId) {
    const paid = state.cart.filter((l) => l.accountPayment).reduce((s, l) => s + l.price * l.qty, 0);
    const entry: AccountEntry = {
      id: `AE-${next.opsSeq.entry + 1}`,
      customerId: state.payingAccountId,
      date: order.date,
      time: order.time,
      kind: 'payment',
      amount: cents(paid),
      orderNumber: payment.orderNumber,
      staffId: state.operatorId,
    };
    next = { ...next, ...moveBalance(next, state.payingAccountId, -paid), accountEntries: [...next.accountEntries, entry], opsSeq: { ...next.opsSeq, entry: next.opsSeq.entry + 1 } };
  }
  if (state.payingEventId) {
    next = { ...next, events: next.events.map((e) => (e.id === state.payingEventId ? { ...e, status: 'billed', billedOrderNumber: payment.orderNumber } : e)) };
  }

  return {
    ...next,
    orders: [...next.orders, order],
    stock: applyStock(next.stock, state.cart, -1),
    splitTender: null,
    checkSplit: null,
    payingAccountId: null,
    payingEventId: null,
  };
}

/**
 * Undo a split tender that will not be finished — the order cleared after a gift card paid part of
 * it. The card gets its money back and the ledger shows the part refunded, so nothing is lost and
 * nothing is charged for an order that never completed.
 */
export function unwindSplitTender(state: PosState): PosState {
  const split = state.splitTender;
  if (!split) return state;
  let next: PosState = state;
  const now = demoNow();
  for (const t of split.tenders) {
    next = applyTender(next, t.method, t.amount, t.ref, split.orderNumber, -1);
    const payment: PaymentRecord = {
      id: `P-${next.restaurantSeq.payment + 1}`,
      date: toDateStr(now),
      time: clock(now),
      method: t.method,
      amount: -t.amount,
      tip: 0,
      orderNumber: split.orderNumber,
      staffId: state.operatorId,
      kind: 'refund',
      ref: t.ref,
    };
    next = { ...next, payments: [...next.payments, payment], restaurantSeq: { ...next.restaurantSeq, payment: next.restaurantSeq.payment + 1 } };
  }
  return { ...next, splitTender: null, checkSplit: null };
}
