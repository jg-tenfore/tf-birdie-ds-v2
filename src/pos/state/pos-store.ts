import type { ShiftKey } from '../../theme/tokens';
import { DEFAULT_TEE_SHEET_SETTINGS, COURSES, toDateStr } from '../data/courses';
import { DEMO_TODAY, createBookings } from '../data/bookings';
import * as cartLogic from '../logic/cart';
import type {
  Booking,
  CartItem,
  CartPlayer,
  CartTeeTime,
  Course,
  FlowMode,
  Golfer,
  MainView,
  TeeSheetSettings,
  TeeSheetViewMode,
  TimeRowNote,
  TimeRowPrice,
  Transport,
} from '../types';

/**
 * Application state for the POS prototype.
 *
 * The original is a single-file app driven by ~40 module-level `let` bindings and
 * hand-called re-render functions. This models the same state as one reducer so
 * React can own rendering, and so the whole app is reproducible from a plain state
 * object — which is what makes the Storybook screen stories possible: each story
 * builds a state, renders, and gets a real screen with no side effects.
 *
 * Everything derived (totals, filtered bookings, player counts) is computed at
 * render time rather than stored, so there is no cache to invalidate.
 */

// ─── Modals ─────────────────────────────────────────────────────────────────

/**
 * Every overlay in the app, as a discriminated union.
 *
 * A single `modal` slot rather than a boolean per dialog: the prototype only ever
 * shows one at a time, and this makes that a type-level guarantee instead of a
 * convention. `returnTo` lets a dialog opened from another dialog return to it —
 * guest details opened from booking detail, for instance.
 */
export type Modal =
  | { kind: 'bookingDetail'; bookingId: string; tab?: number }
  | { kind: 'teePicker'; is18H?: boolean; pendingRate?: string }
  | { kind: 'reserveConfirm'; payMode: 'now' | 'later' }
  | { kind: 'memberLookup'; itemName: string; requiredType: string }
  | { kind: 'golferSearch'; target: 'primary' | { itemIdx: number; playerIdx: number } }
  | { kind: 'guestDetail'; guestIndex: number; returnTo?: Modal }
  | { kind: 'newCustomer' }
  | { kind: 'walkIn' }
  | { kind: 'openItem' }
  | { kind: 'playerModifier'; itemIdx: number; playerIdx: number }
  | { kind: 'newBooking'; courseId: string; timeMin: number; startSlot: number }
  | { kind: 'actionPanel'; action: 'checkin' | 'refund' | 'raincheck' }
  | { kind: 'blockTime'; timeMin: number; editing?: boolean }
  | { kind: 'timeNote'; timeMin: number }
  | { kind: 'timePrice'; timeMin: number }
  | { kind: 'league'; timeMin: number; editGroupId?: string }
  | { kind: 'movePlayers'; timeMin: number }
  | { kind: 'courseTimeSettings'; courseId: string }
  | { kind: 'courseRates'; courseId: string }
  | { kind: 'checkout' }
  | { kind: 'paymentReader'; method: string }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; onConfirm: string }
  | { kind: 'teeSheetSearch' };

/** A right-click / long-press menu anchored to a booking chip or a time label. */
export type ContextMenuState =
  | { kind: 'booking'; bookingId: string; x: number; y: number }
  | { kind: 'timeLabel'; timeMin: number; x: number; y: number }
  | null;

// ─── State ──────────────────────────────────────────────────────────────────

export interface PosState {
  view: MainView;

  /** Every booking across the 11-day demo window. */
  bookings: Booking[];
  /** Mutable copy of `COURSES` — visibility, locks, and notes are edited at runtime. */
  courses: Course[];
  settings: TeeSheetSettings;

  /** Current order. */
  cart: CartItem[];
  /** Set when a round was rung up for a walk-in golfer rather than a reservation. */
  selectedGolfer: Golfer | null;
  /** Set when the order was loaded from a tee-sheet booking. */
  selectedBookingId: string | null;
  flowMode: FlowMode;
  /** Additional named golfers attached before a round is on the cart. */
  additionalGolfers: Golfer[];

