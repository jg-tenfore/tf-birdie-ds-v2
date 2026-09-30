import { demoNow } from '../data/bookings';
import { toDateStr } from '../data/courses';
import { SEED_ROOMS, allTables, type Room } from '../data/floor';
import { menuItem, type AppliedModifier } from '../data/menu';
import { SEED_KITCHEN_TICKETS, SEED_PAYMENTS, SEED_RESERVATIONS, SEED_TABS } from '../data/restaurant-seed';
import {
  discountDish as discountDishLine,
  dishLine,
  editDish,
  moveDish as moveDishLine,
  splitDish as splitDishLines,
  isSent,
  openTabOn,
  sendToKitchen,
  tableLabel,
  voidDish,
  type DiningReservation,
  type KitchenTicket,
  type PaymentRecord,
  type ReservationStatus,
  type Tab,
} from '../logic/restaurant';
import type { CartItem } from '../types';
import type { PosState } from './pos-store';

/**
 * The restaurant's slice of the store (V1 → V2, Wave 2).
 *
 * Kept in its own module, like `register-extras.ts`, and wired into `pos-store.ts` with the
 * smallest possible edits. **Every restaurant action is defined here**, so the screens — built in
 * parallel — never have to edit the store: they dispatch, and this is the one place the rules of
 * the chain are enforced.
 *
 * ## The chain
 *
 * reservation → table → tab → kitchen → pay → the table is free. See `logic/restaurant.ts`.
 *
 * ## Where a dish can live
 *
 * On a **tab** (table service, a bar tab), or on the **register's own order** (Quick Order at the
 * counter). A `DishTarget` names which. The line type is the same either way — `CartItem` with a
 * `dish` — so paying a tab loads its lines onto the register exactly as they are.
 */

export type DishTarget = { tabId: string } | 'cart';

// ─── State ──────────────────────────────────────────────────────────────────

export interface RestaurantState {
  /** The saved floor. Table Chart edits a working copy and writes it back here on Save. */
  floor: Room[];
  /** The room Tables and Table Chart are showing — shared, so moving between them keeps your place. */
  floorRoomId: string;
  tabs: Tab[];
  diningReservations: DiningReservation[];
  /** Every payment, as it happened — what Orders & Tips lists. */
  payments: PaymentRecord[];
  kitchenTickets: KitchenTicket[];
  /** The tab open in the tab editor. */
  activeTabId: string | null;
  /** The tab whose lines are on the register being paid. Paying closes it. */
  payingTabId: string | null;
  /** Who is working the terminal. PIN sign-in (Wave 3) will set it; until then, the first staff member. */
  operatorId: string;
  /** Monotonic, like `registerSeq` — a length would hand out an id twice once things are removed. */
  restaurantSeq: { tab: number; ticket: number; payment: number; line: number; reservation: number };
}

export const restaurantDefaults = (): RestaurantState => ({
  floor: SEED_ROOMS,
  floorRoomId: SEED_ROOMS[0].id,
  tabs: SEED_TABS,
  diningReservations: SEED_RESERVATIONS,
  payments: SEED_PAYMENTS,
  kitchenTickets: SEED_KITCHEN_TICKETS,
  activeTabId: null,
  payingTabId: null,
  operatorId: 's-1',
  restaurantSeq: {
    tab: 1006,
    ticket: 3000 + SEED_KITCHEN_TICKETS.length,
    payment: 2000 + SEED_PAYMENTS.length,
    line: 5000,
    reservation: 513,
  },
});

// ─── Dialogs ────────────────────────────────────────────────────────────────

/**
 * The restaurant's dialogs, merged into `Modal` by `pos-store.ts`. Each is rendered by a component
 * in its own file (see `modals/RestaurantDialogs.tsx`), so the screens that own them never share
 * a file.
 */
export type RestaurantModal =
  /** Choose modifiers for a dish — adding one (`menuItemId`), or changing an unsent one (`lineId`). */
  | { kind: 'dish'; target: DishTarget; menuItemId: string; lineId?: string; seat?: number }
  /** Open a tab — on a table, or with none. */
  | { kind: 'openTab'; tableId?: string }
  /** Move a tab to another table. */
  | { kind: 'moveTab'; tabId: string }
  /** Create (`id` absent) or edit a reservation. */
  | { kind: 'reservation'; id?: string; date?: string }
  /** Choose the table a reservation sits at, and seat it. */
  | { kind: 'seatReservation'; id: string }
  /** Change the tip on a card payment after the fact. */
  | { kind: 'adjustTip'; paymentId: string };

const MODAL_KINDS = new Set<string>(['dish', 'openTab', 'moveTab', 'reservation', 'seatReservation', 'adjustTip']);

export const isRestaurantModal = (m: { kind: string }): m is RestaurantModal => MODAL_KINDS.has(m.kind);

