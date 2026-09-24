import type { ShiftKey } from '../../theme/tokens';
import { shifts } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
import { DEFAULT_TEE_SHEET_SETTINGS, toDateStr } from '../data/courses';
import { buildTeeTimeCart } from '../logic/cart';
import type { MainView, TeeSheetViewMode } from '../types';
import type { ListFilters, Modal, PosState } from './pos-store';
import { DEFAULT_WESTON_OPTIONS, PANEL_WIDTHS, RESERVATION_TABS, emptyListFilters } from './pos-store';
import type { PanelWidth, ReservationTab, WestonOptions } from './pos-store';
import { roster } from '../data/roster';
import { ORDER_SCENARIOS, demoBookings, isOrderScenario } from './scenarios';
import { buildVenue, isVenueId, venue, venueBookings } from '../data/venues';

/**
 * Deep linking: a two-way map between POS state and a URL.
 *
 * ## Why hash routing
 *
 * The prototype is served from a GitHub Pages *subpath* (`/tf-birdie-ds-v2/prototype/`).
 * Pages serves static files with no SPA fallback, so a path like `…/prototype/tee-sheet`
 * would 404 — nothing exists at that path. A hash (`…/prototype/#/tee-sheet`) never
 * reaches the server, so the same link works on Pages, on `localhost:5173`, and from a
 * `file://` copy, with no server config and no 404 shim.
 *
 * ## What a link carries
 *
 * The path segment names the screen; query params carry everything else that changes what
 * you see. The encoder only emits values that differ from the default state, so a plain
 * register link stays `#/register` rather than a wall of parameters.
 *
 *   #/register
 *   #/register/GOLF%20BALLS                        a category open
 *   #/tee-sheet?date=2026-05-23&shift=peak         a different day and band
 *   #/tee-sheet/list?status=open&sort=status       the unpaid worklist
 *   #/register?booking=p01&modal=checkout          a booking loaded, mid-payment
 *   #/register?order=walkin&modal=modifiers&i=0&p=1
 *   #/tee-sheet?modal=block&t=0912                 blocking the 9:12 row
 *   #/tee-sheet?res=p43&res-tab=financial            the reservation panel (Weston Edits)
 *
 * Times are `HHMM` in 24-hour form (`0912`) rather than raw minutes — same information,
 * legible to a human scanning the link.
 *
 * ## Linking inside a reservation (Weston Edits, tablet)
 *
 * The panel has been linkable since round 3, but everything reached *from* it was component
 * state — so a reviewer could be handed a link to the reservation and a sentence describing
 * the three taps that follow. For QA that is the wrong way round: the link should land on the
 * thing being reviewed.
 *
 * So the record, the ID document, a seat's rate editor and the rate catalog all moved onto the
 * store (`ReservationPanelState.expandedSeat` / `rateCatalogOpen`, `CustomerModalState.viewingId`)
 * and each has a parameter:
 *
 * | Param | Value | What it opens |
 * |---|---|---|
 * | `res` | booking id | The reservation panel |
 * | `res-tab` | `players` · `financial` · `notes` · `activity` | Which tab. Omitted for `players` |
 * | `rate` | seat index, 0-based | That seat's rate editor, expanded in place |
 * | `rate-all` | `1` | The "+N more…" catalog dialog over the editor. Needs `rate` |
 * | `cust` | customer id, or `assign` | The customer record. `assign` is the search screen with nobody resolved |
 * | `cust-seat` | seat index | Which position it was opened from — what a link or create will fill |
 * | `cust-assign` | `1` | Force the search screen even though the id resolves |
 * | `id-doc` | `1` | The ID.me document dialog over the record. Needs a resolving `cust` |
 * | `pw` | `standard` · `wide` · `cover` | Width for *this* panel, overriding the edition default |
 * | `backdrop` | `scrim` · `squeeze` | What the sheet does behind it |
 * | `width` | `standard` · `wide` · `cover` | The edition default, i.e. every panel |
 * | `density` | `comfortable` · `dense` | Player row density |
 * | `transport` | `toggle` · `named` | Transport as icons, or as the rate it bills |
 * | `catalog` | `standard` · `heavy` | Swap in the 26-rate course |
 *
 *   #/tee-sheet?res=v06_m6&cust=G004&cust-seat=0        a customer record, over its reservation
 *   #/tee-sheet?res=v06_m6&cust=G004&id-doc=1           …with the ID.me document open
 *   #/tee-sheet?res=v06_m6&rate=1                       seat 2's rate editor
 *   #/tee-sheet?res=v06_m6&rate=1&rate-all=1&catalog=heavy   …the 26-rate catalog, open
 *   #/tee-sheet?res=v06_m6&pw=cover                     the same reservation, full width
 *
 * **Stale links fail visibly rather than approximately.** A `cust=` matching nobody drops the
 * record instead of degrading to the "Add golfer" screen, and a `rate=` past the party size is
 * dropped instead of clamped — in both cases landing on a plausible neighbouring screen would
 * look like the link worked.
 *
 * ## What it deliberately does not carry
 *
 * - **The cart, item by item.** An order is far too big for a URL. Instead `?order=` names
 *   a scenario from `scenarios.ts`, which is the same vocabulary the Storybook stories use.
 *   A link to a cart the operator built by hand will restore the *screen*, not their order.
 * - **The confirm dialog.** It carries prose (title, body, the action it would run) and only
 *   ever arises from an action you just took. Linking to a bare "are you sure?" would be
 *   linking to a question with no context.
 * - **Transient chrome** — toasts, context menus, the open state of a popover menu.
 */