  /** POS: which category's items are showing. */
  currentCategory: string | null;
  /** POS: collapsed on the tee sheet to give the grid full width. */
  leftPanelCollapsed: boolean;

  /** Tee sheet. */
  currentDate: Date;
  teeSheetMode: TeeSheetViewMode;
  shift: ShiftKey;
  sidebarOpen: boolean;
  sidebarCourse: string | null;
  multiSelectIds: string[];
  multiSelectActive: boolean;

  /** Operator annotations, keyed `YYYY-M-D_minutesFromMidnight`. */
  timeNotes: Record<string, TimeRowNote>;
  timePrices: Record<string, TimeRowPrice>;

  /** List view filters. */
  listFilters: ListFilters;

  modal: Modal | null;
  contextMenu: ContextMenuState;
  toast: string | null;
  /** Set after a successful checkout so the Pay button can show the paid state. */
  lastPayment: { method: string; amount: number; time: string } | null;
}

export interface ListFilters {
  status: string;
  guest: string;
  membership: string;
  courses: string[];
  holes: string;
  players: string[];
  special: string[];
  sort: 'time' | 'status' | 'course';
  search: string;
}

export const emptyListFilters: ListFilters = {
  status: 'all',
  guest: 'all',
  membership: 'all',
  courses: [],
  holes: 'all',
  players: [],
  special: [],
  sort: 'time',
  search: '',
};

/** Fresh state with the demo data loaded. */
export function createInitialState(overrides: Partial<PosState> = {}): PosState {
  return {
    view: 'pos',
    bookings: createBookings(),
    courses: COURSES.map((c) => ({ ...c })),
    settings: { ...DEFAULT_TEE_SHEET_SETTINGS },
    cart: [],
    selectedGolfer: null,
    selectedBookingId: null,
    flowMode: '',
    additionalGolfers: [],
    currentCategory: null,
    leftPanelCollapsed: false,
    currentDate: DEMO_TODAY(),
    teeSheetMode: 'cal',
    shift: 'full',
    sidebarOpen: false,
    sidebarCourse: null,
    multiSelectIds: [],
    multiSelectActive: false,
    timeNotes: {},
    timePrices: {},
    listFilters: { ...emptyListFilters },
    modal: null,
    contextMenu: null,
    toast: null,
    lastPayment: null,
    ...overrides,
  };
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'setView'; view: MainView }
  | { type: 'setCategory'; category: string | null }
  | { type: 'toggleLeftPanel'; collapsed?: boolean }
  // Cart
  | { type: 'addItem'; name: string; price: number }
  | { type: 'addRawItem'; item: CartItem }
  | { type: 'changeQty'; index: number; delta: number }
  | { type: 'removeItem'; index: number }
  | { type: 'addPlayer'; itemIndex: number }
  | { type: 'removePlayer'; itemIndex: number }
  | { type: 'updatePlayer'; itemIndex: number; playerIndex: number; patch: Partial<CartPlayer> }
  | { type: 'togglePlayerModifier'; itemIndex: number; playerIndex: number; modName: string }
  | { type: 'attachTeeTime'; teeTime: CartTeeTime; back9?: CartTeeTime }
  | { type: 'clearOrder' }
  | { type: 'setFlowMode'; mode: FlowMode }
  | { type: 'loadBooking'; bookingId: string }
  | { type: 'selectGolfer'; golfer: Golfer | null }
  | { type: 'addAdditionalGolfer'; golfer: Golfer }
  | { type: 'removeAdditionalGolfer'; index: number }
  | { type: 'recordPayment'; method: string; amount: number }
  // Tee sheet
  | { type: 'setDate'; date: Date }
  | { type: 'shiftDate'; days: number }
  | { type: 'setTeeSheetMode'; mode: TeeSheetViewMode }
  | { type: 'setShift'; shift: ShiftKey }
  | { type: 'patchSettings'; patch: Partial<TeeSheetSettings> }
  | { type: 'resetSettings' }
  | { type: 'patchCourse'; courseId: string; patch: Partial<Course> }
  | { type: 'showAllCourses' }
  | { type: 'focusCourse'; courseId: string }
  | { type: 'openSidebar'; courseId?: string | null }
  | { type: 'closeSidebar' }
  // Bookings
  | { type: 'addBookings'; bookings: Booking[] }
  | { type: 'patchBooking'; bookingId: string; patch: Partial<Booking> }
  | { type: 'patchBookings'; bookingIds: string[]; patch: Partial<Booking> }
  | { type: 'deleteBookings'; bookingIds: string[] }
  | { type: 'deleteWhere'; predicate: (b: Booking) => boolean }
  // Multi-select
  | { type: 'enterMultiSelect'; seedId?: string }
  | { type: 'exitMultiSelect' }
  | { type: 'toggleMultiSelect'; bookingId: string }
  | { type: 'setMultiSelect'; ids: string[] }
  // Annotations
  | { type: 'setTimeNote'; key: string; note: TimeRowNote | null }
  | { type: 'setTimePrice'; key: string; price: TimeRowPrice | null }
  // List filters
  | { type: 'patchListFilters'; patch: Partial<ListFilters> }
  | { type: 'clearListFilters' }
  // Chrome
  | { type: 'openModal'; modal: Modal }
  | { type: 'closeModal' }
  | { type: 'openContextMenu'; menu: ContextMenuState }
  | { type: 'closeContextMenu' }
  | { type: 'toast'; message: string | null };

