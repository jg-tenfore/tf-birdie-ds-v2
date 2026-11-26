import type { CreditKind } from '../logic/credit-tenders';
import { clubPricingDefaults, type ClubPricing, type Pricing } from '../logic/pricing';
import type { Tab } from '../logic/restaurant';
import type { AppliedDiscount } from '../logic/discounts';
import { productSettings } from '../data/products';
import { demoNow } from '../data/bookings';
import { TIMES, toDateStr } from '../data/courses';
import { MANAGER_SWITCHES, type ManagerSwitches } from '../data/buck-club';
import { RAIN_CHECK_RULES, lessonInstructor, mdyAfter } from '../data/credits';
import { bookingName } from '../data/customers';
import type { RainCheck } from '../data/rain-checks';
import { liveCustomer } from '../data/roster';
import { playerFee, playerHoles } from '../logic/reservation';
import type { CartItem } from '../types';
import type { VenueId } from '../data/venues';
import type { CartServiceCharge } from '../logic/pricing';
import type { PosState } from './pos-store';
import { guestsLinked, withNewCustomer } from './new-customer';
import { canManageStaff } from './settings';
import { seatRecord } from '../logic/seat-pricing';

// ─── State ──────────────────────────────────────────────────────────────────

export interface CheckoutState {
  /**
   * V1 → V2 prices by Buck (Nov 26): tax per line by Buck's tax types, service charges, Buck's
   * discounts. Set by the shell for the current edition, like `transportFromRow` — so the archived
   * base edition keeps its one sales-tax rate and nothing there moves.
   */
  buckCheckout: boolean;
  /** Buck's club pricing — tax types, per-kind rates, service charges. Set in Buck; a story can push other values. */
  clubPricing: ClubPricing;
  /** Buck › Payments' two manager switches: when a refund or an order cancel asks for a manager's PIN. Set in Buck. */
  managerSwitches: ManagerSwitches;
  /** A split check in progress — each part paid on its own tender. */
  checkSplit: CheckSplit | null;
  /** Orders sent to another course's register, and arrived from one. */
  transferredOrders: TransferredOrder[];
  checkoutSeq: { rainCheck: number; transfer: number };
}

/**
 * A check split into parts (Nov 26): evenly N ways, or by item. Each part is paid separately — any
 * tender, a credit, a split of its own — and recorded as its own payment under the order's number.
 */
export interface CheckSplit {
  mode: 'even' | 'items';
  parts: { label: string; amount: number; lines?: number[] }[];
  /** What each part has had paid. */
  paid: number[];
}

/** An order moved to another course's register ("Transfer to Course"). */
export interface TransferredOrder {
  id: string;
  fromVenue: VenueId;
  toVenue: VenueId;
  cart: CartItem[];
  /** Who it is for, when the order had a customer. */
  customer?: string;
  total: number;
  date: string;
  time: string;
  staffId: string;
  /** Opened on the receiving register. */
  receivedAt?: string;
}

export const checkoutDefaults = (): CheckoutState => ({
  buckCheckout: false,
  clubPricing: clubPricingDefaults(),
  managerSwitches: { ...MANAGER_SWITCHES },
  checkSplit: null,
  transferredOrders: [],
  checkoutSeq: { rainCheck: 0, transfer: 0 },
});

/** The part of a split being paid now: the first not yet paid. */
export function currentPart(split: CheckSplit | null): number {
  if (!split) return -1;
  const i = split.parts.findIndex((p, k) => split.paid[k] < p.amount - 0.004);
  return i === -1 ? split.parts.length - 1 : i;
}

/** Even parts of `total`, to the cent: the last takes what rounding leaves. */
export function evenParts(total: number, n: number): number[] {
  const each = Math.floor((total / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? Math.round((total - each * (n - 1)) * 100) / 100 : each));
}

/**
 * How the register prices an order: Settings' one sales-tax rate, or — in V1 → V2 — Buck's per-line
 * pricing, knowing what kind of order it is: a table's tab takes the F&B Service Charge, an event's
 * bill the Event Service Charge. `tab` prices a tab that is not on the register (Tabs, Tables).
 *
 * Every total reads this — the rail, checkout, the readers, a tab's own total — so they agree.
 */