/** Narrows a raw query value to a `PanelWidth`. */
const isPanelWidth = (v: string | null): v is PanelWidth => v != null && v in PANEL_WIDTHS;

// ─── Time helpers ───────────────────────────────────────────────────────────

/** `552` → `'0912'`. */
const minToHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}${String(min % 60).padStart(2, '0')}`;

/** `'0912'` → `552`; null if unparseable. */
function hhmmToMin(s: string | null): number | null {
  if (!s || !/^\d{3,4}$/.test(s)) return null;
  const padded = s.padStart(4, '0');
  const h = Number(padded.slice(0, 2));
  const m = Number(padded.slice(2));
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** `'2026-05-23'` → Date at local midnight; null if unparseable. */
function parseDate(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ─── Modal ↔ slug ───────────────────────────────────────────────────────────

/**
 * URL slug per modal kind.
 *
 * Slugs are kebab-case and shorter than the internal kind — these end up in links people
 * paste into Slack, so `modal=tee-picker` beats `modal=teePicker`.
 */
const MODAL_SLUGS = {
  bookingDetail: 'booking',
  teePicker: 'tee-picker',
  reserveConfirm: 'reserve',
  memberLookup: 'member-lookup',
  golferSearch: 'golfer-search',
  guestDetail: 'guest',
  newCustomer: 'new-customer',
  walkIn: 'walk-in',
  openItem: 'open-item',
  playerModifier: 'modifiers',
  newBooking: 'new-booking',
  actionPanel: 'action',
  blockTime: 'block',
  timeNote: 'note',
  timePrice: 'price',
  league: 'league',
  movePlayers: 'move',
  courseTimeSettings: 'course-times',
  courseRates: 'rates',
  checkout: 'checkout',
  paymentReader: 'payment',
  teeSheetSearch: 'search',
} as const satisfies Partial<Record<Modal['kind'], string>>;

const SLUG_TO_KIND = Object.fromEntries(
  Object.entries(MODAL_SLUGS).map(([kind, slug]) => [slug, kind]),
) as Record<string, keyof typeof MODAL_SLUGS>;

/** Write a modal into the query string. Returns false for kinds that aren't linkable. */
function encodeModal(m: Modal, q: URLSearchParams): boolean {
  if (m.kind === 'confirm') return false;
  // Cart signout is a momentary decision about a physical key, not a place. A link that
  // reopened it would restore a picker over a fleet whose availability has since moved on.
  if (m.kind === 'cartSignout') return false;

  q.set('modal', MODAL_SLUGS[m.kind]);
  switch (m.kind) {
    case 'bookingDetail':
      q.set('id', m.bookingId);
      if (m.tab) q.set('tab', String(m.tab));
      break;
    case 'teePicker':
      if (m.is18H) q.set('holes', '18');
      break;
    case 'reserveConfirm':
      q.set('pay', m.payMode);
      break;
    case 'memberLookup':
      q.set('item', m.itemName);
      q.set('tier', m.requiredType);
      break;
    case 'golferSearch':
      q.set(
        'target',
        m.target === 'primary' ? 'primary' : `${m.target.itemIdx}.${m.target.playerIdx}`,
      );
      break;
    case 'guestDetail':
      q.set('i', String(m.guestIndex));
      break;
    case 'playerModifier':
      q.set('i', String(m.itemIdx));
      q.set('p', String(m.playerIdx));
      break;
    case 'newBooking':
      q.set('course', m.courseId);
      q.set('t', minToHHMM(m.timeMin));
      q.set('slot', String(m.startSlot));
      // Only the party size travels. `maxPlayers` is a property of the grid at that moment,
      // and the dialog recomputes it from the row rather than trusting a stale link.
      if (m.players) q.set('p', String(m.players));
      break;
    case 'actionPanel':
      q.set('do', m.action);
      break;
    case 'blockTime':
      q.set('t', minToHHMM(m.timeMin));
      if (m.editing) q.set('edit', '1');
      break;
    case 'timeNote':
    case 'timePrice':
    case 'movePlayers':
      q.set('t', minToHHMM(m.timeMin));
      break;
    case 'league':
      q.set('t', minToHHMM(m.timeMin));
      if (m.editGroupId) q.set('group', m.editGroupId);
      break;
    case 'courseTimeSettings':
    case 'courseRates':
      q.set('course', m.courseId);
      break;
    case 'paymentReader':
      q.set('method', m.method);
      if (m.tip) q.set('tip', String(m.tip));
      break;
    default:
      break;
  }
  return true;
}

/** Read a modal out of the query string. Null when absent or unrecognized. */
function decodeModal(q: URLSearchParams): Modal | null {
  const slug = q.get('modal');
  if (!slug) return null;
  const kind = SLUG_TO_KIND[slug];
  if (!kind) return null;

  const t = hhmmToMin(q.get('t'));
  const num = (k: string, fallback = 0) => {
    const n = Number(q.get(k));
    return Number.isFinite(n) ? n : fallback;
  };

  switch (kind) {
    case 'bookingDetail': {
      const id = q.get('id');
      // A booking dialog with no booking has nothing to show, so drop it rather than
      // rendering an empty frame.
      return id ? { kind, bookingId: id, tab: num('tab') } : null;
    }
    case 'teePicker':
      return { kind, is18H: q.get('holes') === '18' };
    case 'reserveConfirm':
      return { kind, payMode: q.get('pay') === 'now' ? 'now' : 'later' };
    case 'memberLookup': {
      const item = q.get('item');
      const tier = q.get('tier');
      return item && tier ? { kind, itemName: item, requiredType: tier } : null;
    }
    case 'golferSearch': {
      const target = q.get('target') ?? 'primary';
      if (target === 'primary') return { kind, target: 'primary' };
      const [i, p] = target.split('.').map(Number);
      return Number.isFinite(i) && Number.isFinite(p)
        ? { kind, target: { itemIdx: i, playerIdx: p } }
        : { kind, target: 'primary' };
    }
    case 'guestDetail':
      return { kind, guestIndex: num('i') };
    case 'playerModifier':
      return { kind, itemIdx: num('i'), playerIdx: num('p') };
    case 'newBooking': {
      const course = q.get('course');
      if (!course || t === null) return null;
      const p = q.get('p');
      return {
        kind,
        courseId: course,
        timeMin: t,
        startSlot: num('slot'),
        ...(p ? { players: Number(p) } : {}),
      };
    }
    case 'actionPanel': {
      const action = q.get('do');
      return action === 'checkin' || action === 'refund' || action === 'raincheck'
        ? { kind, action }
        : null;
    }
    case 'blockTime':
      return t === null ? null : { kind, timeMin: t, editing: q.get('edit') === '1' };
    case 'timeNote':
    case 'timePrice':
    case 'movePlayers':
      return t === null ? null : { kind, timeMin: t };
    case 'league':
      return t === null ? null : { kind, timeMin: t, editGroupId: q.get('group') ?? undefined };
    case 'courseTimeSettings':
    case 'courseRates': {
      const course = q.get('course');
      return course ? { kind, courseId: course } : null;
    }
    case 'paymentReader': {
      const tip = Number(q.get('tip'));
      return { kind, method: q.get('method') ?? 'card', ...(tip > 0 && { tip }) };
    }
    case 'checkout':
    case 'teeSheetSearch':
    case 'newCustomer':
    case 'walkIn':
    case 'openItem':
      return { kind };
    default:
      return null;
  }
}

// ─── State → URL ────────────────────────────────────────────────────────────

/**
 * Build the hash for a state, e.g. `#/tee-sheet/list?status=open`.
 *
 * Only non-default values are emitted, so the common case stays short and two states that
 * look the same produce the same link.
 */