/** The cart's check-in line index, or -1. */
const checkInIndex = (cart: CartItem[]) => cart.findIndex((i) => i.isCheckIn);

export function reducer(state: PosState, action: Action): PosState {
  switch (action.type) {
    // ─── Chrome ───────────────────────────────────────────────────────────
    case 'setView':
      return {
        ...state,
        view: action.view,
        // The left panel auto-expands on return to the POS, matching the original.
        leftPanelCollapsed: action.view === 'pos' ? false : state.leftPanelCollapsed,
        teeSheetMode: action.view === 'tee' ? 'cal' : state.teeSheetMode,
      };
    case 'setCategory':
      return { ...state, currentCategory: action.category };
    case 'toggleLeftPanel':
      return { ...state, leftPanelCollapsed: action.collapsed ?? !state.leftPanelCollapsed };
    case 'openModal':
      return { ...state, modal: action.modal, contextMenu: null };
    case 'closeModal':
      return { ...state, modal: null };
    case 'openContextMenu':
      return { ...state, contextMenu: action.menu };
    case 'closeContextMenu':
      return { ...state, contextMenu: null };
    case 'toast':
      return { ...state, toast: action.message };

    // ─── Cart ─────────────────────────────────────────────────────────────
    case 'addItem': {
      const golferName = state.selectedGolfer?.name;
      const cart = cartLogic.addItem(state.cart, action.name, action.price, golferName);
      // Ringing a round with no active flow implicitly starts a walk-in.
      const flowMode =
        !state.flowMode && cartLogic.isCheckInItem(action.name) ? 'walkin' : state.flowMode;
      return { ...state, cart, flowMode };
    }
    case 'addRawItem':
      return { ...state, cart: [...state.cart, action.item] };
    case 'changeQty':
      return { ...state, cart: cartLogic.changeQty(state.cart, action.index, action.delta) };
    case 'removeItem':
      return { ...state, cart: cartLogic.removeItem(state.cart, action.index) };
    case 'addPlayer':
      return { ...state, cart: cartLogic.addPlayer(state.cart, action.itemIndex) };
    case 'removePlayer':
      return { ...state, cart: cartLogic.removePlayer(state.cart, action.itemIndex) };
    case 'updatePlayer':
      return {
        ...state,
        cart: cartLogic.updatePlayer(
          state.cart,
          action.itemIndex,
          action.playerIndex,
          action.patch,
        ),
      };
    case 'togglePlayerModifier':
      return {
        ...state,
        cart: cartLogic.togglePlayerModifier(
          state.cart,
          action.itemIndex,
          action.playerIndex,
          action.modName,
        ),
      };
    case 'attachTeeTime': {
      const idx = checkInIndex(state.cart);
      if (idx === -1) return state;
      const cart = state.cart.map((item, i) =>
        i === idx
          ? { ...item, teeTime: action.teeTime, is18HFront: Boolean(action.back9) }
          : item,
      );
      // An 18-hole reservation carries a second line for the back nine, priced the
      // same, so the crossover slot is visible on the order and the receipt.
      if (action.back9) {
        const front = cart[idx];
        cart.push({
          ...front,
          teeTime: action.back9,
          is18HFront: false,
          is18HBack: true,
        });
      }
      return { ...state, cart };
    }
    case 'clearOrder':
      return {
        ...state,
        cart: [],
        selectedGolfer: null,
        selectedBookingId: null,
        flowMode: '',
        additionalGolfers: [],
        currentCategory: null,
        lastPayment: null,
        modal: null,
      };
    case 'setFlowMode':
      return { ...state, flowMode: action.mode };
    case 'loadBooking': {
      const b = state.bookings.find((x) => x.id === action.bookingId);
      if (!b) return state;
      return {
        ...state,
        view: 'pos',
        leftPanelCollapsed: false,
        selectedBookingId: b.id,
        selectedGolfer: null,
        flowMode: '',
        cart: cartLogic.buildTeeTimeCart(b),
        lastPayment: null,
      };
    }
    case 'selectGolfer':
      return { ...state, selectedGolfer: action.golfer };
    case 'addAdditionalGolfer':
      return { ...state, additionalGolfers: [...state.additionalGolfers, action.golfer] };
    case 'removeAdditionalGolfer':
      return {
        ...state,
        additionalGolfers: state.additionalGolfers.filter((_, i) => i !== action.index),
      };
    case 'recordPayment':
      return {
        ...state,
        lastPayment: {
          method: action.method,
          amount: action.amount,
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        },
      };

    // ─── Tee sheet ────────────────────────────────────────────────────────
    case 'setDate':
      return { ...state, currentDate: action.date };
    case 'shiftDate': {
      const d = new Date(state.currentDate);
      d.setDate(d.getDate() + action.days);
      return { ...state, currentDate: d };
    }
    case 'setTeeSheetMode':
      return { ...state, teeSheetMode: action.mode };
    case 'setShift':
      return { ...state, shift: action.shift };
    case 'patchSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'resetSettings':
      return { ...state, settings: { ...DEFAULT_TEE_SHEET_SETTINGS } };
    case 'patchCourse':
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.courseId ? { ...c, ...action.patch } : c,
        ),
      };
    case 'showAllCourses':
      return { ...state, courses: state.courses.map((c) => ({ ...c, visible: true })) };
    case 'focusCourse':
      return {
        ...state,
        courses: state.courses.map((c) => ({ ...c, visible: c.id === action.courseId })),
      };
    case 'openSidebar':
      return { ...state, sidebarOpen: true, sidebarCourse: action.courseId ?? null };
    case 'closeSidebar':
      return { ...state, sidebarOpen: false, sidebarCourse: null };

    // ─── Bookings ─────────────────────────────────────────────────────────
    case 'addBookings':
      return { ...state, bookings: [...state.bookings, ...action.bookings] };
    case 'patchBooking':
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.bookingId ? { ...b, ...action.patch } : b,
        ),
      };
    case 'patchBookings': {
      const ids = new Set(action.bookingIds);
      return {
        ...state,
        bookings: state.bookings.map((b) => (ids.has(b.id) ? { ...b, ...action.patch } : b)),
      };
    }
    case 'deleteBookings': {
      const ids = new Set(action.bookingIds);
      return {
        ...state,
        bookings: state.bookings.filter((b) => !ids.has(b.id)),
        multiSelectIds: state.multiSelectIds.filter((id) => !ids.has(id)),
        selectedBookingId: ids.has(state.selectedBookingId ?? '')
          ? null
          : state.selectedBookingId,
      };
    }
    case 'deleteWhere':
      return { ...state, bookings: state.bookings.filter((b) => !action.predicate(b)) };

    // ─── Multi-select ─────────────────────────────────────────────────────
    case 'enterMultiSelect':
      return {
        ...state,
        multiSelectActive: true,
        multiSelectIds: action.seedId ? [action.seedId] : [],
        contextMenu: null,
      };
    case 'exitMultiSelect':
      return { ...state, multiSelectActive: false, multiSelectIds: [] };
    case 'toggleMultiSelect': {
      const has = state.multiSelectIds.includes(action.bookingId);
      return {
        ...state,
        multiSelectIds: has
          ? state.multiSelectIds.filter((id) => id !== action.bookingId)
          : [...state.multiSelectIds, action.bookingId],
      };
    }
    case 'setMultiSelect':
      return { ...state, multiSelectIds: action.ids };

    // ─── Annotations ──────────────────────────────────────────────────────
    case 'setTimeNote': {
      const timeNotes = { ...state.timeNotes };
      if (action.note) timeNotes[action.key] = action.note;
      else delete timeNotes[action.key];
      return { ...state, timeNotes };
    }
    case 'setTimePrice': {
      const timePrices = { ...state.timePrices };
      if (action.price) timePrices[action.key] = action.price;
      else delete timePrices[action.key];
      return { ...state, timePrices };
    }

    // ─── List filters ─────────────────────────────────────────────────────
    case 'patchListFilters':
      return { ...state, listFilters: { ...state.listFilters, ...action.patch } };
    case 'clearListFilters':
      return { ...state, listFilters: { ...emptyListFilters } };

    default:
      return state;
  }
}

