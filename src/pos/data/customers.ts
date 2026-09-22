import type { MemberTypeKey } from '../../theme/tokens';
import type { Golfer, IdMeGroup } from '../types';
import records from './customers.json';

/**
 * The customer database.
 *
 * A hundred committed records in `customers.json`, ported from the v1 prototype rather than
 * regenerated here. That is the important part: the tee sheet books against these people, the
 * raincheck ledger is owned by them, and the reservation prices a seat from the record sitting
 * in it — so the database has to be a fixed thing you can open and read, not a function of a
 * seed that shifts when the file is touched.
 *
 * A hundred rather than a handful because the interesting problems only appear at volume: a
 * household sharing one phone number, three Brennevins, a member and their guest account
 * separated by two characters, and names long enough to truncate in a 640px panel. A dozen
 * fixtures make customer search look easy when it is not.
 *
 * The shape is wider than the old `Golfer` it replaces. Weston's second round of feedback is
 * that tapping a player's name should answer questions about their account — "do I still have
 * that gift card", "I didn't no-show" — so memberships, customer types, punch cards, gift
 * cards, rounds played and balances all live on the record, and the customer modal reads them
 * straight off it. `Golfer` survives as a projection (`golferOf`) so everything written against
 * the old roster keeps working.
 */

export interface Membership {
  name: string;
  /** `MM/DD/YYYY`. */
  expires: string;
}

export interface CustomerGiftCard {
  id: string;
  type: 'Purchased' | 'Winnings';
  expires: string;
  awarded: number;
  spent: number;
  balance: number;
  upc: string;
}

export interface CustomerPunchCard {
  name: string;
  remaining: number;
  total: number;
  expires: string;
}

/**
 * A round on this customer's record.
 *
 * `status` is absent on archive rows: the history list has hundreds of rounds behind it and
 * only the live ones — the bookings actually sitting on a sheet we have loaded — can say
 * whether someone showed up. A row with no status is "played, some time ago", which is still
 * the answer to "how often does this person golf here".
 */
export interface CustomerTeeTime {
  id: string;
  /** `MM/DD/YYYY h:mm AM`. */
  date: string;
  players: number;
  status?: 'Booked' | 'Checked in' | 'Paid' | 'No show';
  time?: string;
  course?: string;
}

export interface Customer {
  /** Internal id, printed as `Customer ID` on the record and on the player row. */
  id: string;
  /** The course's own id for the same person — deliberately not the same number. */
  courseId: string;
  firstName: string;
  lastName: string;
  /**
   * How customer search prints them. Membership and customer-type suffixes are part of the
   * name on the device rather than a separate column, which is why two records for one person
   * can look like two different people.
   */
  displayName: string;
  /**
   * How a tee-time booking prints them, when that differs from `Last, First`.
   *
   * The course abbreviates some regulars to "Sutton, K." and prefixes guest accounts with
   * "G-". Without this a name on a booking is just a string that resembles a customer and
   * cannot be resolved to one — which is exactly the bug that made a seat price wrong.
   */
  sheetName?: string;
  /** A short code some records carry, shown above the name. */
  tag?: string;
  email: string;
  phone?: string;
  birthday?: string;
  notes?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  memberships: Membership[];
  customerTypes: string[];
  giftCards: CustomerGiftCard[];
  teeTimes: CustomerTeeTime[];
  punchCards: CustomerPunchCard[];
  rewardsBalance: number;
  /** Positive means they owe the course. */
  balance: number;
  cardOnFile?: string;
  cardExpires?: string;
}

export const customers = records as Customer[];

/**
 * Every customer type the course has configured, in the order the record lays them out.
 *
 * Eighteen of them, which is the point: Weston's note on the old screen was that a column of
 * eighteen checkboxes is unreadable, and the record should show the ones a person *has* with
 * an expander to assign more. The list is long here so that design has something to fail
 * against.
 */
export const CUSTOMER_TYPES = [
  'Senior',
  'Military',
  'Resident',
  'Private Cart',
  'Diamond',
  'New Deal',
  'Guest of Members',
  'Hero',
  'premium single',
  'Resident 22 Test',
  'Austin Test',
  'Test percent off',
  'Simp',
  'Employee',
  'Campaign Testers',
  'Wonderful Person',
  'Average Person',
  'Junior',
] as const;

/** The email domains the record offers as one-tap suffixes when fixing an address. */
export const EMAIL_DOMAINS = [
  '@gmail.com',
  '@yahoo.com',
  '@hotmail.com',
  '@aol.com',
  '@sbcglobal.net',
  '@att.net',
] as const;

/**
 * Membership name → the tier badge the POS already draws.
 *
 * The course sells memberships by name ("Full Golf", "Corporate — 4 seat"); the terminal
 * colours them by tier. Keeping the mapping here rather than renaming the memberships means
 * the record still says what the customer bought, which is what they will argue about.
 */
const MEMBERSHIP_TIERS: Record<string, MemberTypeKey> = {
  'Full Golf': 'annual',
  'Corporate — 4 seat': 'annual',
  'Weekday Golf': 'seasonal',
  '30 Day booking window': 'monthly',
  'Trial Month': 'monthly',
  Social: 'monthly',
  Junior: 'student',
};

