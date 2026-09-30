import { EMAIL_DOMAINS, normalizePhone, type Customer, type CustomerGiftCard } from '../data/customers';
import { customerForName, customerForPhone, liveCustomer, searchRoster } from '../data/roster';
import { SPEND_CATEGORIES, type SpendCategory } from '../data/spend';
import type { AccountEntry, SplitTender } from '../state/operations';
import type { PosState } from '../state/pos-store';
import type { CartItem } from '../types';
import { cardCategories, giftCardCovers } from './tenders';

/**
 * The rules behind Customer Search, the new-customer form, Gift Cards and the three account tenders
 * (V1 → V2, Wave 3). Pure, so each of v1's warts that this fixes is pinned by a unit test rather
 * than by someone remembering it.
 */

const cents = (n: number) => Math.round(n * 100) / 100;

// ─── Names and chips ────────────────────────────────────────────────────────

/**
 * The person's name, and only their name.
 *
 * v1 printed `displayName` — "Weston Farnsworth - 30 Day booking window" — so a membership read as
 * part of who someone is, and "Weston Senior - Senior" looked like a relative. The ported records
 * still carry that string (the other editions print it), so V1 → V2 builds the name from its parts
 * and shows the membership as a chip beside it.
 */
export const plainName = (c: Pick<Customer, 'firstName' | 'lastName' | 'displayName'>): string =>
  `${c.firstName} ${c.lastName}`.trim() || c.displayName;

export interface CustomerChip {
  label: string;
  tone: 'member' | 'type';
}

/** What someone is entitled to, as chips: memberships first (they set the rate), then customer types. */
export function customerChips(c: Pick<Customer, 'memberships' | 'customerTypes'>): CustomerChip[] {
  return [
    ...c.memberships.map((m) => ({ label: m.name, tone: 'member' as const })),
    ...c.customerTypes.map((t) => ({ label: t, tone: 'type' as const })),
  ];
}

/** Customer Search's lookup: name, email, phone, id or booking name, across the live roster. */
export const findCustomers = (query: string, roster: Customer[], limit = 30): Customer[] => searchRoster(query, limit, roster);

/** Who owes the course, most first — what Customer Search shows before anyone types. */
export const customersOwing = (roster: Customer[]): Customer[] =>
  roster.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);

// ─── The new-customer form ──────────────────────────────────────────────────

/**
 * An email with one of the one-tap domains put on it — **replacing** whatever domain it had.
 *
 * v1's chips appended, so tapping @GMAIL.COM after typing `sam@yahoo.com` gave
 * `sam@yahoo.com@gmail.com`. The chip's job is "they said Gmail, not Yahoo", which is a replace.
 */
export function withEmailDomain(email: string, domain: (typeof EMAIL_DOMAINS)[number] | string): string {
  const local = email.trim().split('@')[0];
  return `${local}${domain}`;
}

export interface CustomerDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where a draft stands against the form's rule — **a last name, and a phone number or an email**.
 *
 * v1 had the same rule and never wrote it down: you found it by pressing Save and getting three
 * badged fields and one tooltip that explained two of them. The form states it up front and ticks
 * each part off as it is met, so these flags are what the ticks read.
 */
export function customerDraftStatus(d: CustomerDraft) {
  const email = d.email.trim();
  const phone = normalizePhone(d.phone);
  const emailOk = email.length > 0 && EMAIL_RE.test(email);
  const phoneOk = phone.length === 10;
  return {
    hasLastName: d.lastName.trim().length > 0,
    hasContact: emailOk || phoneOk,
    /** Typed, but not an address — worth saying before Save rather than after. */
    emailInvalid: email.length > 0 && !emailOk,
    phoneInvalid: d.phone.trim().length > 0 && !phoneOk,
  };
}

/** What is stopping the draft saving, or `null`. One sentence, for the Save button's hint. */
export function customerDraftProblem(d: CustomerDraft): string | null {
  const s = customerDraftStatus(d);
  if (!s.hasLastName) return 'Add a last name';
  if (s.emailInvalid) return 'That email is missing part of the address';
  if (s.phoneInvalid) return 'A phone number is ten digits';
  if (!s.hasContact) return 'Add a phone number or an email';
  return null;
}

// ─── House account and card on file ─────────────────────────────────────────

/** A customer's house-account ledger this session, newest first. */
export const accountHistory = (entries: AccountEntry[], customerId: string): AccountEntry[] =>
  entries.filter((e) => e.customerId === customerId).slice().reverse();

/**
 * Whether a card on file has lapsed. The record stores `MM/YYYY`; a card is good through the last
 * day of its month, as a card is.
 */
export function cardExpired(expires: string | undefined, today: Date): boolean {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(expires ?? '');
  if (!m) return false;
  const month = Number(m[1]);
  const year = Number(m[2]);
  return year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1);
}

