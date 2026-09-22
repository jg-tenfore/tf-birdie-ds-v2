import type { CustomerEdits } from '../data/roster';
import type { Customer } from '../data/customers';
import type { ShiftKey } from '../../theme/tokens';
import { DEFAULT_TEE_SHEET_SETTINGS, toDateStr } from '../data/courses';
import { DEMO_TODAY, demoNow } from '../data/bookings';
import { ALL_GOLFERS } from '../data/golfers';
import type { OrderScenario } from './scenarios';
import { buildVenue, venue, venueBookings } from '../data/venues';
import type { VenueId } from '../data/venues';
import * as cartLogic from '../logic/cart';
import { timeRowKey } from '../logic/rates';
import type { RateContext } from '../logic/rates';
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
  | {
      kind: 'newBooking';
      courseId: string;
      timeMin: number;
      startSlot: number;
      /** Party size implied by which open cell was clicked — the Nth seats N. */
      players?: number;
      /** Slots in that opening; the party can't exceed it without overlapping a booking. */
      maxPlayers?: number;
    }
  | { kind: 'actionPanel'; action: 'checkin' | 'refund' | 'raincheck' }
  | { kind: 'blockTime'; timeMin: number; editing?: boolean }
  | { kind: 'timeNote'; timeMin: number }
  | { kind: 'timePrice'; timeMin: number }
  | { kind: 'league'; timeMin: number; editGroupId?: string }
  | { kind: 'movePlayers'; timeMin: number }
  | { kind: 'courseTimeSettings'; courseId: string }
  | { kind: 'courseRates'; courseId: string }
  | { kind: 'checkout' }
  /** `tip` is what checkout recalculated in, so the reader charges the checkout total. */
  | { kind: 'paymentReader'; method: string; tip?: number }
  | { kind: 'confirm'; title: string; body: string; confirmLabel: string; onConfirm: string }
  | { kind: 'teeSheetSearch' }
  /** Handing a cart key to one player (Weston Edits, round 3). */
  | { kind: 'cartSignout'; bookingId: string; seat: number };

/** The reservation panel's tabs, in order. */
/**
 * The reservation's tabs.
 *
 * Four, not five. The Customer tab went in Weston's third round — "I don't think it needs to be
 * a tab on the reservation, I wonder if it's its own thing" — because a customer record is not
 * a property of a reservation. Tapping the player's name opens it (`customerModal`).
 */
export const RESERVATION_TABS = ['players', 'financial', 'notes', 'activity'] as const;
export type ReservationTab = (typeof RESERVATION_TABS)[number];

/**
 * The reservation slide-over (Weston Edits): which booking, which tab, and which player the
 * Customer tab is showing. Not a `Modal` — it sits beside the tee sheet rather than over it,
 * and a dialog (the roster search, a confirm) can open on top of it.
 */
export interface ReservationPanelState {
  bookingId: string;
  tab: ReservationTab;
  playerIndex: number;
  /**
   * `'modal'` renders the same content as a centred dialog — Storybook's comparison only,
   * since Weston "can be convinced either way". Not linkable; the prototype always slides.
   */
  presentation?: 'panel' | 'modal';
  /**
   * Overrides the edition's default width for this one panel — a story's switch, so a single
   * page can show the same booking at three sizes.
   */
  width?: PanelWidth;
}

/**
 * How wide the slide-over runs.
 *
 * Weston's third round: "I wonder if it should take up more space… I don't know if we need to
 * collapse the tee sheet. I think it's more important to have this bigger than to show more of
 * the tee sheet." Three sizes rather than one, because he asked to feel the difference on the
 * tablet before committing.
 *
 *  - `standard` — 640. Wider than the 480 he was looking at; with the order rail collapsed the
 *    sheet still shows both nines.
 *  - `wide` — 820. Room for the rate tiles beside a two-column player row; the sheet keeps
 *    about one nine.
 *  - `cover` — the whole sheet. Maximum room, still one ✕ back to where you were.
 */
export type PanelWidth = 'standard' | 'wide' | 'cover';

export const PANEL_WIDTHS: Record<PanelWidth, number> = { standard: 640, wide: 820, cover: 0 };

/**
 * The customer record, open over everything.
 *
 * Not part of the reservation: it is opened *from* a seat but it is the person's record, and
 * closing it leaves the reservation exactly as it was. `seat` is carried so that linking or
 * creating a customer knows which chair it is filling — null when the record was opened from
 * somewhere else, like a booking's menu on the tee sheet.
 */