export function pricingOf(
  s: Pick<PosState, 'buckCheckout' | 'clubPricing' | 'terminalSettings'> & Partial<Pick<PosState, 'payingTabId' | 'tabs' | 'payingEventId'>>,
  ctx: { tab?: Pick<Tab, 'tableId'> | null } = {},
): number | Pricing {
  const rate = s.terminalSettings.checkout.taxRate;
  if (!s.buckCheckout) return rate;
  const tab = ctx.tab !== undefined ? ctx.tab : s.payingTabId ? s.tabs?.find((t) => t.id === s.payingTabId) : null;
  return {
    kind: 'buck',
    club: s.clubPricing,
    salesRate: rate,
    ...(tab?.tableId && { dineIn: true }),
    ...(ctx.tab === undefined && s.payingEventId && { eventBill: true }),
  };
}

/**
 * Whether this step needs a manager's PIN at the counter (Nov 26 decision: follow Buck's switches).
 *
 * - **refund** — unless Buck's "Allow refunds without manager pin" is on.
 * - **cancel** — clearing an order, when Buck's "Order Cancels Require Manager" is on.
 *
 * A manager signed in approves by being signed in. The archived edition never asks: it predates both.
 */
export function managerNeededFor(
  s: Pick<PosState, 'buckCheckout' | 'managerSwitches' | 'staffRoster' | 'operatorId'>,
  step: 'refund' | 'cancel',
): boolean {
  if (!s.buckCheckout || canManageStaff(s)) return false;
  return step === 'refund' ? !s.managerSwitches.refundsWithoutManagerPin : s.managerSwitches.orderCancelsRequireManager;
}

// ─── Dialogs ────────────────────────────────────────────────────────────────

export type CheckoutModal =
  /** Pay with a rain check, punch card, credit book or lesson credit. `tip`: what checkout recalculated in. */
  | { kind: 'tenderCredit'; credit: CreditKind; tip?: number }
  /** A Buck discount, or a price override, on one line of the order. */
  | { kind: 'lineDiscount'; index: number }
  /** A Buck discount or a promo code on the whole order. */
  | { kind: 'orderDiscount'; tab?: 'types' | 'promo' }
  /** Split the check: evenly, or by item. */
  | { kind: 'splitCheck'; tip?: number }
  /** Add a service charge by hand. */
  | { kind: 'serviceCharge'; tip?: number }
  /** A paid order's receipt, to print again. */
  | { kind: 'receipt'; orderNumber?: string }
  /** Move the order to another course's register. */
  | { kind: 'transferOrder' }
  /** Which instructor a lesson being rung up is with (Nov 26). */
  | { kind: 'pickInstructor'; name: string; price: number };

const MODAL_KINDS = new Set<string>(['tenderCredit', 'lineDiscount', 'orderDiscount', 'splitCheck', 'serviceCharge', 'receipt', 'transferOrder', 'pickInstructor']);

export const isCheckoutModal = (m: { kind: string }): m is CheckoutModal => MODAL_KINDS.has(m.kind);

// ─── Actions ────────────────────────────────────────────────────────────────

export type CheckoutAction =
  /** A Buck discount on a line, or `null` to take it off. */
  | { type: 'applyLineDiscount'; index: number; discount: AppliedDiscount | null }
  /** A Buck discount or promo code on the whole order — a line of its own. */
  | { type: 'applyOrderDiscount'; discount: AppliedDiscount }
  /** Buck's Price override: a new unit price on a line whose product allows it. */
  | { type: 'overridePrice'; index: number; price: number }
  /** Split the check into parts, each to be paid on its own. */
  | { type: 'startSplit'; split: Omit<CheckSplit, 'paid'> }
  /** Undo a split nothing has been paid on. */
  | { type: 'cancelSplit' }
  /** A service charge added by hand — Buck's F&B or Event charge, or one typed in. */
  | { type: 'addServiceCharge'; charge: CartServiceCharge }
  /** Send the order to another course's register. */
  | { type: 'transferOrder'; toVenue: VenueId; total: number }
  /** Open an order another course sent this register. */
  | { type: 'receiveTransfer'; id: string }
  /**
   * A rain check cut at the register for one seat of a booking (Buck's Credits rain check): the amount
   * keyed, Buck's 365-day expiry, onto a customer's record — spendable at checkout. The seat's own
   * record, one found for it, or one made there and then (`newCustomer`, name and phone); a seat
   * without a record is linked to the customer.
   */
  | { type: 'issueRainCheck'; bookingId: string; seat: number; amount: number; customerId?: string; newCustomer?: { firstName: string; lastName: string; phone: string } }
  /** A lesson rung up with its instructor (Nov 26). The same lesson with the same instructor adds to its line. */
  | { type: 'addLesson'; name: string; price: number; instructorId: string };