// ─── Actions ────────────────────────────────────────────────────────────────

export type RestaurantAction =
  | {
      type: 'openTab';
      name?: string;
      tableId?: string;
      guests: number;
      serverId?: string;
      customerId?: string;
      reservationId?: string;
    }
  | { type: 'setActiveTab'; tabId: string | null }
  | { type: 'patchTab'; tabId: string; patch: Partial<Pick<Tab, 'name' | 'guests' | 'serverId' | 'checkRequested' | 'customerId'>> }
  /** Refused if the target table already has an open tab. `null` takes it off its table. */
  | { type: 'moveTab'; tabId: string; tableId: string | null }
  | {
      type: 'addDish';
      target: DishTarget;
      menuItemId: string;
      modifiers: AppliedModifier[];
      seat?: number;
      note?: string;
      qty?: number;
    }
  /** Refused on a sent dish — the kitchen already has it. */
  | {
      type: 'editDish';
      target: DishTarget;
      lineId: string;
      patch: { modifiers?: AppliedModifier[]; seat?: number | null; note?: string; qty?: number };
    }
  /** Unsent only. A sent dish is voided instead, so the kitchen sees it cancelled. */
  | { type: 'removeDish'; target: DishTarget; lineId: string }
  | { type: 'voidDish'; target: DishTarget; lineId: string }
  /** Move a dish to another seat, sent or not — the seat decides who pays, not what is cooked. */
  | { type: 'moveDish'; target: DishTarget; lineId: string; seat: number | null }
  /** Split one unit off a line of two or more onto another seat. */
  | { type: 'splitDish'; target: DishTarget; lineId: string; seat: number | null }
  /** Percent off a dish, sent or not. 0 removes it. */
  | { type: 'discountDish'; target: DishTarget; lineId: string; pct: number }
  | { type: 'sendToKitchen'; target: DishTarget }
  /** Load a tab onto the register to be paid. Refused while a different order is on the rail. */
  | { type: 'payTab'; tabId: string }
  | { type: 'saveFloor'; rooms: Room[] }
  | { type: 'setFloorRoom'; roomId: string }
  | { type: 'createReservation'; reservation: Omit<DiningReservation, 'id' | 'status'> & { status?: ReservationStatus } }
  | { type: 'patchReservation'; id: string; patch: Partial<Omit<DiningReservation, 'id'>> }
  /** Seat a reservation at a table: opens a tab on it, sized to the party, and links the two. */
  | { type: 'seatReservation'; id: string; tableId: string; serverId?: string }
  | { type: 'adjustTip'; paymentId: string; tip: number }
  | { type: 'setOperator'; staffId: string };

const ACTION_TYPES = new Set<string>([
  'openTab',
  'setActiveTab',
  'patchTab',
  'moveTab',
  'addDish',
  'editDish',
  'removeDish',
  'voidDish',
  'moveDish',
  'splitDish',
  'discountDish',
  'sendToKitchen',
  'payTab',
  'saveFloor',
  'setFloorRoom',
  'createReservation',
  'patchReservation',
  'seatReservation',
  'adjustTip',
  'setOperator',
]);

export const isRestaurantAction = (a: { type: string }): a is RestaurantAction => ACTION_TYPES.has(a.type);

const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

// ─── Queries the screens share ──────────────────────────────────────────────

export const tabById = (s: Pick<RestaurantState, 'tabs'>, id: string | null | undefined): Tab | undefined =>
  id ? s.tabs.find((t) => t.id === id) : undefined;

export const openTabs = (s: Pick<RestaurantState, 'tabs'>): Tab[] => s.tabs.filter((t) => t.status === 'open');

/** The lines a target holds — a tab's, or the register's. */
export function linesOf(s: Pick<PosState, 'tabs' | 'cart'>, target: DishTarget): CartItem[] {
  return target === 'cart' ? s.cart : (tabById(s, target.tabId)?.lines ?? []);
}

/** Whether `payTab` would be accepted: the rail is empty, or already holds this tab. */
export const canPayTab = (s: Pick<PosState, 'cart' | 'payingTabId'>, tabId: string): boolean =>
  s.cart.length === 0 || s.payingTabId === tabId;

/** The table a tab is on, if any. */
export function tableOf(s: Pick<RestaurantState, 'floor'>, tableId: string | undefined) {
  return tableId ? allTables(s.floor).find((x) => x.table.id === tableId) : undefined;
}

// ─── Reducer ────────────────────────────────────────────────────────────────