/** A membership still in force on `today`. `MM/DD/YYYY`; an unreadable date counts as current. */
function membershipCurrent(expires: string, today: Date): boolean {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(expires.trim());
  if (!m) return true;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/**
 * Whether this customer can be charged to a house account — **members only** (Justin's call). No
 * separate flag: a house account comes with a membership, so it follows the membership chips already
 * on the record, and lapses with them. Someone who already owes can still pay it off; they just
 * cannot run it up.
 */
export function hasHouseAccount(c: Pick<Customer, 'memberships'>, today: Date): boolean {
  return c.memberships.some((m) => membershipCurrent(m.expires, today));
}

/** Why this customer cannot be charged to a house account, or `null`. */
export function houseAccountRefusal(c: Pick<Customer, 'memberships' | 'firstName' | 'lastName'>, today: Date): string | null {
  if (hasHouseAccount(c, today)) return null;
  const name = `${c.firstName} ${c.lastName}`.trim();
  return c.memberships.length
    ? `${name}’s membership has lapsed, and the house account with it. Take another tender.`
    : `${name} isn’t a member. House accounts come with a membership — take another tender.`;
}

/** Why an order cannot go on a house account, or `null`. */
export function houseAccountProblem(cart: CartItem[]): string | null {
  if (cart.some((l) => l.accountPayment)) return 'This order is paying an account off — it can’t go back on one.';
  return null;
}

/**
 * Whose order this is, as best the register knows: the account being paid, the tab's customer, the
 * reservation's booker, or the golfer picked on the rail. The tender dialogs start there, so the
 * common case — the person in front of you — is already chosen.
 */
export function orderCustomerId(
  s: Pick<PosState, 'payingAccountId' | 'payingTabId' | 'tabs' | 'selectedBookingId' | 'bookings' | 'selectedGolfer' | 'customerEdits'>,
): string | null {
  if (s.payingAccountId) return s.payingAccountId;
  const tab = s.payingTabId ? s.tabs.find((t) => t.id === s.payingTabId) : undefined;
  if (tab?.customerId) return tab.customerId;
  const booking = s.selectedBookingId ? s.bookings.find((b) => b.id === s.selectedBookingId) : undefined;
  if (booking) {
    const c = customerForName(booking.name) ?? customerForPhone(booking.phone);
    if (c) return c.id;
  }
  if (s.selectedGolfer?.id && liveCustomer(s.selectedGolfer.id, s.customerEdits)) return s.selectedGolfer.id;
  return null;
}

// ─── Gift cards ─────────────────────────────────────────────────────────────

/**
 * A card with nothing left on it. v1 said so only by dimming the row, which reads as "disabled" or
 * "loading" as easily as "spent"; here it is a badge.
 */
export const isSpent = (card: Pick<CustomerGiftCard, 'balance'>): boolean => card.balance <= 0;

/** Short names for a card's categories, in the order `SPEND_CATEGORIES` lists them. */
const SHORT: Record<SpendCategory, string> = { merchandise: 'Merchandise', fnb: 'F&B', tee: 'Tee fees', alcohol: 'Alcohol' };

export const categoryLabels = (card: Pick<CustomerGiftCard, 'categories'>): string[] => {
  const on = new Set(cardCategories(card));
  return SPEND_CATEGORIES.filter((c) => on.has(c.id)).map((c) => SHORT[c.id]);
};

export interface GiftCardListing {
  card: CustomerGiftCard;
  customerId?: string;
  holder: string;
}

/**
 * The listing with each holder on the roster printed by name alone. `allGiftCards` carries
 * `displayName`, which for a ported record is "Beatriz Kaur - Full Golf".
 */
export const withPlainHolders = (list: GiftCardListing[], edits: PosState['customerEdits']): GiftCardListing[] =>
  list.map((x) => {
    const c = x.customerId ? liveCustomer(x.customerId, edits) : null;
    return c ? { ...x, holder: plainName(c) } : x;
  });

/** Gift Cards' search: the holder, the card number or its UPC. Empty returns everything. */
export function searchGiftCards(query: string, all: GiftCardListing[]): GiftCardListing[] {
  const q = query.trim().toLowerCase();
  if (!q) return all;
  const digits = q.replace(/\D/g, '');
  return all.filter(
    (x) =>
      x.holder.toLowerCase().includes(q) ||
      x.card.id.toLowerCase().includes(q) ||
      (digits.length >= 3 && x.card.upc.includes(digits)) ||
      x.card.type.toLowerCase().includes(q),
  );
}

export function giftCardTotals(list: GiftCardListing[]) {
  return {
    cards: list.length,
    outstanding: cents(list.reduce((s, x) => s + Math.max(0, x.card.balance), 0)),
    awarded: cents(list.reduce((s, x) => s + x.card.awarded, 0)),
    spent: list.filter((x) => isSpent(x.card)).length,
  };
}

/**
 * What this card may pay **now**, on this order.
 *
 * `giftCardCovers`, told what earlier gift cards on a split tender have already paid — so a second
 * card is not offered the lines the first one covered.
 */
export function giftCardCanPay(
  card: Pick<CustomerGiftCard, 'balance' | 'categories'>,
  cart: CartItem[],
  due: number,
  split: Pick<SplitTender, 'tenders'> | null,
): number {
  const paidByCards = (split?.tenders ?? []).filter((t) => t.method === 'giftcard').reduce((s, t) => s + t.amount, 0);
  return giftCardCovers(card, cart, due, paidByCards);
}

/**
 * A new record started from a search that found nobody, as v1's "Add customer" did: a phone number
 * or an email goes where it belongs, and a name is split — `Last, First` or `First Last`.
 */
export function draftFromQuery(query: string): { firstName: string; lastName: string; email: string; phone: string } {
  const q = query.trim();
  const empty = { firstName: '', lastName: '', email: '', phone: '' };
  if (!q) return empty;
  if (q.includes('@')) return { ...empty, email: q };
  if (q.replace(/\D/g, '').length >= 7 && !/[a-z]/i.test(q)) return { ...empty, phone: q };
  if (q.includes(',')) {
    const [last, first = ''] = q.split(',').map((x) => x.trim());
    return { ...empty, firstName: first, lastName: last };
  }
  const words = q.split(/\s+/);
  return words.length === 1 ? { ...empty, lastName: words[0] } : { ...empty, firstName: words.slice(0, -1).join(' '), lastName: words.at(-1)! };
}
