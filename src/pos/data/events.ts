import type { Booking, GroupMeta } from '../types';
import { DEMO_TODAY } from './bookings';
import { toDateStr } from './courses';

/**
 * Events and outings (V1 → V2, Wave 3) — the golf and the spend, as one thing.
 *
 * ## What v1 had
 *
 * Two unrelated halves. v1's **Events** screen (`tf-birdie-ds-v1/app/src/screens/events.tsx`) was an
 * expense ledger — a named list of things charged to the event — with no tee times in it. The tee
 * sheet's **leagues and outings** were group bookings with no ledger. An outing's golf and its lunch
 * lived in two places and were added up by hand at the end of the day.
 *
 * ## What this does
 *
 * Justin's choice: **one event carries its golf and its spend.** An event names the tee-sheet group
 * whose bookings are its golf (`groupId` — the same group a league creates), and holds a ledger of
 * everything charged to it: a tournament lunch, prizes, carts, range balls. A tab or a register order
 * can be charged to an event at checkout, so the lunch lands on the event's bill rather than on
 * somebody's card. The organiser is billed once, for golf and extras together.
 *
 * Golf is **derived** from the bookings, never copied into the ledger, so moving or removing a tee
 * time changes the bill without anyone re-keying it.
 */

export interface EventCharge {
  id: string;
  date: string;
  time: string;
  description: string;
  qty: number;
  /** Tax included — a charge arrives from an order that was already totalled. */
  amount: number;
  /** The order it came from, when it came from one. */
  orderNumber?: string;
  staffId: string;
}

export interface GolfEvent {
  id: string;
  name: string;
  date: string;
  organiser: { name: string; customerId?: string; phone?: string };
  /** The tee-sheet group whose bookings are this event's golf. */
  groupId?: string;
  expectedPlayers: number;
  /** Per player, before tax — what each tee time is priced at. */
  greenFee: number;
  ledger: EventCharge[];
  /** `upcoming` until the day, `billed` once the organiser has paid. */
  status: 'upcoming' | 'open' | 'billed';
  billedOrderNumber?: string;
  note?: string;
}

const day = (offset: number) => {
  const d = DEMO_TODAY();
  d.setDate(d.getDate() + offset);
  return toDateStr(d);
};

/**
 * An outing's tee times, built the way the league dialog builds them (`modals/TimeRow.tsx`): one
 * booking per group, `status: 'event'`, carrying the group's meta so the tee sheet draws it as the
 * outing. Deterministic ids, because seeds must be.
 */
export function outingBookings(meta: GroupMeta, courseId: string, stepMin = 8, perGroup = 4): Booking[] {
  const groups = Math.ceil(meta.want / perGroup);
  return Array.from({ length: groups }, (_, i) => {
    const tMin = meta.startMin + i * stepMin;
    const players = Math.min(perGroup, meta.want - i * perGroup);
    return {
      id: `event-${meta.groupId}-${courseId}-${tMin}`,
      date: meta.dateStr,
      course: courseId,
      slot: 0,
      timeMin: tMin,
      name: meta.name,
      players,
      cart: 'cart',
      status: 'event',
      phone: '',
      conf: `EVT-${tMin}`,
      pay: 'event',
      price: meta.greenFee,
      holes: meta.holes === 18 ? '18H' : '9H',
      note: `${meta.name} — reserved`,
      groupId: meta.groupId,
      groupMeta: meta,
      groupEvent: true,
      transportPrices: meta.transportPrices,
      playerStates: [],
    } satisfies Booking;
  });
}

const meta = (m: Pick<GroupMeta, 'groupId' | 'name' | 'want' | 'greenFee' | 'startMin' | 'dateStr'>): GroupMeta => ({
  holes: 18,
  transportPrices: { cart: 0, push: 0, walking: 0 },
  rangeEndMin: m.startMin,
  duration: 135,
  course9: null,
  frontCourse: 'champ-front',
  backCourse: 'champ-back',
  ...m,
});

/**
 * Saturday the 30th is the Member-Guest. It is **outside** the seeded booking window (May 15–25), so
 * seeding it leaves the day to the outing — the demo-day generator never fills a day that already has
 * a booking, which is exactly how a tournament takes the course.
 */