export function restaurantReducer(state: PosState, action: RestaurantAction): PosState {
  const now = demoNow();
  const today = toDateStr(now);
  const seq = state.restaurantSeq;

  /** Apply `fn` to a target's lines, wherever they live. */
  const withLines = (target: DishTarget, fn: (lines: CartItem[]) => CartItem[]): PosState =>
    target === 'cart'
      ? { ...state, cart: fn(state.cart) }
      : { ...state, tabs: state.tabs.map((t) => (t.id === target.tabId ? { ...t, lines: fn(t.lines) } : t)) };

  const lineAt = (target: DishTarget, lineId: string) => linesOf(state, target).find((l) => l.dish?.lineId === lineId);

  // While a tab is on the register being paid, the register's lines are *copies* of the tab's.
  // A dish added, changed or fired there would be paid with the tab but never written back to
  // it, and would reach the kitchen labelled "Counter". Paying is a checkout step, not an order
  // being built: finish it, or clear it, first. Found by the engineer building Quick Order.
  const dishOnPayingRail =
    state.payingTabId !== null &&
    'target' in action &&
    action.target === 'cart' &&
    (action.type === 'addDish' ||
      action.type === 'editDish' ||
      action.type === 'removeDish' ||
      action.type === 'voidDish' ||
      action.type === 'moveDish' ||
      action.type === 'splitDish' ||
      action.type === 'discountDish' ||
      action.type === 'sendToKitchen');
  if (dishOnPayingRail) return state;

  switch (action.type) {
    case 'openTab': {
      // One tab per table. Opening on an occupied table opens that table's tab instead.
      if (action.tableId) {
        const existing = openTabOn(action.tableId, state.tabs);
        if (existing) return { ...state, activeTabId: existing.id };
      }
      const id = `T-${seq.tab + 1}`;
      const table = tableOf(state, action.tableId)?.table;
      const tab: Tab = {
        id,
        name: action.name?.trim() || (table ? tableLabel(table) : `Tab ${seq.tab + 1}`),
        tableId: action.tableId,
        reservationId: action.reservationId,
        customerId: action.customerId,
        guests: Math.max(1, action.guests),
        serverId: action.serverId ?? state.operatorId,
        openedDate: today,
        openedAt: clock(now),
        lines: [],
        status: 'open',
      };
      return { ...state, tabs: [...state.tabs, tab], activeTabId: id, restaurantSeq: { ...seq, tab: seq.tab + 1 } };
    }

    case 'setActiveTab':
      return { ...state, activeTabId: action.tabId };

    case 'patchTab':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId
            ? { ...t, ...action.patch, guests: action.patch.guests != null ? Math.max(1, action.patch.guests) : t.guests }
            : t,
        ),
      };

    case 'moveTab': {
      if (action.tableId && openTabOn(action.tableId, state.tabs.filter((t) => t.id !== action.tabId))) return state;
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.id === action.tabId ? { ...t, tableId: action.tableId ?? undefined } : t)),
      };
    }

    case 'addDish': {
      const item = menuItem(action.menuItemId);
      if (!item) return state;
      const lineId = `L-${seq.line + 1}`;
      const line = dishLine(item, action.modifiers, { lineId, seat: action.seat, note: action.note, qty: action.qty });
      return { ...withLines(action.target, (ls) => [...ls, line]), restaurantSeq: { ...seq, line: seq.line + 1 } };
    }

    case 'editDish': {
      const line = lineAt(action.target, action.lineId);
      if (!line || isSent(line)) return state;
      return withLines(action.target, (ls) => ls.map((l) => (l.dish?.lineId === action.lineId ? editDish(l, action.patch) : l)));
    }

    case 'removeDish': {
      const line = lineAt(action.target, action.lineId);
      if (!line || isSent(line)) return state;
      return withLines(action.target, (ls) => ls.filter((l) => l.dish?.lineId !== action.lineId));
    }

    case 'voidDish': {
      const line = lineAt(action.target, action.lineId);
      if (!line || !isSent(line)) return state;
      return withLines(action.target, (ls) => ls.map((l) => (l.dish?.lineId === action.lineId ? voidDish(l) : l)));
    }

    case 'moveDish':
      return withLines(action.target, (ls) => ls.map((l) => (l.dish?.lineId === action.lineId ? moveDishLine(l, action.seat) : l)));

    case 'splitDish': {
      const lineId = `L-${seq.line + 1}`;
      const before = linesOf(state, action.target);
      const after = splitDishLines(before, action.lineId, action.seat, lineId);
      if (after === before) return state;
      return { ...withLines(action.target, () => after), restaurantSeq: { ...seq, line: seq.line + 1 } };
    }

    case 'discountDish':
      return withLines(action.target, (ls) => ls.map((l) => (l.dish?.lineId === action.lineId ? discountDishLine(l, action.pct) : l)));

    case 'sendToKitchen': {
      const tab = action.target === 'cart' ? undefined : tabById(state, action.target.tabId);
      const label = tab
        ? tab.tableId
          ? tableLabel(tableOf(state, tab.tableId)?.table)
          : tab.name
        : 'Counter';
      const ticketId = `K-${seq.ticket + 1}`;
      const r = sendToKitchen(linesOf(state, action.target), { ticketId, date: today, time: clock(now), label, tabId: tab?.id });
      if (!r.ticket) return state;
      return {
        ...withLines(action.target, () => r.lines),
        kitchenTickets: [...state.kitchenTickets, r.ticket],
        restaurantSeq: { ...seq, ticket: seq.ticket + 1 },
      };
    }

    case 'payTab': {
      const tab = tabById(state, action.tabId);
      if (!tab || tab.status !== 'open' || !canPayTab(state, tab.id)) return state;
      return {
        ...state,
        // Voided dishes cost nothing and are not on the bill.
        cart: tab.lines.filter((l) => !l.dish?.voided),
        payingTabId: tab.id,
        selectedBookingId: null,
        view: 'pos',
        leftPanelCollapsed: false,
      };
    }

    case 'saveFloor':
      return { ...state, floor: action.rooms };

    case 'setFloorRoom':
      return state.floor.some((r) => r.id === action.roomId) ? { ...state, floorRoomId: action.roomId } : state;

    case 'createReservation': {
      const id = `R-${seq.reservation + 1}`;
      const r: DiningReservation = { ...action.reservation, id, status: action.reservation.status ?? 'booked' };
      return { ...state, diningReservations: [...state.diningReservations, r], restaurantSeq: { ...seq, reservation: seq.reservation + 1 } };
    }

    case 'patchReservation':
      return {
        ...state,
        diningReservations: state.diningReservations.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      };

    case 'seatReservation': {
      const r = state.diningReservations.find((x) => x.id === action.id);
      if (!r || r.status !== 'booked') return state;
      if (openTabOn(action.tableId, state.tabs)) return state;
      const table = tableOf(state, action.tableId)?.table;
      if (!table) return state;
      const opened = restaurantReducer(state, {
        type: 'openTab',
        name: `${tableLabel(table)} · ${r.name.split(',')[0]}`,
        tableId: action.tableId,
        guests: r.partySize,
        serverId: action.serverId,
        customerId: r.customerId,
        reservationId: r.id,
      });
      return {
        ...opened,
        diningReservations: opened.diningReservations.map((x) =>
          x.id === r.id ? { ...x, status: 'seated', tableId: action.tableId, tabId: opened.activeTabId ?? undefined } : x,
        ),
      };
    }

    case 'adjustTip':
      return {
        ...state,
        payments: state.payments.map((p) =>
          p.id === action.paymentId && p.method === 'card'
            ? { ...p, tip: Math.max(0, Math.round(action.tip * 100) / 100), tipAdjustedAt: clock(now) }
            : p,
        ),
      };

    case 'setOperator':
      return { ...state, operatorId: action.staffId };
  }
}

