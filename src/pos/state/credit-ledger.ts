import { demoNow } from '../data/bookings';
import { LESSON_INSTRUCTORS, LESSON_LINE_MINUTES, type LessonInstructor } from '../data/credits';
import { orderCustomerId } from '../logic/customer-search';
import { toDateStr } from '../data/courses';
import { liveCustomer } from '../data/roster';
import { rainChecks as SEED_RAIN_CHECKS, type RainCheck } from '../data/rain-checks';
import { creditOptions, type CreditKind, type CreditOption, type CreditRef } from '../logic/credit-tenders';
import type { PosState } from './pos-store';

/**
 * The credits ledger (Nov 26, "checkout that's right") — what this session has spent of, given back
 * to, and issued on the credits Buck configures: rain checks, punch cards, credit books, lesson credits.
 *
 * An overlay over the fixed demo data, like `customerEdits` is over the roster, so every demo starts
 * from the same balances. A legacy round card (on the customer record itself) moves through
 * `customerEdits`, as the record is where it lives; everything else moves here.
 */
export interface CreditLedgerState {
  /** Spent this session, by ledger key (`creditKey`): money for rain checks and books, units for punches and lesson credits. */
  creditSpend: Record<string, number>;
  /** Rain checks issued at this register — Buck's Credits rain checks, from the day they are cut. */
  issuedRainChecks: RainCheck[];
  /** Every movement, newest last — what each credit's history shows. */
  creditHistory: CreditMovement[];
  creditSeq: number;
}

export interface CreditMovement {
  key: string;
  kind: CreditKind;
  date: string;
  time: string;
  /** Spent (paid an order), refunded back onto it, or issued. */
  direction: 'spend' | 'refund' | 'issue';
  amount: number;
  units?: number;
  orderNumber?: string;
  staffId: string;
}

export const creditLedgerDefaults = (): CreditLedgerState => ({
  creditSpend: {},
  issuedRainChecks: [],
  creditHistory: [],
  creditSeq: 0,
});

const cents = (n: number) => Math.round(n * 100) / 100;
const clock = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * Every rain check as it stands now: the seeded ledger and the ones issued here, each with what this
 * session spent on it taken off its balance and added to its redemptions.
 */
export function liveRainChecks(s: Pick<PosState, 'creditSpend' | 'issuedRainChecks' | 'creditHistory'>): RainCheck[] {
  return [...SEED_RAIN_CHECKS, ...s.issuedRainChecks].map((r) => {
    const key = `raincheck:${r.id}`;
    const spent = s.creditSpend[key] ?? 0;
    if (!spent) return r;
    const moves = s.creditHistory.filter((m) => m.key === key && m.direction !== 'issue');
    return {
      ...r,
      spent: cents(r.spent + spent),
      balance: cents(r.balance - spent),
      redemptions: [
        ...(r.redemptions ?? []),
        ...moves.map((m) => ({
          at: m.date,
          amount: m.direction === 'spend' ? m.amount : -m.amount,
          order: m.orderNumber ?? '',
          what: m.direction === 'spend' ? 'Spent at the register' : 'Refunded onto the rain check',
        })),
      ],
    };
  });
}

/** One customer's rain checks, as they stand now. */
export const liveRainChecksFor = (s: Pick<PosState, 'creditSpend' | 'issuedRainChecks' | 'creditHistory'>, customerId: string): RainCheck[] =>
  liveRainChecks(s).filter((r) => r.customerId === customerId);

/** What the course owes a customer across their live rain checks. */
export const liveRainCheckBalance = (s: Pick<PosState, 'creditSpend' | 'issuedRainChecks' | 'creditHistory'>, customerId: string): number =>
  cents(liveRainChecksFor(s, customerId).filter((r) => r.balance > 0.004).reduce((sum, r) => sum + r.balance, 0));

/** The credits of `kind` a customer holds, as checkout offers them. */
export function creditOptionsFor(s: PosState, kind: CreditKind, customerId: string | null | undefined): CreditOption[] {
  const customer = customerId ? liveCustomer(customerId, s.customerEdits) : null;
  if (!customer) return [];
  return creditOptions(kind, customer, { spend: s.creditSpend, rainChecks: liveRainChecks(s) });
}

/**
 * Who a lesson can be rung up with (Nov 26 decision), and how many of the order customer's credits of
 * its length each instructor's packs hold — so the picker can say "Jordan Pike · 3 credits" before the
 * golfer pays, and staff pick the instructor the credit will actually pay for.
 */
export function lessonChoices(s: PosState, lessonName: string): { instructor: LessonInstructor; credits: number }[] {
  const minutes = LESSON_LINE_MINUTES[lessonName];
  const packs =
    minutes == null ? [] : creditOptionsFor(s, 'lessoncredit', orderCustomerId(s)).filter((o) => o.usable && o.rule.kind === 'lesson' && o.rule.minutes === minutes);
  return LESSON_INSTRUCTORS.map((instructor) => ({
    instructor,
    credits: packs.reduce((n, o) => (o.rule.kind === 'lesson' && (o.rule.instructorId === null || o.rule.instructorId === instructor.id) ? n + o.balance : n), 0),
  }));
}

/**
 * A credit tender applied to the ledger: `sign` 1 spends it (a sale), -1 gives it back (a refund, or a
 * split tender unwound). `amount` is the money moving; for a punch card or a lesson credit the units
 * that go with it are the ones the sale took, or — on a part refund — that share of them.
 */
export function applyCredit(state: PosState, ref: CreditRef, sign: 1 | -1, amount: number, orderNumber: string): PosState {
  const now = demoNow();
  const units =
    ref.unit === 'money'
      ? 0
      : sign === 1
        ? (ref.units ?? 0)
        : Math.max(1, Math.round(((ref.units ?? 0) * amount) / Math.max(ref.value, 0.01)));
  const move: CreditMovement = {
    key: ref.key,
    kind: ref.kind,
    date: toDateStr(now),
    time: clock(now),
    direction: sign === 1 ? 'spend' : 'refund',
    amount: cents(amount),
    ...(units ? { units } : {}),
    orderNumber,
    staffId: state.operatorId,
  };
  const history = [...state.creditHistory, move];

  // A round card lives on the customer record: its remaining count moves there.
  const legacy = /^punch-legacy:(.+):(\d+)$/.exec(ref.key);
  if (legacy) {
    const [, customerId, i] = legacy;
    const c = liveCustomer(customerId, state.customerEdits);
    if (!c) return state;
    const punchCards = c.punchCards.map((p, pi) => (pi === +i ? { ...p, remaining: Math.max(0, Math.min(p.total, p.remaining - sign * units)) } : p));
    return { ...state, customerEdits: { ...state.customerEdits, [customerId]: { ...state.customerEdits[customerId], punchCards } }, creditHistory: history };
  }
  const delta = ref.unit === 'money' ? sign * cents(amount) : sign * units;
  return {
    ...state,
    creditSpend: { ...state.creditSpend, [ref.key]: cents((state.creditSpend[ref.key] ?? 0) + delta) },
    creditHistory: history,
  };
}
