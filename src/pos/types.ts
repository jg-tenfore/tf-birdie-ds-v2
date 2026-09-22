import type { MemberTypeKey, NoteColorKey } from '../theme/tokens';

/**
 * Domain types for the Birdie POS.
 *
 * These describe the prototype's runtime shapes as they actually exist, not an
 * idealized model — field names (`n`/`p` for catalog items, `pay` for payment
 * state, `timeMin` for minutes-from-midnight) are kept verbatim so the ported
 * data files stay diffable against the original prototype.
 */

// ─── Catalog ────────────────────────────────────────────────────────────────

/** A sellable tile. `n` is the display name, `p` the price in dollars. */
export interface CatalogItem {
  n: string;
  p: number;
  /** Membership tier required to ring this item, if any. */
  memberType?: MemberTypeKey | null;
  /** Short badge shown on the cart line once applied (modifiers only). */
  tag?: string;
  tagColor?: string;
  desc?: string;
  /** Riding/push cart — mutually exclusive per player. */
  isTransport?: boolean;
  /** Reduces the round price rather than adding a line. */
  isDiscount?: boolean;
  /** Replaces the round price outright (e.g. Comp Round → $0). */
  isOverride?: boolean;
  overridePrice?: number;
}

export interface CatalogCategory {
  /** Tile fill color; drives the category button and its item tiles. */
  color: string;
  /** Text color that reads on `color`. */
  tc: string;
  /** Modifier categories attach to an existing check-in line instead of adding one. */
  isModifier?: boolean;
  items: CatalogItem[];
}

export type CategoryName = string;

/** A catalog item flattened with its owning category, for global search. */
export type SearchableItem = CatalogItem & { cat: CategoryName };

// ─── People ─────────────────────────────────────────────────────────────────

export interface Golfer {
  id: string;
  /** Stored "Last, First" — the POS sorts and displays surname-first. */
  name: string;
  phone: string;
  email: string;
  type: 'Member' | 'Guest';
  memberType: MemberTypeKey | null;
  hcp: number;
  /** `YYYY-MM` join month; null for guests. Present in MEMBER_DB only. */
  joined?: string | null;
  notes?: string;
}

// ─── Courses & time ─────────────────────────────────────────────────────────

/**
 * A parallel time track on a course. Pass 1 of the prototype edits track 0 only;
 * the Time Settings modal is built to expose up to three.
 */
export interface CourseTrack {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  intervalMins: number;
}

export interface Course {
  id: string;
  name: string;
  /** Display string on the column header, e.g. `'9 HOLES'` or `'FRONT 9'`. */
  holes: string;
  /**
   * Holes in a round teed off here — 9 or 18.
   *
   * Separate from `holes` because that is a *label*: an 18-hole club's front nine displays
   * "FRONT 9" but a round there is still 18. Pricing and round labels read this; parsing the
   * display string (as the original prototype did) breaks the moment a course isn't named
   * "N HOLES".
   */
  holeCount: 9 | 18;
  /** Players per tee time — the number of columns in this course's grid group. */
  slots: number;
  visible: boolean;
  locked: boolean;
  note: string;
  /** When true this column scrolls independently of the others. */
  indScroll: boolean;
  tracks?: CourseTrack[];
}

/** One tee-sheet row. `totalMin` is minutes from midnight. */
export interface TimeSlot {
  h: number;
  m: number;
  totalMin: number;
  /** Pre-formatted 12-hour label, e.g. `'7:28 AM'`. */
  label: string;
}