export function stateToHash(state: PosState): string {
  const q = new URLSearchParams();

  const path =
    state.view === 'tee'
      ? state.teeSheetMode === 'list'
        ? '/tee-sheet/list'
        : '/tee-sheet'
      : state.currentCategory
        ? `/register/${encodeURIComponent(state.currentCategory)}`
        : '/register';

  // Which club. Omitted when it matches the build's own venue, so each deployed
  // prototype's links stay clean and only a deliberate cross-venue link carries it.
  if (state.venueId !== buildVenue()) q.set('venue', state.venueId);

  // Day and band
  const dateStr = toDateStr(state.currentDate);
  if (dateStr !== toDateStr(DEMO_TODAY())) q.set('date', dateStr);
  if (state.shift !== 'full') q.set('shift', state.shift);

  // What's on the order. A loaded booking wins: it fully determines the cart, so there's
  // no reason to also name a scenario.
  if (state.selectedBookingId) q.set('booking', state.selectedBookingId);
  else if (state.cart.length > 0 && state.orderScenario) q.set('order', state.orderScenario);

  // Chrome whose state is visible
  if (state.view === 'tee' && !state.leftPanelCollapsed) q.set('panel', 'open');
  if (state.view === 'pos' && state.leftPanelCollapsed) q.set('panel', 'collapsed');
  if (state.sidebarOpen) q.set('summary', state.sidebarCourse ?? 'day');
  if (state.multiSelectActive) q.set('select', state.multiSelectIds.join(',') || 'on');
  if (state.settings.compactMode) q.set('compact', '1');
  if (state.settings.hideEmpty) q.set('hide-empty', '1');

  // List view filters — the ones with visible effect.
  if (state.view === 'tee' && state.teeSheetMode === 'list') {
    const f = state.listFilters;
    if (f.status !== emptyListFilters.status) q.set('status', f.status);
    if (f.sort !== emptyListFilters.sort) q.set('sort', f.sort);
    if (f.holes !== emptyListFilters.holes) q.set('holes-filter', f.holes);
    if (f.membership !== emptyListFilters.membership) q.set('member', f.membership);
    if (f.courses.length) q.set('course-filter', f.courses.join(','));
    if (f.search.trim()) q.set('q', f.search.trim());
  }

  // The reservation slide-over. Its own params rather than a modal slug: it isn't a dialog,
  // and a dialog can open on top of it — both have to survive the link.
  const panel = state.reservationPanel;
  if (panel) {
    q.set('res', panel.bookingId);
    if (panel.tab !== 'players') q.set('res-tab', panel.tab);
    if (panel.playerIndex) q.set('res-p', String(panel.playerIndex));
    // The rate editor open on a seat, and the catalog dialog over it. Both were component
    // state until QA asked for links that land *inside* what is being reviewed.
    if (panel.expandedSeat != null) q.set('rate', String(panel.expandedSeat));
    if (panel.rateCatalogOpen) q.set('rate-all', '1');
    // Panel geometry. Normally the edition's default, so normally absent — but a QA link
    // comparing 640 against 820 has to be able to say which.
    if (panel.width) q.set('pw', panel.width);
    if (panel.backdrop) q.set('backdrop', panel.backdrop);
  }

  // The customer record, over whatever is behind it. `res=` usually comes with it, which is
  // the point: the record is opened *from* a seat and closing it returns to the reservation,
  // so a link that carries both restores the whole position rather than a floating dialog.
  const cm = state.customerModal;
  if (cm) {
    q.set('cust', cm.customerId ?? 'assign');
    if (cm.seat != null) q.set('cust-seat', String(cm.seat));
    // Only worth emitting when it isn't already implied by having no customer.
    if (cm.assigning && cm.customerId) q.set('cust-assign', '1');
    if (cm.viewingId) q.set('id-doc', '1');
  }

  // The three variant switches. Emitted only when they differ from the shipped defaults, so
  // an ordinary link stays clean and a comparison link says exactly what it is comparing.
  if (state.weston.rowDensity !== DEFAULT_WESTON_OPTIONS.rowDensity) q.set('density', state.weston.rowDensity);
  if (state.weston.transportStyle !== DEFAULT_WESTON_OPTIONS.transportStyle)
    q.set('transport', state.weston.transportStyle);
  if (state.weston.rateCatalog !== DEFAULT_WESTON_OPTIONS.rateCatalog) q.set('catalog', state.weston.rateCatalog);
  if (state.weston.panelWidth !== DEFAULT_WESTON_OPTIONS.panelWidth) q.set('width', state.weston.panelWidth);

  if (state.modal) encodeModal(state.modal, q);

  const query = q.toString();
  return `#${path}${query ? `?${query}` : ''}`;
}