/**
 * What `recordPayment` adds for the restaurant: the payment goes in the ledger, and a tab being
 * paid is closed — which frees its table, and completes its reservation.
 *
 * Returned as a `Pick`, so it cannot grow a key that collides with another slice's payment hook.
 */
export function recordRestaurantPayment(
  state: PosState,
  payment: { method: string; amount: number; tip?: number; orderNumber: string; ref?: import('../logic/orders').PaymentRef },
): Pick<PosState, 'payments' | 'tabs' | 'diningReservations' | 'payingTabId' | 'restaurantSeq'> {
  const now = demoNow();
  const tip = Math.max(0, payment.tip ?? 0);
  const tab = tabById(state, state.payingTabId);
  const record: PaymentRecord = {
    id: `P-${state.restaurantSeq.payment + 1}`,
    date: toDateStr(now),
    time: clock(now),
    method: payment.method,
    amount: Math.round((payment.amount - tip) * 100) / 100,
    tip,
    orderNumber: payment.orderNumber,
    tabId: tab?.id,
    staffId: tab?.serverId ?? state.operatorId,
    kind: 'sale',
    // Wave 3's tenders say what they drew on; a card on file carries its last four.
    ref: payment.ref,
    cardLast4: payment.ref?.cardLast4,
  };
  return {
    payments: [...state.payments, record],
    tabs: tab ? state.tabs.map((t) => (t.id === tab.id ? { ...t, status: 'paid', paidAt: clock(now) } : t)) : state.tabs,
    diningReservations: tab?.reservationId
      ? state.diningReservations.map((r) => (r.id === tab.reservationId ? { ...r, status: 'completed' } : r))
      : state.diningReservations,
    payingTabId: null,
    restaurantSeq: { ...state.restaurantSeq, payment: state.restaurantSeq.payment + 1 },
  };
}
