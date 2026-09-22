import {
  CUSTOMER_TYPES,
  bookingName,
  isMember,
  customers as PORTED,
  type Customer,
  type CustomerTeeTime,
  normalizePhone,
} from './customers';
import { SHEET_NAMES } from './sheet-names';
import { MEMBER_DB, GOLFER_DB } from './golfers';

/**
 * The roster — every person the demo knows about, as a customer record.
 *
 * Three sources, one list:
 *
 *  1. **The hundred ported records.** Hand-authored in v1 and committed: households sharing a
 *     phone, three Brennevins, names long enough to truncate. They give customer search the
 *     awkward cases it has to survive.
 *  2. **A record per tee-sheet name.** Every name that can appear on a sheet resolves to a
 *     person with memberships, punch cards, rounds played and a balance, so tapping a player
 *     on any prototype — not just Weston's — opens something real. Synthesised
 *     deterministically from the name itself, so the same golfer reads the same way on every
 *     run and in every screenshot.
 *  3. **The original golfer roster.** The 28 records the POS already priced against, kept
 *     intact so member-by-phone lookups and the fixtures that rely on them keep working.
 *
 * Synthesising rather than renaming the fixtures is a deliberate call. The alternative —
 * re-pointing 200-odd authored bookings at the ported names — would have reseeded the demo
 * window that every screenshot, story and doc reference depends on, to change strings nobody
 * is looking at. What mattered was that a name on the sheet resolves to a deep record
 * everywhere, and this gets that without touching a single booking.
 */

/** Mulberry32, seeded per name so a record never moves between runs. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = <T,>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)];

/** First names by initial, so "Adams, D." becomes a Daniel rather than a random stranger. */
const FIRST_NAMES: Record<string, string[]> = {
  A: ['Alan', 'Amara', 'Aaron', 'Alice'],
  B: ['Brian', 'Bianca', 'Bruce', 'Beth'],
  C: ['Carla', 'Colin', 'Cora', 'Curtis'],
  D: ['Daniel', 'Dana', 'Derek', 'Delia'],
  E: ['Elena', 'Eli', 'Erica', 'Edwin'],
  F: ['Frank', 'Farah', 'Felix', 'Fiona'],
  G: ['Grace', 'Gordon', 'Gina', 'Glen'],
  H: ['Hana', 'Hugh', 'Helen', 'Hector'],
  I: ['Iris', 'Ian', 'Imani', 'Ivan'],
  J: ['Jonah', 'Jill', 'Jamal', 'Joan'],
  K: ['Kira', 'Kevin', 'Kelsey', 'Karl'],
  L: ['Lena', 'Luis', 'Laura', 'Leon'],
  M: ['Marcus', 'Maya', 'Mona', 'Miles'],
  N: ['Nadia', 'Noel', 'Nina', 'Nathan'],
  O: ['Omar', 'Odette', 'Oscar', 'Olive'],
  P: ['Priya', 'Peter', 'Paula', 'Pierce'],
  Q: ['Quinn', 'Quincy', 'Questa', 'Quintin'],
  R: ['Rosa', 'Rex', 'Rhea', 'Roland'],
  S: ['Sana', 'Simon', 'Sonia', 'Seth'],
  T: ['Tomas', 'Tara', 'Trent', 'Thea'],
  U: ['Uma', 'Ulric', 'Ursula', 'Uri'],
  V: ['Vera', 'Victor', 'Vida', 'Vaughn'],
  W: ['Wanda', 'Wesley', 'Wren', 'Walt'],
  X: ['Xavier', 'Xiomara', 'Xander', 'Xia'],
  Y: ['Yara', 'Yusuf', 'Yvonne', 'Yohan'],
  Z: ['Zara', 'Zane', 'Zoya', 'Zeke'],
};

const DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'sbcglobal.net', 'att.net'];

const MEMBERSHIP_NAMES = [
  'Full Golf',
  'Weekday Golf',
  '30 Day booking window',
  'Corporate — 4 seat',
  'Trial Month',
  'Junior',
  'Social',
];

const PUNCH_NAMES = ['20-Round Punch Card', '10-Round Punch Card', '5-Round Punch Card'];

const NOTES = [
  'walks — never wants a cart',
  'has a standing Saturday foursome',
  'prefers the back nine',
  'always asks for cart 14',
  'pays for the whole group',
  'slow player — pair with singles',
];

const STREETS = ['Tee Box Way', 'Greenside Ct', 'Fairway Dr', 'Bunker Ln', 'Dogleg Rd', 'Clubhouse Cir'];
const CITIES: Array<[string, string, string]> = [
  ['Rockville', 'MD', '20850'],
  ['Bethesda', 'MD', '20814'],
  ['Alexandria', 'VA', '22314'],
  ['Silver Spring', 'MD', '20901'],
  ['Arlington', 'VA', '22201'],
];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A deep record for one tee-sheet name.
 *
 * Proportions are tuned so the demo is not uniformly interesting: about a third hold a
 * membership, a quarter a punch card, a fifth a gift card, and a handful owe the course money.
 * If everybody carried everything, the customer modal would never show its empty states — and
 * the empty state is what staff see most.
 */