/** The full shareable URL for a state, including origin and base path. */
export const stateToUrl = (state: PosState): string =>
  `${window.location.origin}${window.location.pathname}${stateToHash(state)}`;

// ─── URL → state ────────────────────────────────────────────────────────────

/**
 * The running app a URL is being applied to (Back / Forward / an edited hash): what a link
 * resolves its booking ids against, and what it must not throw away.
 */
export type UrlSession = Pick<
  PosState,
  'venueId' | 'bookings' | 'courses' | 'cart' | 'selectedBookingId' | 'orderScenario'
>;

/**
 * Parse a hash into a state patch.
 *
 * Returns a partial rather than a whole state so it can seed a new provider *or* be
 * merged into a running one on back/forward. Unknown or malformed values are dropped
 * rather than throwing — a hand-edited link should degrade to a sensible screen, not a
 * blank page.
 *
 * With no `session` (the initial page load) the patch seeds the club: its courses and its
 * demo bookings. With a `session` (Back / Forward) on the **same club**, the link is only
 * navigation — it resolves `?booking=` and `?res=` against the session's own bookings and
 * leaves `bookings` and `courses` out of the patch, so moves, check-ins, new tee times and
 * generated days survive; the cart it already holds for the same booking or scenario is
 * kept too. Only a link to a **different club** (`?venue=`) re-homes, as a fresh load would.
 */
