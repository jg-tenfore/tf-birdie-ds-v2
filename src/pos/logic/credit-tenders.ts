import {
  BUCK_PUNCH_CARDS,
  CREDIT_BOOKS,
  LESSON_CREDITS,
  LESSON_LINE_MINUTES,
  PUNCH_UNIT,
  lessonInstructor,
  RAIN_CHECK_RULES,
  buckPunchCardStatus,
  creditBooksOf,
  isPastMdy,
  punchCardStatus,
  punchItemLabel,
  type BuckPunchItem,
  type CreditBook,
} from '../data/credits';
import type { Customer } from '../data/customers';
import { DEMO_TODAY } from '../data/bookings';
import { isExpired, type RainCheck } from '../data/rain-checks';
import type { ResourceBooking } from '../data/resources';
import { spendCategoryOf, type SpendCategory } from '../data/spend';
import type { CartItem } from '../types';
import { payableTotal, playerBreakdown } from './cart';

/**
 * Credits as checkout tenders (Nov 26, "checkout that's right") — the rules, pure.
 *
 * Buck configures four credits a counter meets besides a gift card, and until now only the gift card
 * paid. Each is now a tender for the **customer on the order**, and each pays only what Buck says it
 * may — the same discipline the gift card's categories have (`logic/tenders.ts`): what a credit cannot
 * pay is named and stays due on another tender (a split tender, `payPart`).
 *
 * - **Rain check** — money. Buck's *Rainchecks Only on Tee Times* is on, so it pays tee-time lines only,
 *   with their tax; Buck's *Rain Check Expiration* (365 days) retires it. The counter keys how much to
 *   take — nothing is prorated.
 * - **Punch card** — punches. One per eligible item: a seat's green fee (the ride is still billed —
 *   Weston's rule), a seat's cart, a unit of a product; an activity takes **minutes per punch**, so a
 *   90-minute bay on a 60-minute card takes two.
 * - **Credit book** — money, from a league's or an event's book, only for what the book applies to
 *   (Buck's Merchandise / Food & Beverage / Tee Fees / Alcohol switches). A book in the red pays nothing.
 * - **Lesson credit** — one lesson of the credit's length per credit, with the pack's own instructor
 *   (Nov 26: the lesson line carries the instructor picked when it was rung up).
 *
 * Every amount here is a line's **total with its tax** (`lineTotals`), so a credit that pays a tee fee
 * pays the tee fee's tax with it, and what is left due is exactly the other lines.
 */

export type CreditKind = 'raincheck' | 'punchcard' | 'creditbook' | 'lessoncredit';

/** The four, in the order checkout lists them. */
export const CREDIT_KINDS: CreditKind[] = ['raincheck', 'punchcard', 'creditbook', 'lessoncredit'];

export const isCreditMethod = (m: string): m is CreditKind => (CREDIT_KINDS as string[]).includes(m);

export const CREDIT_NAMES: Record<CreditKind, string> = {
  raincheck: 'Rain check',
  punchcard: 'Punch card',
  creditbook: 'Credit book',
  lessoncredit: 'Lesson credit',
};

export const CREDIT_ICONS: Record<CreditKind, string> = {
  raincheck: 'wb_cloudy',
  punchcard: 'confirmation_number',
  creditbook: 'menu_book',
  lessoncredit: 'school',
};

/** What a payment record says about the credit that paid — on the tender, the ledger and the receipt. */
export interface CreditRef {
  kind: CreditKind;
  /** The ledger key the balance moves under (`creditKey`). */
  key: string;
  /** Buck's number for it: rain check 51400, card CPC-10611, book 2, pack bal-jp-5. */
  id: string;
  /** "Rain check #51400", "Range Pass · Range Bucket Large". */
  label: string;
  unit: 'money' | 'punch' | 'credit';
  /** Punches or credits taken, for the unit credits. */
  units?: number;
  /** The money it paid, when it paid — so a part refund can give back the right share of punches. */
  value: number;
  /** Which lines it paid, by index, and how much of each — what a refund returns to it. */
  covers: Record<number, number>;
}