// ─── Selectors ──────────────────────────────────────────────────────────────

/** The booking backing the current order, if it came from the tee sheet. */
export const selectedBooking = (s: PosState): Booking | null =>
  s.bookings.find((b) => b.id === s.selectedBookingId) ?? null;

/** Bookings on the currently-viewed date. */
export const dayBookings = (s: PosState): Booking[] => {
  const dateStr = toDateStr(s.currentDate);
  return s.bookings.filter((b) => b.date === dateStr);
};

/** Visible courses, in configured order. */
export const visibleCourses = (s: PosState): Course[] => s.courses.filter((c) => c.visible);

/** Total golfers booked today, excluding blocks and league events. */
export const dayGolferCount = (s: PosState): number =>
  dayBookings(s).reduce(
    (sum, b) => (b.pay === 'block' || b.pay === 'event' ? sum : sum + b.players),
    0,
  );

/** Key for the time-note and time-price maps. */
export const timeRowKey = (date: Date, timeMin: number): string =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${timeMin}`;

/** How many players a booking has that are not marked no-show. */
export const activePlayers = (b: Booking): number =>
  b.players - (b.playerStates ?? []).filter((p) => p.noShow).length;

/** Transport mode chosen by the majority of a cart line's players. */
export function dominantTransport(players: CartPlayer[] | undefined): Transport {
  if (!players?.length) return 'walking';
  const counts = players.reduce<Record<string, number>>((acc, p) => {
    acc[p.transport] = (acc[p.transport] ?? 0) + 1;
    return acc;
  }, {});
  if (counts.cart) return 'cart';
  if (counts.push) return 'push';
  return 'walking';
}