export function hashToState(hash: string, session?: UrlSession): Partial<PosState> {
  const raw = hash.replace(/^#/, '');
  const [path = '', queryString = ''] = raw.split('?');
  const q = new URLSearchParams(queryString);
  const segments = path.split('/').filter(Boolean);

  const patch: Partial<PosState> = {};

  // ── Screen ──
  const screen = segments[0];
  let view: MainView = 'pos';
  let teeSheetMode: TeeSheetViewMode = 'cal';

  if (screen === 'tee-sheet') {
    view = 'tee';
    teeSheetMode = segments[1] === 'list' ? 'list' : 'cal';
    // The tee sheet defaults to full width; a link can override with ?panel=open.
    patch.leftPanelCollapsed = q.get('panel') !== 'open';
  } else if (screen === 'register' || !screen) {
    view = 'pos';
    if (segments[1]) patch.currentCategory = decodeURIComponent(segments[1]);
    patch.leftPanelCollapsed = q.get('panel') === 'collapsed';
  }
  patch.view = view;
  patch.teeSheetMode = teeSheetMode;

  // ── Day and band ──
  // A link omits the demo day and the full band, so on Back / Forward their absence means
  // exactly that — otherwise Back from another day would leave the sheet on it.
  const date = parseDate(q.get('date'));
  if (date) patch.currentDate = date;
  else if (session) patch.currentDate = DEMO_TODAY();

  const shift = q.get('shift');
  if (shift && shift in shifts) patch.shift = shift as ShiftKey;
  else if (session) patch.shift = 'full';

  // ── Which club ──
  const venueParam = q.get('venue');
  const venueId = venueParam && isVenueId(venueParam) ? venueParam : buildVenue();
  patch.venueId = venueId;
  // Same club as the running app: navigation only, its sheet stays as the operator left it.
  const live = session && session.venueId === venueId ? session : null;
  const courses = live ? live.courses : venue(venueId).courses.map((c) => ({ ...c }));
  const bookings = live
    ? live.bookings
    : venueId === buildVenue()
      ? demoBookings()
      : venueBookings(venueId);
  if (!live) {
    patch.courses = courses;
    patch.bookings = bookings;
  }

  // ── The order ──
  const bookingId = q.get('booking');
  const order = q.get('order');

  if (bookingId) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      patch.selectedBookingId = booking.id;
      // Back to the booking already on the order keeps the order as rung up, not a fresh copy.
      const keepCart = live && live.selectedBookingId === booking.id && live.cart.length > 0;
      if (!keepCart) patch.cart = buildTeeTimeCart(booking, courses);
      patch.view = 'pos';
    }
  } else if (order && isOrderScenario(order)) {
    if (live && live.orderScenario === order && live.cart.length > 0) {
      // The same scenario's order is still on the counter, edits and all — keep it.
      patch.orderScenario = order;
    } else {
      // Scenario builders set view/category themselves; the link's own screen choice wins,
      // so applying the scenario first and the patch second is the right order.
      Object.assign(patch, ORDER_SCENARIOS[order](), patch);
      patch.orderScenario = order;
      // A scenario carries the demo bookings; on the running club they'd undo its edits.
      if (live) {
        delete patch.bookings;
        delete patch.courses;
      }
    }
  }

  // ── Chrome ──
  const summary = q.get('summary');
  if (summary) {
    patch.sidebarOpen = true;
    patch.sidebarCourse = summary === 'day' ? null : summary;
  }

  const select = q.get('select');
  if (select) {
    patch.multiSelectActive = true;
    patch.multiSelectIds = select === 'on' ? [] : select.split(',').filter(Boolean);
  }

  if (q.get('compact') === '1' || q.get('hide-empty') === '1') {
    patch.settings = {
      ...DEFAULT_TEE_SHEET_SETTINGS,
      compactMode: q.get('compact') === '1',
      hideEmpty: q.get('hide-empty') === '1',
    };
  }

  // ── List filters ──
  const filters: Partial<ListFilters> = {};
  const status = q.get('status');
  if (status) filters.status = status;
  const sort = q.get('sort');
  if (sort === 'time' || sort === 'status' || sort === 'course') filters.sort = sort;
  const holesFilter = q.get('holes-filter');
  if (holesFilter) filters.holes = holesFilter;
  const member = q.get('member');
  if (member) filters.membership = member;
  const courseFilter = q.get('course-filter');
  if (courseFilter) filters.courses = courseFilter.split(',').filter(Boolean);
  const search = q.get('q');
  if (search) filters.search = search;
  if (Object.keys(filters).length) patch.listFilters = { ...emptyListFilters, ...filters };

  // ── Reservation panel ──
  const res = q.get('res');
  // Only for a booking the club has — a panel for a missing booking would be an empty frame.
  if (res && bookings.some((b) => b.id === res)) {
    const tab = q.get('res-tab');
    const p = Number(q.get('res-p'));
    const booking = bookings.find((b) => b.id === res)!;
    // A seat the booking does not have is dropped rather than clamped: `rate=7` on a
    // threesome is a stale link, and silently opening seat 3 instead would hide that.
    const seat = Number(q.get('rate'));
    const validSeat = q.has('rate') && Number.isInteger(seat) && seat >= 0 && seat < booking.players;
    const pw = q.get('pw');
    const backdrop = q.get('backdrop');
    patch.reservationPanel = {
      bookingId: res,
      tab: tab && (RESERVATION_TABS as readonly string[]).includes(tab) ? (tab as ReservationTab) : 'players',
      playerIndex: Number.isInteger(p) && p > 0 ? p : 0,
      ...(validSeat && { expandedSeat: seat }),
      // The catalog only opens over an editor; without one there is nothing to return to.
      ...(validSeat && q.get('rate-all') === '1' && { rateCatalogOpen: true }),
      ...(isPanelWidth(pw) && { width: pw }),
      ...((backdrop === 'squeeze' || backdrop === 'scrim') && { backdrop }),
    };
  }

  // ── Customer record ──
  const cust = q.get('cust');
  if (cust) {
    const seat = Number(q.get('cust-seat'));
    const hasSeat = q.has('cust-seat') && Number.isInteger(seat) && seat >= 0;
    // `assign` is the search screen with nobody resolved. Any other value has to name a real
    // record — an id that matches nobody drops the modal rather than quietly landing on the
    // "Add golfer" screen, which would look like the link worked.
    const record = cust === 'assign' ? null : roster.find((c) => c.id === cust);
    // A seat number is meaningless without the booking it is a seat in. `?res=v35&cust=assign`
    // — a booking id that does not exist — used to drop the panel but still open the search
    // screen, leaving a dialog floating over a tee sheet with nothing behind it to return to.
    const seatIsOrphaned = q.has('cust-seat') && !(res && bookings.some((b) => b.id === res));
    if ((cust === 'assign' || record) && !seatIsOrphaned) {
      patch.customerModal = {
        customerId: record?.id ?? null,
        ...(res && bookings.some((b) => b.id === res) && { bookingId: res }),
        ...(hasSeat && { seat }),
        ...((cust === 'assign' || q.get('cust-assign') === '1') && { assigning: true }),
        ...(q.get('id-doc') === '1' && record && { viewingId: true }),
      };
    }
  }

  // ── Variant switches ──
  const weston: Partial<WestonOptions> = {};
  const density = q.get('density');
  if (density === 'comfortable' || density === 'dense') weston.rowDensity = density;
  const transport = q.get('transport');
  if (transport === 'toggle' || transport === 'named') weston.transportStyle = transport;
  const catalog = q.get('catalog');
  if (catalog === 'standard' || catalog === 'heavy') weston.rateCatalog = catalog;
  const width = q.get('width');
  if (isPanelWidth(width)) weston.panelWidth = width;
  if (Object.keys(weston).length) patch.weston = { ...DEFAULT_WESTON_OPTIONS, ...weston };

  // ── Modal ──
  const modal = decodeModal(q);
  if (modal) patch.modal = modal;

  return patch;
}