/** One credit on a customer that checkout can offer. */
export interface CreditOption {
  kind: CreditKind;
  key: string;
  id: string;
  title: string;
  /** Expiry, what it applies to, the instructor. */
  detail: string;
  unit: 'money' | 'punch' | 'credit';
  /** Money, or punches / credits left. */
  balance: number;
  usable: boolean;
  /** Why it cannot pay today — expired, used up, a book in the red. */
  reason?: string;
  rule:
    | { kind: 'raincheck' }
    | { kind: 'creditbook'; appliesTo: CreditBook['appliesTo'] }
    | { kind: 'punch'; item: BuckPunchItem }
    /** `instructorId` null: any instructor's lesson (Buck's academy-wide pack). */
    | { kind: 'lesson'; minutes: number; instructorId: string | null; instructor: string };
}

/** How a balance reads: `$35.83`, `6 punches`, `3 credits`. */
export function balanceLabel(unit: CreditOption['unit'], n: number, money: (n: number) => string): string {
  if (unit === 'money') return money(n);
  const word = unit === 'punch' ? 'punch' : 'credit';
  return `${n} ${n === 1 ? word : unit === 'punch' ? 'punches' : 'credits'}`;
}

/** The ledger key a credit's balance moves under. A legacy round card is the customer's card by index. */
export const creditKey = {
  raincheck: (id: string) => `raincheck:${id}`,
  legacyPunch: (customerId: string, index: number) => `punch-legacy:${customerId}:${index}`,
  punch: (cardId: string, item: number) => `punch:${cardId}:${item}`,
  book: (id: string) => `book:${id}`,
  lesson: (id: string) => `lesson:${id}`,
};