export interface CustomerModalState {
  customerId: string | null;
  bookingId?: string;
  seat?: number;
  /** Opened on an empty seat: the record starts in search-and-assign mode. */
  assigning?: boolean;
}

/**
 * Story-level switches for the variants Weston asked to compare rather than choose.
 *
 * They live on state so a story can set one and every component below reads it, and so the
 * prototype can ship one default without a second code path. None of them are linkable — a
 * prototype URL never carries a variant.
 */
export interface WestonOptions {
  panelWidth: PanelWidth;
  /** `comfortable` gives the rate and transport names their own lines; `dense` is V1's one-liner. */
  rowDensity: 'comfortable' | 'dense';
  /** `toggle` keeps the walk/ride/push icons on the row; `named` prints the transport rate. */
  transportStyle: 'toggle' | 'named';
  /** `heavy` swaps in the 26-rate course, to exercise the grid's overflow. */
  rateCatalog: 'standard' | 'heavy';
}

export const DEFAULT_WESTON_OPTIONS: WestonOptions = {
  panelWidth: 'standard',
  rowDensity: 'comfortable',
  transportStyle: 'toggle',
  rateCatalog: 'standard',
};

/** A right-click / long-press menu anchored to a booking chip or a time label. */
export type ContextMenuState =
  | { kind: 'booking'; bookingId: string; x: number; y: number }
  | { kind: 'timeLabel'; timeMin: number; x: number; y: number }
  | null;

// ─── State ──────────────────────────────────────────────────────────────────

export interface PosState {
  view: MainView;

  /**
   * Which club this is — three nines, one 18-hole course split into its nines, or a single
   * nine. The only thing that differs between the three published prototypes.
   *
   * It seeds `courses` and `bookings`; nothing reads it at render time except the register's
   * top bar, so changing it means rebuilding state rather than flipping a flag.
   */
  venueId: VenueId;