/**
 * Read the current location into a state patch. Pass the running state on Back / Forward
 * (`useUrlSync`) so the patch navigates it rather than reseeding it; omit it on first load.
 */
export const readUrl = (session?: UrlSession): Partial<PosState> =>
  hashToState(window.location.hash, session);

/**
 * Whether moving between two states is a *navigation* — worth its own history entry, so
 * the browser Back button undoes it.
 *
 * Changing screen, day, opening or closing a dialog: navigation. Typing in a filter or
 * flipping a display toggle: not — those would otherwise bury the real steps under dozens
 * of entries nobody wants to press Back through.
 */
export function isNavigation(prev: PosState, next: PosState): boolean {
  return (
    prev.view !== next.view ||
    prev.teeSheetMode !== next.teeSheetMode ||
    prev.modal?.kind !== next.modal?.kind ||
    prev.selectedBookingId !== next.selectedBookingId ||
    prev.reservationPanel?.bookingId !== next.reservationPanel?.bookingId ||
    // Opening or closing the customer record is a step worth a Back press; expanding a rate
    // row is not, or walking back through a foursome would bury the real navigation.
    prev.customerModal?.customerId !== next.customerModal?.customerId ||
    Boolean(prev.customerModal) !== Boolean(next.customerModal) ||
    toDateStr(prev.currentDate) !== toDateStr(next.currentDate)
  );
}