// Start times sit on the sheet's rows — every 8 minutes from 6:00 — or the outing draws nowhere.
const MEMBER_GUEST = meta({ groupId: 'grp-member-guest', name: 'Member-Guest Invitational', want: 72, greenFee: 85, startMin: 7 * 60 + 4, dateStr: day(9) });
const ROTARY = meta({ groupId: 'grp-rotary', name: 'Rotary Club Scramble', want: 40, greenFee: 70, startMin: 8 * 60, dateStr: day(-12) });

/**
 * Tee times the seeded events own, off the club's first tee. Added to the sheet in V1 → V2 only.
 * By course rather than fixed to `champ-front`, because every club runs outings — the three-nines
 * club sends the Member-Guest off Ponds.
 */
export function seedEventBookings(firstCourse: string, secondCourse = firstCourse): Booking[] {
  const at = (m: GroupMeta): GroupMeta => ({ ...m, frontCourse: firstCourse, backCourse: secondCourse });
  return [...outingBookings(at(MEMBER_GUEST), firstCourse), ...outingBookings(at(ROTARY), firstCourse)];
}

/** The eighteen-hole club's — what the tests read. */
export const SEED_EVENT_BOOKINGS: Booking[] = seedEventBookings('champ-front', 'champ-back');

export const SEED_EVENTS: GolfEvent[] = [
  {
    id: 'EV-301',
    name: MEMBER_GUEST.name,
    date: MEMBER_GUEST.dateStr,
    organiser: { name: 'Farnsworth, Weston', customerId: 'G006' },
    groupId: MEMBER_GUEST.groupId,
    expectedPlayers: MEMBER_GUEST.want,
    greenFee: MEMBER_GUEST.greenFee,
    status: 'upcoming',
    note: 'Off the front from 7:04 AM, lunch buffet after play',
    ledger: [
      { id: 'EC-9001', date: day(-3), time: '2:15 PM', description: 'Tee gifts · logo sleeves', qty: 72, amount: 1108.8, orderNumber: '#A-29001', staffId: 's-6' },
      { id: 'EC-9002', date: day(-3), time: '2:15 PM', description: 'Hole-in-one insurance', qty: 1, amount: 250, staffId: 's-1' },
    ],
  },
  {
    id: 'EV-300',
    name: ROTARY.name,
    date: ROTARY.dateStr,
    organiser: { name: 'Whitfield, Gerald', customerId: 'M015' },
    groupId: ROTARY.groupId,
    expectedPlayers: ROTARY.want,
    greenFee: ROTARY.greenFee,
    status: 'billed',
    billedOrderNumber: '#A-28950',
    ledger: [
      { id: 'EC-8901', date: ROTARY.dateStr, time: '12:40 PM', description: 'Lunch buffet', qty: 40, amount: 972, orderNumber: '#A-28941', staffId: 's-3' },
      { id: 'EC-8902', date: ROTARY.dateStr, time: '1:05 PM', description: 'Closest-to-the-pin prizes', qty: 2, amount: 100, staffId: 's-1' },
      { id: 'EC-8903', date: ROTARY.dateStr, time: '11:30 AM', description: 'Range balls · large bucket', qty: 40, amount: 432, orderNumber: '#A-28930', staffId: 's-6' },
    ],
  },
  {
    // Today's, with no tee times of its own yet: what a tab gets charged to.
    id: 'EV-302',
    name: "Thursday Men's League",
    date: day(0),
    organiser: { name: 'Okonkwo, James', customerId: 'M011' },
    expectedPlayers: 12,
    greenFee: 0,
    status: 'open',
    ledger: [],
  },
];

/** The golf half of an event's bill: every player on its tee times at the event's green fee, before tax. */
export function eventGolf(event: GolfEvent, bookings: Booking[]): { players: number; teeTimes: number; amount: number } {
  const mine = event.groupId ? bookings.filter((b) => b.groupId === event.groupId) : [];
  const players = mine.reduce((n, b) => n + b.players, 0);
  return { players, teeTimes: mine.length, amount: Math.round(players * event.greenFee * 100) / 100 };
}

/** Everything charged to an event so far. */
export const eventSpend = (event: GolfEvent): number =>
  Math.round(event.ledger.reduce((s, c) => s + c.amount, 0) * 100) / 100;
