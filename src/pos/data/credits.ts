import { DEMO_TODAY } from './bookings';
import type { Customer, CustomerGiftCard, CustomerPunchCard } from './customers';

/**
 * Credits as TF Buck names them (Nov 26) — punch cards, credit books, and how they meet the gift
 * cards and rain checks Birdie already has.
 *
 * Buck's **Reports › Credits** (`tf-buck-ds-v1/src/components/application/credits-oct-27/`) lists
 * four instruments a counter meets: Gift Cards, Rain Checks, Punch Cards and Credit Books. Birdie had
 * the first three on a customer's record; this module gives them Buck's statuses and words, and adds
 * the fourth.
 *
 * ## Punch cards: Buck's final design
 *
 * Buck's punch-card report (`punch-cards-table/data.ts`, AS_OF 2026-10-15) gives a card **items** —
 * a green fee, a cart fee, a product, an activity, a clinic, a lesson — each with punches awarded and
 * used, and one **status**: *Active*, *Expiring soon* (within 30 days), *Exhausted* (every item used)
 * or *Expired*. Birdie's cards hold rounds only — Weston's rule is that a punch pays the green fee and
 * the ride is still billed — so each is one Buck item, a **Green Fee**, counted in rounds. The status
 * is computed the way Buck computes it, against the demo's today.
 *
 * ## Credit books: where Winnings come from
 *
 * A Buck credit book is a pot of money for a league or an event — *Men's League Weekly Play*,
 * *Member-Guest* — that pays out **to gift cards**: Buck's own gift-card detail reads "Paid out from
 * credit book …", typed *Winnings*. So Birdie's *Winnings* cards now say which book paid them, and a
 * customer's record lists the books they are in. A book is never a tender at the counter — the
 * gift card it paid is.
 *
 * Titles are generic league and event names in Buck's style, invented here; balances and counts are
 * invented and fixed. No clock, no randomness: a card's book is hashed from its id.
 */

// ─── Punch cards ────────────────────────────────────────────────────────────

export type PunchCardStatus = 'Active' | 'Expiring soon' | 'Exhausted' | 'Expired';

/** Buck's status colours (Badge `success` / `warning` / `gray` / `error`), as chip tones. */
export const PUNCH_STATUS_TONE: Record<PunchCardStatus, 'success' | 'warning' | 'muted' | 'error'> = {
  Active: 'success',
  'Expiring soon': 'warning',
  Exhausted: 'muted',
  Expired: 'error',
};

/** One of a card's items, in Buck's shape. Birdie's cards have exactly one: a green fee. */
export interface PunchCardItem {
  kind: 'green-fee';
  /** Buck's item label ("Green Fee") and what it covers. */
  label: string;
  target: string;
  /** Buck's unit for the kind — "rounds" for a green fee. */
  unit: string;
  awarded: number;
  used: number;
  remaining: number;
}

export const punchCardItems = (card: CustomerPunchCard): PunchCardItem[] => [
  { kind: 'green-fee', label: 'Green Fee', target: 'Any green fee', unit: 'rounds', awarded: card.total, used: card.total - card.remaining, remaining: card.remaining },
];

/** `MM/DD/YYYY` → a local-noon Date. */
const parseMdy = (mdy: string): Date => {
  const [m, d, y] = mdy.split('/').map(Number);
  return new Date(y, m - 1, d, 12);
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * A card's status, as Buck's report computes it: expired first, then exhausted, then expiring within
 * 30 days, else active.
 */
export function punchCardStatus(card: CustomerPunchCard, today: Date = DEMO_TODAY()): PunchCardStatus {
  const expires = card.expires ? parseMdy(card.expires) : null;
  if (expires && expires.getTime() < today.getTime()) return 'Expired';
  if (card.remaining <= 0) return 'Exhausted';
  if (expires && expires.getTime() - today.getTime() <= 30 * DAY) return 'Expiring soon';
  return 'Active';
}

/** Whether a card can pay for a round today — Active or Expiring soon, with a punch left. */
export const isUsablePunchCard = (card: CustomerPunchCard, today: Date = DEMO_TODAY()): boolean => {
  const s = punchCardStatus(card, today);
  return s === 'Active' || s === 'Expiring soon';
};

// ─── Credit books ───────────────────────────────────────────────────────────

/** Buck › Reports › Credits › Credit Books, one row. */
export interface CreditBook {
  /** Buck's book number. */
  id: string;
  title: string;
  /** What its payouts may buy, as Buck's toggles name them. */
  appliesTo: ('Merchandise' | 'Food & Beverage' | 'Tee Fees' | 'Alcohol')[];
  customers: number;
  transactions: number;
  /** What is left in the book; negative is overdrawn, as Buck shows it. */
  balance: number;
}

export const CREDIT_BOOKS: CreditBook[] = [
  { id: '2', title: "Men's League Weekly Play", appliesTo: ['Merchandise', 'Food & Beverage', 'Tee Fees'], customers: 41, transactions: 310, balance: 1575.94 },
  { id: '417', title: 'Tuesday Twilight League', appliesTo: ['Merchandise', 'Food & Beverage', 'Tee Fees'], customers: 18, transactions: 44, balance: 310.5 },
  { id: '388', title: 'Ladies 9-Hole Group', appliesTo: ['Merchandise', 'Food & Beverage', 'Tee Fees'], customers: 14, transactions: 27, balance: 185.25 },
  { id: '402', title: 'Super Seniors', appliesTo: ['Merchandise', 'Food & Beverage', 'Tee Fees'], customers: 12, transactions: 30, balance: 420 },
  { id: '377', title: 'Member-Guest', appliesTo: ['Merchandise', 'Food & Beverage', 'Tee Fees', 'Alcohol'], customers: 32, transactions: 64, balance: 128.56 },
  { id: '1', title: 'Hole in One Club', appliesTo: ['Merchandise', 'Tee Fees'], customers: 21, transactions: 149, balance: -687.8 },
];

const hash = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * The credit book that paid out a *Winnings* card — Buck's "Paid out from credit book …". Other
 * types were bought or given, not paid out, and have none.
 */
export function creditBookOf(card: Pick<CustomerGiftCard, 'id' | 'type'>): CreditBook | undefined {
  if (card.type !== 'Winnings') return undefined;
  return CREDIT_BOOKS[hash(card.id) % CREDIT_BOOKS.length];
}

/** The books a customer is in: every book that paid one of their cards, in Buck's list order. */
export function creditBooksOf(c: Pick<Customer, 'giftCards'>): CreditBook[] {
  const ids = new Set(c.giftCards.map((g) => creditBookOf(g)?.id).filter(Boolean));
  return CREDIT_BOOKS.filter((b) => ids.has(b.id));
}

/** "Winnings · Men's League Weekly Play" — a card's type, with the book that paid it when there is one. */
export const giftCardTypeLine = (card: Pick<CustomerGiftCard, 'id' | 'type'>): string => {
  const book = creditBookOf(card);
  return book ? `${card.type} · ${book.title}` : card.type;
};