  /** Every booking across the 11-day demo window. */
  bookings: Booking[];
  /**
   * Dates (`YYYY-MM-DD`) that have had a generated demo day added (`fillDemoDay`, Weston
   * Edits). A date here is never generated again, so clearing every booking on it leaves it
   * empty for the session rather than refilling it on the next visit.
   */
  generatedDates: string[];
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
  /**
   * The customer picked for a tee time being booked on the phone.
   *
   * Deliberately not `selectedGolfer`: that is the open order's customer, and booking a tee
   * time for someone else must not replace the golfer on an order in progress.
   */
  bookingGolfer: Golfer | null;
  /**
   * Customers created this session. The roster itself (`ALL_GOLFERS`) is fixed demo data;
   * read `golferRoster(state)` to get both.
   */
  addedGolfers: Golfer[];
  /**
   * Which named scenario seeded the cart, if any.
   *
   * Carts are far too large for a URL, so a deep link names a scenario instead of
   * serializing line items. This records the name so the link can be regenerated. It is
   * only ever a claim about where the order *started* — once the operator edits the cart,
   * the link restores the scenario's opening state, not their edits.
   */
  orderScenario: OrderScenario | null;

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
  /** The reservation slide-over (Weston Edits), when open. */
  reservationPanel: ReservationPanelState | null;
  /** The customer record, layered over everything (Weston Edits, round 3). */
  customerModal: CustomerModalState | null;
  /**
   * Which seats of `selectedBookingId` are on the order.
   *
   * Weston's third round put an **Add to cart** on each player row, so a foursome splitting the
   * bill rings up two seats now and two later. Empty means the whole booking — which is what
   * Check in & pay loads, and what every surface did before per-seat existed.
   */
  orderSeats: number[] | null;
  /** Variant switches for the comparisons Weston asked to see. Story-driven. */
  weston: WestonOptions;
  /**
   * Edits made to customer records this session, keyed by customer id.
   *
   * An overlay over the committed roster rather than a mutation of it, so a demo always starts
   * from the same place. Read through `liveCustomer` / `liveRoster` — an edit the record shows
   * but the player row does not is the same class of bug as a discount the row shows and the
   * register does not charge.
   */
  customerEdits: CustomerEdits;
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

/**
 * Fresh state with the demo data loaded.
 *
 * `venueId` decides the course layout and which bookings come with it. An explicit
 * `courses` or `bookings` override still wins — that is how a story pins an unusual layout
 * (a hidden course, a locked one) without inventing a venue for it.
 */
export function createInitialState(overrides: Partial<PosState> = {}): PosState {
  const venueId = overrides.venueId ?? buildVenue();
  const config = venue(venueId);

  return {
    view: 'pos',
    venueId,
    bookings: venueBookings(venueId),
    generatedDates: [],
    courses: config.courses.map((c) => ({ ...c })),
    settings: { ...DEFAULT_TEE_SHEET_SETTINGS },
    cart: [],
    selectedGolfer: null,
    selectedBookingId: null,
    flowMode: '',
    additionalGolfers: [],
    bookingGolfer: null,
    addedGolfers: [],
    orderScenario: null,
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
    reservationPanel: null,
    customerModal: null,
    orderSeats: null,
    weston: { ...DEFAULT_WESTON_OPTIONS },
    customerEdits: {},
    contextMenu: null,
    toast: null,
    lastPayment: null,
    ...overrides,
  };
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'setView'; view: MainView }
  | {
      type: 'openCustomerModal';
      customerId: string | null;
      bookingId?: string;
      seat?: number;
      assigning?: boolean;
    }
  | { type: 'closeCustomerModal' }
  | { type: 'addSeatToOrder'; bookingId: string; seat: number }
  | { type: 'stepReservation'; delta: 1 | -1 }
  | { type: 'setWestonOption'; patch: Partial<WestonOptions> }
  | { type: 'patchCustomer'; customerId: string; patch: Partial<Customer> }
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
  | { type: 'setBookingGolfer'; golfer: Golfer | null }
  | { type: 'addGolfer'; golfer: Golfer }
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
  /**
   * A generated demo day (Weston Edits): adds its bookings and records the date in
   * `generatedDates` in one step, so the day is filled at most once.
   */
  | { type: 'fillDemoDay'; date: string; bookings: Booking[] }
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
  // Reservation panel (Weston Edits)
  | { type: 'openReservation'; bookingId: string; tab?: ReservationTab; playerIndex?: number }
  /**
   * Weston Edits: a walk-in as a reservation. Adds the booking `planWalkIn` built, shows
   * today's tee sheet and opens it in the reservation panel, where the party is set up.
   */
  | { type: 'startWalkIn'; booking: Booking }
  | { type: 'setReservationTab'; tab: ReservationTab; playerIndex?: number }
  | { type: 'selectReservationPlayer'; playerIndex: number }
  | { type: 'closeReservation' }
  | { type: 'openContextMenu'; menu: ContextMenuState }
  | { type: 'closeContextMenu' }
  | { type: 'toast'; message: string | null }
  // Deep linking: merge a state patch parsed from the URL (initial load, or back/forward).
  | { type: 'applyUrl'; patch: Partial<PosState> };

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
    case 'openCustomerModal':
      return {
        ...state,
        customerModal: {
          customerId: action.customerId,
          bookingId: action.bookingId,
          seat: action.seat,
          assigning: action.assigning,
        },
      };
    case 'closeCustomerModal':
      return { ...state, customerModal: null };
    case 'setWestonOption':
      return { ...state, weston: { ...state.weston, ...action.patch } };
    case 'patchCustomer':
      return {
        ...state,
        customerEdits: {
          ...state.customerEdits,
          [action.customerId]: { ...state.customerEdits[action.customerId], ...action.patch },
        },
      };
    case 'toggleLeftPanel':
      return { ...state, leftPanelCollapsed: action.collapsed ?? !state.leftPanelCollapsed };
    case 'openModal':
      return { ...state, modal: action.modal, contextMenu: null };
    case 'closeModal':
      return { ...state, modal: null };
    case 'openReservation': {
      // Clicking another booking switches the panel; the same booking keeps its tab.
      const same = state.reservationPanel?.bookingId === action.bookingId;
      return {
        ...state,
        contextMenu: null,
        reservationPanel: {
          bookingId: action.bookingId,
          tab: action.tab ?? (same ? state.reservationPanel!.tab : 'players'),
          playerIndex: action.playerIndex ?? (same ? state.reservationPanel!.playerIndex : 0),
          ...(state.reservationPanel?.presentation && { presentation: state.reservationPanel.presentation }),
        },
      };
    }
    case 'startWalkIn':
      return {
        ...state,
        bookings: [...state.bookings, action.booking],
        view: 'tee',
        currentDate: DEMO_TODAY(),
        flowMode: '',
        currentCategory: null,
        modal: null,
        contextMenu: null,
        reservationPanel: {
          bookingId: action.booking.id,
          tab: 'players',
          playerIndex: 0,
          ...(state.reservationPanel?.presentation && { presentation: state.reservationPanel.presentation }),
        },
      };
    case 'setReservationTab':
      return state.reservationPanel
        ? {
            ...state,
            reservationPanel: {
              ...state.reservationPanel,
              tab: action.tab,
              playerIndex: action.playerIndex ?? state.reservationPanel.playerIndex,
            },
          }
        : state;
    case 'selectReservationPlayer':
      return state.reservationPanel
        ? { ...state, reservationPanel: { ...state.reservationPanel, playerIndex: action.playerIndex } }
        : state;
    case 'closeReservation':
      return { ...state, reservationPanel: null };
    case 'openContextMenu':
      return { ...state, contextMenu: action.menu };
    case 'closeContextMenu':
      return { ...state, contextMenu: null };
    case 'toast':
      return { ...state, toast: action.message };
    case 'applyUrl': {
      // A URL never describes the whole app — only what a link can say. Fields the patch
      // omits (chiefly `modal`, which is absent from a link with no dialog) are reset to
      // their neutral value so pressing Back actually closes a dialog rather than leaving
      // it open.
      //
      // The sheet is session data, not navigation: on the same club, Back / Forward keeps
      // `bookings` (moves, check-ins, new tee times, generated days), `generatedDates`,
      // the course layout, and everything else the patch doesn't name — `addedGolfers`,
      // `timeNotes`, `timePrices`, the cart. `hashToState(hash, session)` already leaves the
      // sheet out; this holds the line for any patch that still carries one. Only a patch
      // for a *different* club re-homes: its bookings and courses replace the session's,
      // and `generatedDates` resets with them — a day filled on the old club would
      // otherwise read as generated and stay empty on the new one.
      const { bookings, courses, generatedDates, ...rest } = action.patch;
      const rehome = action.patch.venueId !== undefined && action.patch.venueId !== state.venueId;
      return {
        ...state,
        modal: null,
        reservationPanel: null,
        contextMenu: null,
        sidebarOpen: false,
        sidebarCourse: null,
        multiSelectActive: false,
        multiSelectIds: [],
        ...rest,
        ...(rehome && {
          bookings: bookings ?? venueBookings(action.patch.venueId!),
          courses: courses ?? venue(action.patch.venueId!).courses.map((c) => ({ ...c })),
          generatedDates: generatedDates ?? [],
        }),
      };
    }

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
      return detachEmptyOrder(state, cartLogic.changeQty(state.cart, action.index, action.delta));
    case 'removeItem':
      return detachEmptyOrder(state, cartLogic.removeItem(state.cart, action.index));
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
      // Seats go with the order they were on.
      return {
        ...state,
        cart: [],
        orderSeats: null,
        selectedGolfer: null,
        selectedBookingId: null,
        flowMode: '',
        additionalGolfers: [],
        currentCategory: null,
        orderScenario: null,
        lastPayment: null,
        modal: null,
      };
    case 'setFlowMode':
      return { ...state, flowMode: action.mode };
    case 'stepReservation': {
      // "Next in line" — Weston liked the idea of moving booking to booking without closing
      // the panel: "if you're just moving fast, you're boom, boom, boom, going through."
      // Ordered by tee time across the courses in view, empty slots skipped, stopping at the
      // ends rather than wrapping — a silent jump back to the morning is disorienting.
      const panel = state.reservationPanel;
      if (!panel) return state;
      const day = dayBookings(state)
        .filter((x) => x.pay !== 'block' && x.pay !== 'event')
        .sort((x, y) => x.timeMin - y.timeMin || x.course.localeCompare(y.course) || x.slot - y.slot);
      const at = day.findIndex((x) => x.id === panel.bookingId);
      const next = day[at + action.delta];
      if (at < 0 || !next) return state;
      return { ...state, reservationPanel: { ...panel, bookingId: next.id, tab: 'players', playerIndex: 0 } };
    }
    case 'addSeatToOrder': {
      const b = state.bookings.find((x) => x.id === action.bookingId);
      if (!b) return state;
      // Adding a seat to a different booking's order starts a fresh one; adding to the same
      // booking tops it up and keeps the retail and F&B lines alone.
      const same = state.selectedBookingId === b.id;
      const seats = [...new Set([...(same ? (state.orderSeats ?? []) : []), action.seat])];
      const extras = same ? state.cart.filter((i) => !i.isCheckIn && !i.isTax && i.name !== 'Taxes') : [];
      return {
        ...state,
        // The rail comes back the moment something lands in the order: an order you cannot see
        // is one nobody checks before charging it.
        leftPanelCollapsed: false,
        selectedBookingId: b.id,
        orderSeats: seats,
        cart: [...cartLogic.buildTeeTimeCart(b, state.courses, rateContext(state), seats), ...extras],
        orderScenario: same ? state.orderScenario : null,
        lastPayment: same ? state.lastPayment : null,
      };
    }
    case 'loadBooking': {
      const b = state.bookings.find((x) => x.id === action.bookingId);
      if (!b) return state;
      // Loading the booking that is already on the order again — "Check in & pay" after
      // "Edit reservation" — rebuilds only its golf: the retail and F&B lines stay.
      const same = state.selectedBookingId === b.id;
      const extras = same ? state.cart.filter((i) => !i.isCheckIn && !i.isTax && i.name !== 'Taxes') : [];
      return {
        ...state,
        view: 'pos',
        leftPanelCollapsed: false,
        selectedBookingId: b.id,
        selectedGolfer: null,
        flowMode: '',
        // Check in & pay tops the order up to the whole booking rather than rebuilding it, so
        // seats added one at a time keep whatever was done to them.
        orderSeats: null,
        cart: [...cartLogic.buildTeeTimeCart(b, state.courses, rateContext(state)), ...extras],
        orderScenario: same ? state.orderScenario : null,
        lastPayment: same ? state.lastPayment : null,
        reservationPanel: null,
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
    case 'setBookingGolfer':
      return { ...state, bookingGolfer: action.golfer };
    case 'addGolfer':
      return { ...state, addedGolfers: [...state.addedGolfers, action.golfer] };
    case 'recordPayment':
      return {
        ...state,
        // The booking behind the order is now paid: every seat that was charged is marked,
        // so reopening it doesn't ask for the same money twice.
        bookings: state.selectedBookingId
          ? state.bookings.map((b) => (b.id === state.selectedBookingId ? markChargedPaid(b, state.cart) : b))
          : state.bookings,
        lastPayment: {
          method: action.method,
          amount: action.amount,
          time: demoNow().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
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
    case 'fillDemoDay':
      if (state.generatedDates.includes(action.date)) return state;
      return {
        ...state,
        bookings: [...state.bookings, ...action.bookings],
        generatedDates: [...state.generatedDates, action.date],
      };
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
        reservationPanel: ids.has(state.reservationPanel?.bookingId ?? '')
          ? null
          : state.reservationPanel,
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

/**
 * After a line edit: if no round is left on the order, it no longer belongs to the booking
 * it was loaded from. Without this the order kept `selectedBookingId` (and its tax row) after
 * the round was removed, so the tee sheet still showed the booking attached and the Pay
 * button still charged its tax.
 */
function detachEmptyOrder(state: PosState, cart: CartItem[]): PosState {
  if (cart.some((i) => i.isCheckIn) || !state.selectedBookingId) return { ...state, cart };
  return { ...state, cart: cartLogic.dropOrphanTax(cart), selectedBookingId: null };
}

/** Mark the seats a payment covered as paid; the booking is paid once nobody owes. */
function markChargedPaid(b: Booking, cart: CartItem[]): Booking {
  const round = cart.find((i) => i.isCheckIn);
  if (!round?.players) return b;
  const playerStates = b.playerStates.map((p, i) =>
    round.players![i] && !round.players![i].noShow && !p.noShow ? { ...p, paid: true } : p,
  );
  const settled = playerStates.every((p) => p.paid || p.noShow);
  return { ...b, playerStates, pay: settled ? 'paid' : b.pay };
}

// ─── Selectors ──────────────────────────────────────────────────────────────

const rosters = new WeakMap<Golfer[], Golfer[]>();

/**
 * Every customer: the demo roster plus anyone created this session, surname-sorted.
 * Sorted once per `addedGolfers` array — pricing reads it for every seat on every render.
 */
export const golferRoster = (s: Pick<PosState, 'addedGolfers'>): Golfer[] => {
  if (!s.addedGolfers?.length) return ALL_GOLFERS;
  let roster = rosters.get(s.addedGolfers);
  if (!roster) {
    roster = [...ALL_GOLFERS, ...s.addedGolfers].sort((a, b) => a.name.localeCompare(b.name));
    rosters.set(s.addedGolfers, roster);
  }
  return roster;
};

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

/** Key for the time-note and time-price maps. Lives in `logic/rates`, which prices by it. */
export { timeRowKey };

/**
 * What pricing a reservation needs from state beyond the booking — the operator's per-row
 * price overrides, and the customer roster that says which players are members. Pass it to
 * `playerFee`, `holesFee`, `buildTeeTimeCart` and friends.
 */
export const rateContext = (s: Pick<PosState, 'timePrices' | 'addedGolfers'>): RateContext => ({
  timePrices: s.timePrices,
  roster: golferRoster(s),
});

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