/** What a session has spent on each credit (`creditSpend`), and the rain checks it can see. */
export interface CreditLedger {
  spend: Record<string, number>;
  rainChecks: RainCheck[];
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** The credits of `kind` a customer holds, usable or not, with what is left on each. */
export function creditOptions(kind: CreditKind, customer: Customer, ledger: CreditLedger, today: Date = DEMO_TODAY()): CreditOption[] {
  const spent = (key: string) => ledger.spend[key] ?? 0;
  switch (kind) {
    case 'raincheck':
      return ledger.rainChecks
        .filter((r) => r.customerId === customer.id)
        .map((r) => {
          const key = creditKey.raincheck(r.id);
          const balance = cents(r.balance - spent(key));
          const expired = isExpired(r, today);
          return {
            kind,
            key,
            id: r.id,
            title: `Rain check #${r.id}`,
            detail: `${r.teeTime} · ${r.totalHoles} holes · expires ${r.expires}`,
            unit: 'money' as const,
            balance,
            usable: !expired && balance > 0.004,
            reason: expired ? `Expired ${r.expires}` : balance <= 0.004 ? 'Nothing left on it' : undefined,
            rule: { kind: 'raincheck' as const },
          };
        });
    case 'punchcard': {
      const legacy: CreditOption[] = customer.punchCards.map((c, i) => {
        const status = punchCardStatus(c, today);
        const key = creditKey.legacyPunch(customer.id, i);
        return {
          kind,
          key,
          id: `${customer.id}-${i + 1}`,
          title: `${c.name} · Green Fee`,
          detail: `Any green fee · ${c.remaining} of ${c.total} rounds left · expires ${c.expires}`,
          unit: 'punch' as const,
          balance: c.remaining,
          usable: status === 'Active' || status === 'Expiring soon',
          reason: status === 'Expired' ? `Expired ${c.expires}` : status === 'Exhausted' ? 'Every punch used' : undefined,
          rule: { kind: 'punch' as const, item: { kind: 'green-fee' as const, target: 'Any green fee', awarded: c.total, used: c.total - c.remaining } },
        };
      });
      const buck: CreditOption[] = (BUCK_PUNCH_CARDS[customer.id] ?? []).flatMap((card) => {
        const status = buckPunchCardStatus(card, today);
        return card.items.map((item, ii) => {
          const key = creditKey.punch(card.id, ii);
          const left = Math.max(0, item.awarded - item.used - spent(key));
          return {
            kind,
            key,
            id: card.id,
            title: `${card.title} · ${punchItemLabel(item)}`,
            detail: `${left} of ${item.awarded} ${PUNCH_UNIT[item.kind]} left · ${card.expires ? `expires ${card.expires}` : 'no expiry'}`,
            unit: 'punch' as const,
            balance: left,
            usable: (status === 'Active' || status === 'Expiring soon') && left > 0,
            reason: status === 'Expired' ? `Expired ${card.expires}` : left <= 0 ? 'Every punch of this item used' : undefined,
            rule: { kind: 'punch' as const, item },
          };
        });
      });
      return [...legacy, ...buck];
    }
    case 'creditbook':
      return creditBooksOf(customer).map((b) => {
        const key = creditKey.book(b.id);
        const balance = cents(b.balance - spent(key));
        return {
          kind,
          key,
          id: b.id,
          title: b.title,
          detail: `Book ${b.id} · for ${b.appliesTo.join(', ')}`,
          unit: 'money' as const,
          balance,
          usable: balance > 0.004,
          reason: balance <= 0.004 ? 'The book is overdrawn' : undefined,
          rule: { kind: 'creditbook' as const, appliesTo: b.appliesTo },
        };
      });
    case 'lessoncredit':
      return (LESSON_CREDITS[customer.id] ?? []).map((l) => {
        const key = creditKey.lesson(l.id);
        const left = Math.max(0, l.creditsRemaining - spent(key));
        const expired = isPastMdy(l.expires, today);
        return {
          kind,
          key,
          id: l.id,
          title: l.label,
          detail: `${l.instructor} · ${left} of ${l.creditsTotal} left · expires ${l.expires}`,
          unit: 'credit' as const,
          balance: left,
          usable: !expired && left > 0,
          reason: expired ? `Expired ${l.expires}` : left <= 0 ? 'Every credit used' : undefined,
          rule: { kind: 'lesson' as const, minutes: l.minutes, instructorId: l.instructorId, instructor: lessonInstructor(l.instructorId)?.name ?? l.instructor },
        };
      });
  }
}

/** Buck's credit-book switches, by Birdie's spend categories. */
const BOOK_CATEGORY: Record<SpendCategory, CreditBook['appliesTo'][number]> = {
  merchandise: 'Merchandise',
  fnb: 'Food & Beverage',
  tee: 'Tee Fees',
  alcohol: 'Alcohol',
};

/** What a credit pays of an order, line by line, and what it cannot. */
export interface Coverage {
  lines: { index: number; amount: number; units: number; what: string }[];
  /** Money it pays — tax with the lines. */
  amount: number;
  /** Punches or credits it takes. */
  units: number;
  cannot: { index: number; name: string; reason: string }[];
}

/** What the order is, for coverage: its lines' totals and what is already paid of each. */
export interface CoverageContext {
  /** `lineTotals(cart, pricing)` — index for index with the cart. */
  totals: number[];
  /** What is still due on the order (or the part being paid). */
  due: number;
  /** What earlier credits on this order already paid of each line. */
  covered?: Record<number, number>;
  /** The court and bay bookings, for an activity's minutes. */
  resources?: readonly ResourceBooking[];
}

/** The catalog's own simulator hour, as an activity. */
const CATALOG_ACTIVITY: Record<string, { target: string; minutes: number }> = {
  'Golf Simulator 1hr': { target: 'Simulator Bays', minutes: 60 },
};

const isTaxRow = (l: CartItem) => Boolean(l.isTax) || l.name === 'Taxes';

/**
 * What `option` pays of `cart`. `amount` is capped by the credit's balance (money credits) and by
 * what is due; a unit credit takes whole items only, so a line it cannot cover with the punches it
 * has is left to another tender.
 */
export function creditCoverage(option: CreditOption, cart: CartItem[], ctx: CoverageContext): Coverage {
  const covered = ctx.covered ?? {};
  const open = (i: number) => cents(Math.max(0, ctx.totals[i] - (covered[i] ?? 0)));
  const out: Coverage = { lines: [], amount: 0, units: 0, cannot: [] };
  const lines = cart.map((line, index) => ({ line, index })).filter(({ line }) => !isTaxRow(line) && !line.dish?.voided);
  const rule = option.rule;

  const moneyCredit = (eligible: (l: CartItem) => string | null) => {
    let left = Math.min(option.balance, ctx.due);
    for (const { line, index } of lines) {
      const why = eligible(line);
      if (why) {
        if (open(index) > 0) out.cannot.push({ index, name: line.name, reason: why });
        continue;
      }
      const take = cents(Math.min(open(index), left));
      if (take <= 0) continue;
      out.lines.push({ index, amount: take, units: 0, what: line.name });
      left = cents(left - take);
    }
  };

  if (rule.kind === 'raincheck') {
    moneyCredit((l) => (!RAIN_CHECK_RULES.onlyOnTeeTimes || l.isCheckIn ? null : 'rain checks pay tee times only'));
  } else if (rule.kind === 'creditbook') {
    moneyCredit((l) => {
      const c = spendCategoryOf(l);
      if (!c) return 'not something a credit book buys';
      return rule.appliesTo.includes(BOOK_CATEGORY[c]) ? null : `the book is not for ${BOOK_CATEGORY[c].toLowerCase()}`;
    });
  } else {
    // Units: a punch or a lesson credit buys whole things.
    let unitsLeft = option.balance;
    let dueLeft = ctx.due;
    const take = (index: number, units: number, amount: number, what: string) => {
      const a = cents(Math.min(amount, dueLeft));
      if (units <= 0 || a <= 0) return;
      out.lines.push({ index, amount: a, units, what });
      unitsLeft -= units;
      dueLeft = cents(dueLeft - a);
    };
    for (const { line, index } of lines) {
      const lineOpen = open(index);
      if (lineOpen <= 0) continue;
      const goods = payableTotal([line]);
      // A line's money with its tax, per unit of what the credit counts.
      const withTax = (part: number) => (goods > 0 ? cents((part / goods) * lineOpen) : 0);
      if (rule.kind === 'lesson') {
        const minutes = LESSON_LINE_MINUTES[line.name];
        if (minutes == null) {
          out.cannot.push({ index, name: line.name, reason: 'not a lesson' });
          continue;
        }
        if (minutes !== rule.minutes) {
          out.cannot.push({ index, name: line.name, reason: `a ${minutes}-minute lesson, not ${rule.minutes}` });
          continue;
        }
        // Nov 26 decision: a pack pays only its own instructor's lessons.
        if (rule.instructorId && line.lesson?.instructorId !== rule.instructorId) {
          out.cannot.push({
            index,
            name: line.name,
            reason: line.lesson ? `${line.lesson.instructor}’s lesson, not ${rule.instructor}’s` : `no instructor on the lesson — this pack is ${rule.instructor}’s`,
          });
          continue;
        }
        const n = Math.min(line.qty, unitsLeft);
        if (n < line.qty) out.cannot.push({ index, name: line.name, reason: 'not enough credits left' });
        take(index, n, withTax((goods / line.qty) * n), line.name);
        continue;
      }
      const item = rule.item;
      if (item.kind === 'green-fee' || item.kind === 'transportation') {
        if (!line.isCheckIn) {
          const isCartRental = item.kind === 'transportation' && /Riding Cart/.test(line.name);
          if (isCartRental) {
            const n = Math.min(line.qty, unitsLeft);
            take(index, n, withTax((goods / line.qty) * n), line.name);
          } else out.cannot.push({ index, name: line.name, reason: item.kind === 'green-fee' ? 'not a green fee' : 'not a cart fee' });
          continue;
        }
        let n = 0;
        let part = 0;
        for (const p of line.players ?? []) {
          if (p.paid || p.noShow || unitsLeft - n <= 0) continue;
          const b = playerBreakdown(line.unitPrice ?? 0, p);
          if (item.kind === 'green-fee' && b.fee > 0) {
            n += 1;
            part += b.fee;
          } else if (item.kind === 'transportation' && b.transport > 0) {
            const tag = p.modifierTags.find((t) => t.isTransport);
            if (item.target.startsWith('Any') || tag?.name === item.target) {
              n += 1;
              part += b.transport;
            }
          }
        }
        if (n === 0) {
          out.cannot.push({ index, name: line.name, reason: item.kind === 'green-fee' ? 'no green fee left to punch' : `no ${item.target.toLowerCase()} on it` });
          continue;
        }
        take(index, n, withTax(part), `${line.name} · ${n} ${item.kind === 'green-fee' ? (n === 1 ? 'green fee' : 'green fees') : n === 1 ? 'cart fee' : 'cart fees'}`);
        // What the punch does not pay of a tee time — the ride, on a green-fee card — stays due.
        if (cents(withTax(part)) < lineOpen) out.cannot.push({ index, name: line.name, reason: item.kind === 'green-fee' ? 'the ride is still billed' : 'the green fee is still billed' });
        continue;
      }
      if (item.kind === 'product') {
        if (line.name !== item.target) {
          out.cannot.push({ index, name: line.name, reason: `the card is for ${item.target}` });
          continue;
        }
        const n = Math.min(line.qty, unitsLeft);
        if (n < line.qty) out.cannot.push({ index, name: line.name, reason: 'not enough punches left' });
        take(index, n, withTax((goods / line.qty) * n), `${n}× ${line.name}`);
        continue;
      }
      // An activity: minutes per punch.
      const booking = line.resourceBookingId ? ctx.resources?.find((b) => b.id === line.resourceBookingId) : undefined;
      const catalog = CATALOG_ACTIVITY[line.name];
      const isBay = booking?.kind === 'bay' || catalog?.target === item.target;
      const minutes = booking ? booking.durationMin * line.qty : catalog ? catalog.minutes * line.qty : 0;
      if (!isBay || !minutes) {
        out.cannot.push({ index, name: line.name, reason: `the card is for ${item.target.toLowerCase()}` });
        continue;
      }
      const need = Math.ceil(minutes / (item.duration ?? 60));
      if (need > unitsLeft) {
        out.cannot.push({ index, name: line.name, reason: `${minutes} min takes ${need} punches; ${unitsLeft} left` });
        continue;
      }
      take(index, need, lineOpen, `${line.name} · ${minutes} min`);
    }
  }

  out.amount = cents(out.lines.reduce((s, l) => s + l.amount, 0));
  out.units = out.lines.reduce((s, l) => s + l.units, 0);
  return out;
}

/** What earlier credit tenders on a split already paid of each line. */
export function coveredByCredits(tenders: readonly { ref?: { credit?: Pick<CreditRef, 'covers'> } }[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const t of tenders) for (const [i, a] of Object.entries(t.ref?.credit?.covers ?? {})) out[+i] = cents((out[+i] ?? 0) + a);
  return out;
}

/** Keep a coverage to `amount` (a keyed rain check, say): the lines in order until it runs out. */
export function trimCoverage(c: Coverage, amount: number): Coverage {
  let left = cents(Math.min(amount, c.amount));
  const lines = c.lines.flatMap((l) => {
    const a = cents(Math.min(l.amount, left));
    left = cents(left - a);
    return a > 0 ? [{ ...l, amount: a }] : [];
  });
  return { ...c, lines, amount: cents(lines.reduce((s, l) => s + l.amount, 0)) };
}

/** The `covers` map a payment records, from a coverage. */
export const coversOf = (c: Coverage): Record<number, number> => Object.fromEntries(c.lines.map((l) => [l.index, l.amount]));

/** The books a book id names, for a label. */
export const creditBookById = (id: string): CreditBook | undefined => CREDIT_BOOKS.find((b) => b.id === id);