const ACTION_TYPES = new Set<string>([
  'applyLineDiscount',
  'applyOrderDiscount',
  'overridePrice',
  'startSplit',
  'cancelSplit',
  'addServiceCharge',
  'transferOrder',
  'receiveTransfer',
  'issueRainCheck',
  'addLesson',
]);

export const isCheckoutAction = (a: { type: string }): a is CheckoutAction => ACTION_TYPES.has(a.type);

const cents = (n: number) => Math.round(n * 100) / 100;

export function checkoutReducer(state: PosState, action: CheckoutAction): PosState {
  const now = demoNow();
  switch (action.type) {
    case 'issueRainCheck':
      return issueRainCheck(state, action);
    case 'addLesson': {
      const who = lessonInstructor(action.instructorId);
      if (!who) return state;
      const at = state.cart.findIndex((l) => l.name === action.name && l.lesson?.instructorId === who.id && !l.lineDiscount && !l.priceOverride);
      if (at >= 0) return { ...state, cart: state.cart.map((l, i) => (i === at ? { ...l, qty: l.qty + 1 } : l)) };
      const line: CartItem = { name: action.name, price: action.price, qty: 1, lesson: { instructorId: who.id, instructor: who.name } };
      return { ...state, cart: [...state.cart, line] };
    }
    case 'receiveTransfer': {
      const t = state.transferredOrders.find((x) => x.id === action.id);
      if (!t || t.receivedAt || t.toVenue !== state.venueId || (state.cart.length > 0 && !state.lastPayment)) return state;
      const base = state.lastPayment ? { ...state, cart: [], lastPayment: null, selectedBookingId: null } : state;
      return {
        ...base,
        cart: t.cart,
        view: 'pos',
        leftPanelCollapsed: false,
        transferredOrders: state.transferredOrders.map((x) => (x.id === t.id ? { ...x, receivedAt: clock(now) } : x)),
      };
    }
    default:
      break;
  }
  // A paid order is finished, and one part paid is too far along to change: nothing changes its price.
  if (state.lastPayment || state.splitTender) return state;
  switch (action.type) {
    case 'startSplit': {
      const parts = action.split.parts.filter((p) => p.amount > 0);
      if (parts.length < 2 || state.cart.length === 0) return state;
      return { ...state, checkSplit: { ...action.split, parts, paid: parts.map(() => 0) } };
    }
    case 'cancelSplit':
      return { ...state, checkSplit: null };
    case 'addServiceCharge': {
      const c = action.charge;
      if (state.cart.length === 0 || !((c.percent ?? 0) > 0 || (c.amount ?? 0) > 0)) return state;
      const line: CartItem = { name: c.label, price: 0, qty: 1, serviceCharge: c };
      // Buck's own charges once each; a typed one as often as it is added.
      const cart = c.id === 'custom' ? [...state.cart, line] : [...state.cart.filter((l) => l.serviceCharge?.id !== c.id), line];
      return { ...state, cart };
    }
    case 'transferOrder': {
      if (state.cart.length === 0 || action.toVenue === state.venueId || state.checkSplit) return state;
      const n = state.checkoutSeq.transfer + 1;
      const t: TransferredOrder = {
        id: `TR-${String(n).padStart(4, '0')}`,
        fromVenue: state.venueId,
        toVenue: action.toVenue,
        cart: state.cart.filter((l) => !l.isTax && l.name !== 'Taxes'),
        customer: state.selectedGolfer?.name,
        total: action.total,
        date: toDateStr(now),
        time: clock(now),
        staffId: state.operatorId,
      };
      return {
        ...state,
        transferredOrders: [...state.transferredOrders, t],
        checkoutSeq: { ...state.checkoutSeq, transfer: n },
        cart: [],
        selectedGolfer: null,
        selectedBookingId: null,
        orderSeats: null,
        flowMode: '',
        modal: null,
      };
    }
    case 'applyLineDiscount': {
      const line = state.cart[action.index];
      if (!line) return state;
      const cart = state.cart.map((l, i) => {
        if (i !== action.index) return l;
        const { lineDiscount: _drop, ...rest } = l;
        return action.discount ? { ...rest, lineDiscount: action.discount } : rest;
      });
      return { ...state, cart };
    }
    case 'applyOrderDiscount': {
      const d = action.discount;
      // The same type or code twice is one discount: the new one replaces it.
      const same = (l: CartItem) => Boolean(l.orderDiscount && ((d.code && l.orderDiscount.code === d.code) || (d.typeId != null && l.orderDiscount.typeId === d.typeId)));
      const line: CartItem = { name: d.label, price: 0, qty: 1, orderDiscount: d };
      return { ...state, cart: [...state.cart.filter((l) => !same(l)), line] };
    }
    case 'overridePrice': {
      const line = state.cart[action.index];
      const price = cents(action.price);
      if (!line || line.isCheckIn || !productSettings(line.name)?.priceOverride || !(price >= 0)) return state;
      const from = line.priceOverride?.from ?? line.price;
      const cart = state.cart.map((l, i) =>
        i !== action.index ? l : price === from ? (({ priceOverride: _p, ...rest }) => ({ ...rest, price }))(l) : { ...l, price, priceOverride: { from, by: state.operatorId } },
      );
      return { ...state, cart };
    }
    default:
      return state;
  }
}

