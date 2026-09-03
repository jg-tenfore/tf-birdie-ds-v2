import { DEMO_TODAY } from '../../pos/data/bookings';
import { toDateStr } from '../../pos/data/courses';
import { DEFAULT_TEE_SHEET_SETTINGS } from '../../pos/data/courses';
import type { Booking, PayStatus, PlayerState, TeeSheetSettings, Transport } from '../../pos/types';

/**
 * Hand-built booking sets for the Tee Sheet component stories.
 *
 * The generated demo data is realistic but not *exhaustive* — it won't reliably contain a
 * row with exactly one open slot, or a refunded foursome next to a rain check. These
 * fixtures construct those conditions directly so each story shows one thing clearly.
 *
 * Everything is placed on the demo "today" so the now-line and the band tints behave as
 * they do in the app.
 */

export const TODAY = toDateStr(DEMO_TODAY());

/**
 * Each constant is the *first* row of its band.
 *
 * That placement is the point: a story showing one condition should open on it. The sheet
 * has no way to scroll to a fixture — the opening scroll follows the wall clock — so a set
 * placed mid-band starts a screen or two below the fold and the story looks empty.
 */
/** 6:00 AM — first row of the Early Morning band. */
export const MORNING = 6 * 60;
/** 10:00 AM — first row of Peak Hours. */
export const PEAK = 10 * 60;
/** 2:00 PM — first row of Twilight. */
export const TWILIGHT = 14 * 60;

const states = (n: number, paid: boolean, step = -1): PlayerState[] =>
  Array.from({ length: n }, () => ({ paid, step, noShow: false }));

let seq = 0;

/** One booking. Only the fields a story cares about need naming. */
export function mk(overrides: Partial<Booking> & { course: string; timeMin: number }): Booking {
  seq += 1;
  const players = overrides.players ?? 1;
  const pay: PayStatus = overrides.pay ?? 'open';
  return {
    id: `fx-${seq}`,
    date: TODAY,
    slot: 0,
    name: 'Harrison, T.',
    players,
    cart: 'cart' as Transport,
    status: 'booked',
    phone: '(555)100-0001',
    conf: `R-${3000 + seq}`,
    pay,
    price: 100,
    holes: '18H',
    playerStates: states(players, pay === 'paid'),
    ...overrides,
  };
}

/** Settings with a few fields overridden; the rest stay at the app's defaults. */
export const withSettings = (patch: Partial<TeeSheetSettings>): TeeSheetSettings => ({
  ...DEFAULT_TEE_SHEET_SETTINGS,
  ...patch,
});

// ─── Scenario sets ──────────────────────────────────────────────────────────

/** One booking of each party size, so the chip widths can be compared directly. */
export const partySizes = (course = 'ponds'): Booking[] => [
  mk({ course, timeMin: MORNING, slot: 0, players: 1, name: 'Cook, W.', pay: 'paid', holes: '9H' }),
  mk({ course, timeMin: MORNING + 8, slot: 0, players: 2, name: 'Reed, M.' }),
  mk({ course, timeMin: MORNING + 16, slot: 0, players: 3, name: 'Diaz, M.', pay: 'paid' }),
  mk({ course, timeMin: MORNING + 24, slot: 0, players: 4, name: 'Harrison, T.', pay: 'paid' }),
];

/** Every payment state on consecutive rows, which is how the chip colours are read. */
export const payStates = (course = 'ponds'): Booking[] => [
  mk({ course, timeMin: MORNING, slot: 0, players: 2, name: 'Paid, P.', pay: 'paid' }),
  mk({ course, timeMin: MORNING, slot: 2, players: 2, name: 'Open, O.', pay: 'open' }),
  mk({ course, timeMin: MORNING + 8, slot: 0, players: 2, name: 'Noshow, N.', pay: 'no_show' }),
  mk({ course, timeMin: MORNING + 8, slot: 2, players: 2, name: 'Raincheck, R.', pay: 'rain_chk' }),
  mk({ course, timeMin: MORNING + 16, slot: 0, players: 2, name: 'Refunded, R.', pay: 'refund' }),
  mk({
    course,
    timeMin: MORNING + 16,
    slot: 2,
    players: 2,
    name: 'Partly paid',
    pay: 'open',
    // A group where some have paid and some haven't — the chip stays unpaid-white, because
    // an operator needs to know money is still owed even if most of the party has settled.
    playerStates: [
      { paid: true, step: 0, noShow: false },
      { paid: false, step: -1, noShow: false },
    ],
  }),
];