/**
 * Which tier a customer plays on, or `null` for a non-member.
 *
 * A senior member is a senior first: the tier drives the badge and the rate row, and someone
 * carrying the Senior customer type alongside a membership is on the senior rate whatever the
 * membership is called.
 */
export function memberTierOf(c: Customer): MemberTypeKey | null {
  if (c.memberships.length === 0) return null;
  if (c.customerTypes.includes('Senior')) return 'senior';
  if (c.customerTypes.includes('Junior')) return 'student';
  return MEMBERSHIP_TIERS[c.memberships[0].name] ?? 'annual';
}

export const isMember = (c: Customer): boolean => c.memberships.length > 0;

/**
 * How a booking prints this person: their sheet name if the course keeps one, else
 * `Last, First` — the surname-first convention the tee sheet sorts and displays on.
 */
export const bookingName = (c: Customer): string => c.sheetName ?? `${c.lastName}, ${c.firstName}`;

/**
 * ID.me verification, derived from the customer types the course already records.
 *
 * Badge only, as agreed — the verify flow waits on how Birdie presents it today. Deriving it
 * from Military / Hero / Employee rather than storing a separate flag means a record can't
 * claim a verification its own types contradict.
 */
export function idMeGroupOf(c: Customer): IdMeGroup | null {
  if (c.customerTypes.includes('Military')) return 'military';
  if (c.customerTypes.includes('Hero')) return 'first_responder';
  return null;
}

/** Digits-only phone, for matching numbers written in inconsistent formats. */
export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

/** `(555) 234-1234` from the ten digits the record stores. */
export function formatPhone(phone: string | undefined): string {
  const d = normalizePhone(phone ?? '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (phone ?? '');
}

/**
 * The `Golfer` projection.
 *
 * Everything written before this file — member lookup, the golfer picker, the membership dot on
 * a tee-sheet chip — takes a `Golfer`. Rather than rewrite those against `Customer`, the roster
 * is projected: one record, two views, no second list to keep in step.
 */
export function golferOf(c: Customer): Golfer {
  const tier = memberTierOf(c);
  return {
    id: c.id,
    name: bookingName(c),
    phone: formatPhone(c.phone),
    email: c.email,
    type: tier ? 'Member' : 'Guest',
    memberType: tier,
    hcp: hcpOf(c),
    joined: c.memberships[0]?.expires ?? null,
    notes: c.notes,
  };
}

/**
 * A stable handicap for a record that has none.
 *
 * The old roster carried one and the UI prints it, so rather than drop the field or invent a
 * number per render it is hashed from the customer id: the same person always reads the same
 * handicap, and no screenshot changes between runs.
 */
function hcpOf(c: Customer): number {
  let h = 0;
  for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 31;
}

export const customerById = (id: string, list: Customer[] = customers): Customer | null =>
  list.find((c) => c.id === id) ?? null;

/**
 * Booking name → record.
 *
 * Built once. This is the join that makes a name on the tee sheet a person: the reservation,
 * the customer modal and the rate a seat pays all resolve through it.
 */
export const customersByBookingName: Record<string, Customer> = Object.fromEntries(
  customers.map((c) => [bookingName(c), c]),
);

export const customerByBookingName = (name: string, list: Customer[] = customers): Customer | null =>
  list.find((c) => bookingName(c) === name) ?? null;

/** The record whose phone matches, ignoring punctuation — how a booker is identified. */
export function customerByPhone(phone: string, list: Customer[] = customers): Customer | null {
  const d = normalizePhone(phone);
  if (d.length < 10) return null;
  return list.find((c) => normalizePhone(c.phone ?? '') === d) ?? null;
}

/**
 * The lookup customer search runs.
 *
 * Matches name, email, phone, the customer id and the booking name, so a person found on the
 * tee sheet can be found again here. Results are capped — the device returns everything and the
 * list just keeps going, which is fine on a real CRM but makes a two-letter query look broken.
 */
export function searchCustomers(query: string, limit = 8, list: Customer[] = customers): Customer[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return list
    .filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        bookingName(c).toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        normalizePhone(c.phone ?? '').includes(normalizePhone(q)) ||
        c.id.includes(q),
    )
    .slice(0, limit);
}

/**
 * Builds a record from what the new-customer form collects.
 *
 * Everything the form does not ask for is left empty rather than invented — a counter-created
 * customer genuinely has no address, no memberships and no history, and filling those in would
 * make a brand-new record look like an established one the moment it is saved.
 */
export function newCustomer(
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    birthday?: string;
    notes?: string;
    types?: string[];
  },
  seq: number,
): Customer {
  const suffix = input.types?.[0];
  const name = `${input.firstName} ${input.lastName}`;
  return {
    id: String(560000 + seq),
    courseId: String(410000 + seq),
    firstName: input.firstName,
    lastName: input.lastName,
    displayName: suffix ? `${name} - ${suffix}` : name,
    email: input.email ?? '',
    phone: input.phone,
    birthday: input.birthday,
    notes: input.notes,
    memberships: [],
    customerTypes: input.types ?? [],
    giftCards: [],
    teeTimes: [],
    punchCards: [],
    rewardsBalance: 0,
    balance: 0,
  };
}