const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * Cut a rain check for one seat — Buck's shape, its expiry from Main Info, onto the customer's record.
 *
 * Nov 26 decision: a rain check always belongs to someone. A seat with no record takes the customer
 * staff found for it, or the one they added (name and phone), and is linked to them, so the next visit
 * finds the credit on the seat as well as on the record.
 */
function issueRainCheck(state0: PosState, a: Extract<CheckoutAction, { type: 'issueRainCheck' }>): PosState {
  const amount = cents(a.amount);
  const b = state0.bookings.find((x) => x.id === a.bookingId);
  if (!b || !(amount > 0)) return state0;
  const fresh = a.newCustomer && a.newCustomer.firstName.trim() && a.newCustomer.phone.trim() ? withNewCustomer(state0, { ...a.newCustomer, firstName: a.newCustomer.firstName.trim(), lastName: a.newCustomer.lastName.trim() }) : null;
  const state = fresh?.state ?? state0;
  const customer = fresh?.customer ?? liveCustomer(a.customerId, state.customerEdits);
  if (!customer) return state0;
  // The seat's own record wins; otherwise the seat is linked to whoever the rain check is for.
  const link = !seatRecord(b, a.seat, state.customerEdits);
  const now = demoNow();
  const n = state.checkoutSeq.rainCheck + 1;
  const id = String(61000 + n);
  const holes = playerHoles(b, a.seat);
  const course = state.courses.find((c) => c.id === b.course)?.name ?? '';
  const time = TIMES.find((t) => t.totalMin === b.timeMin)?.label ?? '';
  const [y, m, d] = b.date.split('-').map(Number);
  const rc: RainCheck = {
    id,
    customerId: customer.id,
    customerName: bookingName(customer),
    reservation: b.conf,
    teeTime: `${m}/${d}/${y} ${time}`,
    issued: mdyAfter(now, 0),
    expires: mdyAfter(now, RAIN_CHECK_RULES.expirationDays),
    course,
    roundPrice: playerFee(b, a.seat),
    totalHoles: holes,
    holesPlayed: 0,
    awarded: amount,
    spent: 0,
    balance: amount,
  };
  const seatName = a.seat === 0 ? b.name : b.guests?.[a.seat]?.name || `Guest ${a.seat + 1}`;
  return {
    ...state,
    issuedRainChecks: [...state.issuedRainChecks, rc],
    checkoutSeq: { ...state.checkoutSeq, rainCheck: n },
    creditHistory: [
      ...state.creditHistory,
      { key: `raincheck:${id}`, kind: 'raincheck', date: toDateStr(now), time: clock(now), direction: 'issue', amount, orderNumber: b.conf, staffId: state.operatorId },
    ],
    bookings: state.bookings.map((x) =>
      x.id === b.id
        ? {
            ...x,
            ...(link && { guests: guestsLinked(x.guests, a.seat, customer.id, bookingName(customer), customer.phone) }),
            pay: 'rain_chk',
            financialActions: [
              ...(x.financialActions ?? []),
              { time: clock(now), label: `Rain check #${id} · $${amount.toFixed(2)}`, player: seatName, type: 'raincheck' as const },
            ],
          }
        : x,
    ),
  };
}
