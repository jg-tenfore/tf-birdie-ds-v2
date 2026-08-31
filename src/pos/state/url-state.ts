import type { ShiftKey } from '../../theme/tokens';
import { shifts } from '../../theme/tokens';
import { DEMO_TODAY } from '../data/bookings';
import { DEFAULT_TEE_SHEET_SETTINGS, toDateStr } from '../data/courses';
import { buildTeeTimeCart } from '../logic/cart';
import type { MainView, TeeSheetViewMode } from '../types';
import type { ListFilters, Modal, PosState } from './pos-store';
import { emptyListFilters } from './pos-store';
import { ORDER_SCENARIOS, demoBookings, isOrderScenario } from './scenarios';

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
 *
 * Times are `HHMM` in 24-hour form (`0912`) rather than raw minutes — same information,
 * legible to a human scanning the link.
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
      return course && t !== null
        ? { kind, courseId: course, timeMin: t, startSlot: num('slot') }
        : null;
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
    case 'paymentReader':
      return { kind, method: q.get('method') ?? 'card' };
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

  if (state.modal) encodeModal(state.modal, q);

  const query = q.toString();
  return `#${path}${query ? `?${query}` : ''}`;
}

/** The full shareable URL for a state, including origin and base path. */
export const stateToUrl = (state: PosState): string =>
  `${window.location.origin}${window.location.pathname}${stateToHash(state)}`;

// ─── URL → state ────────────────────────────────────────────────────────────

/**
 * Parse a hash into a state patch.
 *
 * Returns a partial rather than a whole state so it can seed a new provider *or* be
 * merged into a running one on back/forward. Unknown or malformed values are dropped
 * rather than throwing — a hand-edited link should degrade to a sensible screen, not a
 * blank page.
 */
export function hashToState(hash: string): Partial<PosState> {
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
  const date = parseDate(q.get('date'));
  if (date) patch.currentDate = date;

  const shift = q.get('shift');
  if (shift && shift in shifts) patch.shift = shift as ShiftKey;

  // ── The order ──
  const bookings = demoBookings();
  patch.bookings = bookings;

  const bookingId = q.get('booking');
  const order = q.get('order');

  if (bookingId) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      patch.selectedBookingId = booking.id;
      patch.cart = buildTeeTimeCart(booking);
      patch.view = 'pos';
    }
  } else if (order && isOrderScenario(order)) {
    // Scenario builders set view/category themselves; the link's own screen choice wins,
    // so applying the scenario first and the patch second is the right order.
    Object.assign(patch, ORDER_SCENARIOS[order](), patch);
    patch.orderScenario = order;
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

  // ── Modal ──
  const modal = decodeModal(q);
  if (modal) patch.modal = modal;

  return patch;
}

/** Read the current location into a state patch. */
export const readUrl = (): Partial<PosState> => hashToState(window.location.hash);

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
    toDateStr(prev.currentDate) !== toDateStr(next.currentDate)
  );
}