/**
 * Rows with openings of every size, for the party-size picker.
 *
 * Clicking the Nth open cell seats N, starting at the opening's first slot. The split row is
 * the case that makes runs matter: two free slots that cannot seat a pair.
 */
export const openings = (course = 'ponds'): Booking[] => [
  // 4 open — the picker offers 1 through 4.
  // (no booking at MORNING)
  // 3 open
  mk({ course, timeMin: MORNING + 8, slot: 0, players: 1, name: 'Single', pay: 'paid', holes: '9H' }),
  // 2 open
  mk({ course, timeMin: MORNING + 16, slot: 0, players: 2, name: 'Pair', pay: 'paid' }),
  // 1 open
  mk({ course, timeMin: MORNING + 24, slot: 0, players: 3, name: 'Threesome', pay: 'paid' }),
  // 0 open — full row
  mk({ course, timeMin: MORNING + 32, slot: 0, players: 4, name: 'Foursome', pay: 'paid' }),
  // Split: slots 0 and 3 open, 1–2 taken. Two free slots, but neither seats a pair.
  mk({ course, timeMin: MORNING + 40, slot: 1, players: 2, name: 'Middle', pay: 'paid' }),
];

/** Non-bookable slots: a single hold, and a shift change closing every course. */
export const blocks = (courses: string[]): Booking[] => [
  mk({
    course: courses[0],
    timeMin: PEAK,
    slot: 0,
    players: 1,
    name: 'Course Maintenance',
    status: 'block',
    pay: 'block',
    price: 0,
    holes: '',
    note: 'Greens maintenance — slot unavailable',
    playerStates: [],
  }),
  // Spans the full width of every course, which is how a shift change reads as "closed".
  ...courses.flatMap((c) =>
    [PEAK + 24, PEAK + 32].map((t) =>
      mk({
        course: c,
        timeMin: t,
        slot: 0,
        players: 4,
        name: 'Shift Change',
        status: 'block',
        pay: 'block',
        price: 0,
        holes: '',
        note: 'Staff shift change — course closed',
        playerStates: [],
      }),
    ),
  ),
];

/** A league occupying consecutive rows across two courses. */
export const league = (front: string, back: string): Booking[] =>
  [0, 8, 16].flatMap((offset) =>
    [front, back].map((c) =>
      mk({
        course: c,
        timeMin: TWILIGHT + offset,
        slot: 0,
        players: 4,
        name: "Thursday Men's League",
        status: 'event',
        pay: 'event',
        price: 42,
        holes: '18H',
        groupId: 'grp-demo',
        groupEvent: true,
        note: "Thursday Men's League — reserved",
        playerStates: [],
      }),
    ),
  );

/** Bookings carrying operator notes, which show as a corner icon on the chip. */
export const withNotes = (course = 'ponds'): Booking[] => [
  mk({
    course,
    timeMin: MORNING,
    slot: 0,
    players: 4,
    name: 'Harrison, T.',
    pay: 'paid',
    note: 'Celebrating anniversary — please arrange complimentary scorecard',
  }),
  mk({
    course,
    timeMin: MORNING + 8,
    slot: 0,
    players: 3,
    name: 'Sanders, P.',
    note: 'Needs accessible cart — knee injury',
  }),
];

/**
 * Members and guests side by side.
 *
 * Phone numbers matter here: the membership dot is resolved from the CRM by phone, so these
 * use real numbers from `MEMBER_DB` rather than invented ones.
 */
export const memberMix = (course = 'ponds'): Booking[] => [
  mk({ course, timeMin: MORNING, slot: 0, players: 2, name: 'Thompson, M.', phone: '(555) 234-1234', status: 'member', pay: 'open', price: 0 }),
  mk({ course, timeMin: MORNING, slot: 2, players: 2, name: 'Whitfield, G.', phone: '(555)400-0015', status: 'member', pay: 'open', price: 0 }),
  mk({ course, timeMin: MORNING + 8, slot: 0, players: 2, name: 'Blake, E.', phone: '(555)400-0001', status: 'member', pay: 'open', price: 0 }),
  mk({ course, timeMin: MORNING + 8, slot: 2, players: 2, name: 'Guest, G.', phone: '(555)999-0000', pay: 'paid' }),
];

/** Every slot on every course taken, at one time — the "nothing available" row. */
export const fullRow = (courses: string[], timeMin = PEAK): Booking[] =>
  courses.map((c, i) =>
    mk({ course: c, timeMin, slot: 0, players: 4, name: `Full ${i + 1}`, pay: 'paid' }),
  );