/** Tee-sheet display preferences (the gear panel on the tee sheet toolbar). */
export interface TeeSheetSettings {
  slots: number;
  compactMode: boolean;
  hideEmpty: boolean;
  intervalMins: number;
  gridStartHour: number;
  gridEndHour: number;
  autoScrollNow: boolean;
  colorblindMode: boolean;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'booked'
  | 'walkin'
  | 'member'
  | 'checkedin'
  | 'group'
  /** Non-bookable slot (maintenance, ranger hold, shift change). */
  | 'block'
  /** League/outing occupying a slot span. */
  | 'event';

export type PayStatus = 'paid' | 'open' | 'rain_chk' | 'no_show' | 'refund' | 'block' | 'event';

export type Transport = 'walking' | 'cart' | 'push';

/**
 * Per-player round state.
 *
 * `step` is how far the player's round has got: `-1` not arrived, `0` checked in,
 * `1` teed off, `2` at the turn, `3` finished. The generated fixtures also use `6`
 * for "round finished on a past day", which reads as Finished. The meanings live in
 * `ROUND_STEPS` (`data/config.ts`); resolve a value with `roundStepOf`, never by
 * indexing, and treat `step >= 0` as checked in.
 */
export interface PlayerState {
  paid: boolean;
  step: number;
  noShow: boolean;
  /**
   * Per-player overrides, set from the reservation (Weston Edits). Absent means the
   * booking's own value: `holes` falls back to `booking.holes`, `fee` to `booking.price`,
   * `transport` to `booking.cart`. On an 18-hole course a 9-hole player plays the front.
   */
  holes?: 9 | 18;
  fee?: number;
  transport?: Transport;
  /**
   * The rate this seat is sold on (`rate-catalog.ts`), chosen from the tile grid.
   *
   * Absent means nobody has picked one, and the seat reads the rate the system would pick
   * from the player's own record (`autoRate`). Storing the choice rather than the number is
   * what lets the row print "Course Level Fee : $26.00" instead of a bare amount, and what
   * keeps a switched 9 ↔ 18 on the same *rate* rather than resetting to rack.
   */
  rateId?: string;
  /**
   * The transport row this seat is sold on. Absent falls back to the default row for the
   * booking's mode, so a booking made before transport had a catalog still prices correctly.
   */
  transportRateId?: string;
  /** A typed-over transport price, the way `fee` overrides the green fee. */
  transportFee?: number;
  /** A discount preset applied to the seat, and the amount when it is a manual one. */
  discountId?: string;
  discountManual?: number;
  /** The cart signed out to this player, if any. Drives the key glyph on the chip. */
  cartKey?: number;
  /**
   * The green fee paid with a punch card instead of money.
   *
   * A punch card holds prepaid **rounds** — "20-Round Punch Card" — so a punch buys the round,
   * not the ride: the green fee goes to zero and transport is still billed at its own rate.
   * `customerId` is carried because the card need not be the player's own; a member can put a
   * guest's round on theirs, which is the whole reason the old prototype had "use other
   * customer's punchcards".
   *
   * The punch is spent when the round checks in, not when it is applied — an applied punch on
   * a reservation nobody checked in has not been used.
   */
  punch?: { customerId: string; cardName: string };
}

/**
 * ID.me verification groups. Shown as a badge on a player (Weston Edits) — badge only for
 * now: the verify flow waits on how Birdie presents it today.
 */
export type IdMeGroup = 'military' | 'veteran' | 'first_responder' | 'nurse' | 'teacher';

/** A named player on a booking, hydrated from CRM or typed in at the counter. */
export interface BookingGuest {
  name: string;
  phone?: string;
  email?: string;
  memberType?: MemberTypeKey | null;
  hcp?: number | string;
  notes?: string;
  /** Set when the guest was linked to a CRM record rather than typed free-form. */
  crmId?: string;
}

export interface ActivityEntry {
  time: string;
  label: string;
  detail?: string;
  icon?: string;
  color?: string;
}

export interface FinancialAction {
  time: string;
  label: string;
  player: string;
  type: 'refund' | 'raincheck' | 'raincheck_all';
}

/** Transport surcharges for a league, keyed by transport mode. */
export type TransportPrices = Record<Transport, number>;

/** Shared configuration for every booking generated by one league/outing. */
export interface GroupMeta {
  groupId: string;
  name: string;
  holes: 9 | 18;
  /** Total players the league needs seated. */
  want: number;
  greenFee: number;
  transportPrices: TransportPrices;
  startMin: number;
  dateStr: string;
  rangeEndMin: number;
  /** Minutes between the front-9 and back-9 crossover for 18-hole leagues. */
  duration: number;
  course9: string | null;
  frontCourse: string | null;
  backCourse: string | null;
}

export interface Booking {
  id: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** `Course.id`. */
  course: string;
  /** Zero-based starting column within the course's slot group. */
  slot: number;
  timeMin: number;
  name: string;
  /** Player count — also the number of slot columns this booking spans. */
  players: number;
  cart: Transport;
  status: BookingStatus;
  phone: string;
  /** Confirmation code, e.g. `R-3001` / `M-3002` / `G-3008`. */
  conf: string;
  pay: PayStatus;
  price: number;
  /** `'9H'` | `'18H'` | `''` for blocks. */
  holes: string;
  note?: string;
  playerStates: PlayerState[];
  guests?: BookingGuest[];
  /** Extra courses this booking also occupies (18-hole crossovers). */
  courses?: string[];
  startHole?: number;
  startMin?: number;
  groupId?: string;
  groupMeta?: GroupMeta;
  groupEvent?: boolean;
  groupNote?: string;
  playerNotes?: Record<number, string>;
  activityLog?: ActivityEntry[];
  financialActions?: FinancialAction[];
  paymentRecord?: { method: string; time: string; amount: number };
  transportPrices?: TransportPrices;
  transportPrice?: number;
  memberType?: MemberTypeKey | null;
  cartNum?: string;
  keyNum?: string;
  /** Tags applied in the Group Notes tab (VIP, Birthday, …). */
  tags?: string[];
}

// ─── Cart ───────────────────────────────────────────────────────────────────

/** A modifier applied to a specific player on a check-in line. */
export interface ModifierTag {
  name: string;
  tag: string;
  tagColor: string;
  /** Signed price delta, or the absolute override when `isOverride`. */
  p: number;
  isDiscount?: boolean;
  isOverride?: boolean;
  isTransport?: boolean;
  overridePrice?: number;
}

/** One player row inside a check-in cart line. */
export interface CartPlayer {
  name: string;
  transport: Transport;
  modifierTags: ModifierTag[];
  /** Populated when the row was matched to a CRM record. */
  crmId?: string;
  phone?: string;
  memberType?: MemberTypeKey | null;
  /**
   * This player's green fee, when it differs from the line's `unitPrice` — set from the
   * reservation's per-player fee, so a foursome with one 18-hole player prices each seat.
   */
  fee?: number;
  /** Holes this player plays, when loaded from a reservation. Display only. */
  holes?: 9 | 18;
  /**
   * Already settled on the booking — paid earlier, or a no-show. Either way the seat is on
   * the order (so the operator sees the whole party) but charges nothing.
   */
  paid?: boolean;
  noShow?: boolean;
}

/** A selected tee time attached to a check-in line. */
export interface CartTeeTime {
  courseId: string;
  courseName: string;
  timeMin: number;
  label: string;
  shiftLabel?: string;
}

export interface CartItem {
  name: string;
  price: number;
  qty: number;
  /** True for green-fee/round lines — these carry players, modifiers and tee times. */
  isCheckIn?: boolean;
  /** Unit price before per-player modifiers, used to recompute after edits. */
  unitPrice?: number;
  players?: CartPlayer[];
  /** Legacy line-level modifiers (pre per-player); still rendered if present. */
  modifierTags?: ModifierTag[];
  teeTime?: CartTeeTime;
  /** Front/back halves of an 18-hole reservation, so totals can pair them. */
  is18HFront?: boolean;
  is18HBack?: boolean;
  /** Tax and fee rows that hang off the line above rather than standing alone. */
  isSubItem?: boolean;
  isTax?: boolean;
  /** Set when a member-rate item was validated against a MEMBER_DB record. */
  memberId?: string;
  memberName?: string;
  /** Locks the cart to 9 or 18 holes once a round is on it. */
  holes?: string;
}

// ─── Operator annotations ───────────────────────────────────────────────────

/** A note pinned to a tee-sheet time row (frost delay, lightning hold). */
export interface TimeRowNote {
  text: string;
  color: NoteColorKey;
}

/** A price override applied to one time row, or a span of them. */
export interface TimeRowPrice {
  label?: string;
  /** Green fee override. */
  fee?: number | null;
  walking?: number | null;
  cart?: number | null;
  walkingCart?: number | null;
  /** Last row in the span, inclusive; equals the anchor for single-row overrides. */
  rangeEnd?: number;
}

// ─── Views ──────────────────────────────────────────────────────────────────

export type MainView = 'pos' | 'tee';
export type TeeSheetViewMode = 'cal' | 'list';
export type FlowMode = '' | 'walkin' | 'reserve';