function synthesise(sheetName: string): Customer {
  const rand = rng(hash(sheetName));
  const [lastName, rest] = sheetName.split(',').map((s) => s.trim());
  const initial = (rest ?? 'A').charAt(0).toUpperCase();
  const firstName = pick(rand, FIRST_NAMES[initial] ?? FIRST_NAMES.A);

  const id = String(600000 + (hash(sheetName) % 90000));
  const memberships =
    rand() < 0.34
      ? [{ name: pick(rand, MEMBERSHIP_NAMES), expires: `${pad(1 + Math.floor(rand() * 12))}/${pad(1 + Math.floor(rand() * 28))}/2027` }]
      : [];

  const typeCount = Math.floor(rand() * 3);
  const customerTypes: string[] = [];
  for (let i = 0; i < typeCount; i++) {
    const t = pick(rand, CUSTOMER_TYPES);
    if (!customerTypes.includes(t)) customerTypes.push(t);
  }

  const punchCards =
    rand() < 0.25
      ? [
          (() => {
            const name = pick(rand, PUNCH_NAMES);
            const total = Number(name.split('-')[0]);
            return {
              name,
              total,
              remaining: Math.max(0, Math.floor(rand() * (total + 1))),
              expires: `12/31/2026`,
            };
          })(),
        ]
      : [];

  const giftCards =
    rand() < 0.2
      ? [
          (() => {
            const awarded = 25 * (1 + Math.floor(rand() * 4));
            const spent = +(awarded * rand() * 0.7).toFixed(2);
            return {
              id: String(70000 + Math.floor(rand() * 9000)),
              type: (rand() > 0.5 ? 'Purchased' : 'Winnings') as 'Purchased' | 'Winnings',
              expires: '12/31/2027',
              awarded,
              spent,
              balance: +(awarded - spent).toFixed(2),
              upc: String(600000000000 + Math.floor(rand() * 99999999999)),
            };
          })(),
        ]
      : [];

  // Rounds played. A small share carry a no-show, because "I didn't no-show" is the argument
  // Weston wants the record to be able to settle.
  const historyCount = 2 + Math.floor(rand() * 13);
  const teeTimes: CustomerTeeTime[] = Array.from({ length: historyCount }, (_, i) => {
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);
    const hour = 6 + Math.floor(rand() * 12);
    const minute = [0, 8, 16, 24, 32, 40, 48][Math.floor(rand() * 7)];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour > 12 ? hour - 12 : hour;
    const r = rand();
    return {
      id: String(9020000 + (hash(sheetName) % 8000) + i),
      date: `${month}/${day}/2026 ${h12}:${pad(minute)} ${ampm}`,
      players: 1 + Math.floor(rand() * 4),
      status: r < 0.06 ? 'No show' : r < 0.7 ? 'Paid' : undefined,
    };
  });

  const [city, state, zip] = pick(rand, CITIES);
  const digits = `${800 + Math.floor(rand() * 199)}${String(1000000 + Math.floor(rand() * 8999999))}`;
  const suffix = memberships[0]?.name ?? customerTypes[0];

  return {
    id,
    courseId: String(310000 + (hash(sheetName) % 90000)),
    firstName,
    lastName,
    displayName: suffix ? `${firstName} ${lastName} - ${suffix}` : `${firstName} ${lastName}`,
    sheetName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@${pick(rand, DOMAINS)}`,
    phone: digits.slice(0, 10),
    birthday: `${pad(1 + Math.floor(rand() * 12))}/${pad(1 + Math.floor(rand() * 28))}/${1948 + Math.floor(rand() * 50)}`,
    notes: rand() < 0.25 ? pick(rand, NOTES) : undefined,
    street: `${1 + Math.floor(rand() * 2400)} ${pick(rand, STREETS)}`,
    city,
    state,
    zip,
    memberships,
    customerTypes,
    giftCards,
    teeTimes,
    punchCards,
    rewardsBalance: Math.floor(rand() * 900),
    balance: rand() < 0.08 ? +(rand() * 120).toFixed(2) : 0,
    cardOnFile: rand() < 0.45 ? String(1000 + Math.floor(rand() * 8999)) : undefined,
    cardExpires: rand() < 0.45 ? `${pad(1 + Math.floor(rand() * 12))}/203${Math.floor(rand() * 9)}` : undefined,
  };
}

/**
 * The original 28 golfers, widened into records.
 *
 * They are already members with tiers and handicaps, so the synthesiser would only invent a
 * worse version of what the file already says. Their membership is preserved by name and the
 * rest is filled in the same deterministic way, so a Thompson looked up from a booking reads
 * like everyone else.
 */
function fromGolfer(g: (typeof MEMBER_DB)[number]): Customer {
  const base = synthesise(g.name);
  const [lastName, rest] = g.name.split(',').map((s) => s.trim());
  return {
    ...base,
    id: g.id,
    firstName: rest || base.firstName,
    lastName,
    displayName: g.memberType ? `${rest} ${lastName} - ${g.memberType}` : `${rest} ${lastName}`,
    sheetName: g.name,
    email: g.email,
    phone: normalizePhone(g.phone),
    memberships: g.memberType
      ? [{ name: TIER_MEMBERSHIPS[g.memberType] ?? 'Full Golf', expires: '12/31/2027' }]
      : [],
  };
}

/** Tier → the membership a record of that tier holds, the inverse of `MEMBERSHIP_TIERS`. */
const TIER_MEMBERSHIPS: Record<string, string> = {
  annual: 'Full Golf',
  seasonal: 'Weekday Golf',
  monthly: '30 Day booking window',
  senior: 'Full Golf',
  student: 'Junior',
};

const golferRecords = [...MEMBER_DB, ...GOLFER_DB.filter((g) => !MEMBER_DB.some((m) => m.id === g.id))].map(
  fromGolfer,
);

const golferNames = new Set(golferRecords.map((c) => c.sheetName));
const sheetRecords = SHEET_NAMES.filter((n) => !golferNames.has(n)).map(synthesise);

/** Every record the demo knows: ported, synthesised from the sheet, and the original golfers. */
export const roster: Customer[] = [...PORTED, ...golferRecords, ...sheetRecords];

const byBookingName = new Map(roster.map((c) => [bookingName(c), c]));
const byId = new Map(roster.map((c) => [c.id, c]));

/**
 * Phone → record, members first.
 *
 * Households share a number: a member and their spouse, a parent and two juniors. Whichever
 * record happens to come first in the file would otherwise decide how the booking prices, and
 * a member's tee time falling to the rack rate because their partner's record sorted earlier
 * is exactly the class of bug this round set out to kill. Preferring the member is the safe
 * reading — the counter can always link a specific person to the seat, and linking is what
 * actually settles it.
 */
const byPhone = (() => {
  const m = new Map<string, Customer>();
  for (const c of roster) {
    if (!c.phone) continue;
    const key = normalizePhone(c.phone);
    const held = m.get(key);
    if (!held || (!isMember(held) && isMember(c))) m.set(key, c);
  }
  return m;
})();

/**
 * The record behind a name on the tee sheet, or `null`.
 *
 * Null is a real answer, not a failure: a league, an outing and a block are bookings with
 * nobody behind them, and the reservation has to render that case without inventing a person.
 */
export const customerForName = (name: string): Customer | null => byBookingName.get(name) ?? null;

export const customerForId = (id: string | undefined): Customer | null =>
  (id ? byId.get(id) : undefined) ?? null;

export const customerForPhone = (phone: string | undefined): Customer | null => {
  const d = normalizePhone(phone ?? '');
  return d.length >= 10 ? (byPhone.get(d) ?? null) : null;
};

/** Search across the whole roster — 300-odd records, so the result cap earns its keep. */
export function searchRoster(query: string, limit = 8, list: Customer[] = roster): Customer[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const digits = normalizePhone(q);
  return list
    .filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        bookingName(c).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (digits.length >= 3 && normalizePhone(c.phone ?? '').includes(digits)) ||
        c.id.includes(q),
    )
    .slice(0, limit);
}

// ─── Session edits ──────────────────────────────────────────────────────────

/**
 * Edits made to a customer record during a session.
 *
 * Weston's case is fixing a wrong email at the counter, and an edit that vanishes the moment
 * you close the record does not demonstrate that — it demonstrates a form. So the record's Save
 * writes here, keyed by customer id, and every read goes through `liveCustomer`.
 *
 * An overlay rather than a mutated roster, for two reasons. The committed hundred stay a fixed
 * thing you can open and read, so a demo always starts from the same place; and the overlay is
 * ordinary reducer state, so it travels with everything else and resets on reload exactly as a
 * booking edit does.
 *
 * It is deliberately not persisted. Nothing in this prototype is.
 */
export type CustomerEdits = Record<string, Partial<Customer>>;

/**
 * A record as it stands now: the committed one with any session edit folded over it.
 *
 * Every surface that shows or prices a customer reads through this, because an edit that the
 * record shows but the player row does not is the same class of bug as a discount the row shows
 * and the register does not charge.
 */
export function liveCustomer(id: string | undefined, edits: CustomerEdits = {}): Customer | null {
  const base = customerForId(id);
  if (!base) return null;
  const patch = edits[base.id];
  return patch ? { ...base, ...patch } : base;
}

/** The whole roster with session edits folded in — what search and pricing read. */
export const liveRoster = (edits: CustomerEdits = {}): Customer[] =>
  Object.keys(edits).length === 0 ? roster : roster.map((c) => (edits[c.id] ? { ...c, ...edits[c.id] } : c));
