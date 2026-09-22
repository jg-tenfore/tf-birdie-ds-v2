import { bookingName, type Customer } from './customers';
import { roster } from './roster';
import { DEMO_TODAY } from './bookings';

/**
 * Rain checks — credit cut from a round the weather ended early, spent later at the register.
 *
 * Modelled as one record with a balance rather than a flag on the round plus a discount at
 * checkout, because the question the counter actually has to answer is "do I still have that
 * credit, and where did the rest of it go". A flag cannot answer either half.
 *
 * The credit is proportional: an 18-hole round abandoned after 5 holes is worth 13/18 of what
 * was paid. Note the edges — 0 holes played returns the whole round, 17 played still returns
 * 1/18, and a completed round has nothing to give back.
 *
 * Deterministic from the customer list and a fixed seed, so a screenshot taken today and one
 * taken next week show the same ledger. Sparse on purpose: most golfers have never had one, and
 * a database where everyone carries a credit makes the lookup look far easier than it is.
 */

export interface Redemption {
  /** `M/D/YYYY`. */
  at: string;
  amount: number;
  order: string;
  what: string;
  course?: string;
}

export interface RainCheck {
  id: string;
  customerId: string;
  /** Denormalised so a list can render without joining back to the roster. */
  customerName: string;
  /** The reservation it was cut from — the only link back to the round. */
  reservation: string;
  /**
   * The round itself, as `5/12/2026 7:10 AM`.
   *
   * Carried on the credit rather than looked up, because the sheet for that day will not be
   * loaded when someone goes looking. "Raincheck 51381, $72.22" settles nothing with a
   * customer; "the 7:10 on May 12th" settles it.
   */
  teeTime: string;
  issued: string;
  expires: string;
  /** The course that cut it — a credit issued at one can be spent at another. */
  course: string;
  roundPrice: number;
  totalHoles: 9 | 18;
  holesPlayed: number;
  /** Face value at issue. */
  awarded: number;
  spent: number;
  balance: number;
  /**
   * Where the money went.
   *
   * A raincheck is not spent once — $103.90 can pay for a round in June and a sleeve of balls
   * in August. Without this the record can say a credit is empty but not what emptied it,
   * which is the argument a counter has to settle.
   */
  redemptions?: Redemption[];
}

/** Courses a credit can have been cut at or spent at. */
export const RAINCHECK_COURSES = [
  'Championship',
  'Falls Road',
  'Northwest Park',
  'Poolesville',
] as const;

/** What fraction of the round is owed back after `holesPlayed` of `totalHoles`. */
export const raincheckFraction = (totalHoles: number, holesPlayed: number): number =>
  Math.max(0, Math.min(1, (totalHoles - holesPlayed) / totalHoles));

/** The credit due on a round cut short, rounded to the cent. */
export const raincheckValue = (roundPrice: number, totalHoles: number, holesPlayed: number): number =>
  +(roundPrice * raincheckFraction(totalHoles, holesPlayed)).toFixed(2);

/** `72%`, as the credit prints it beside the amount. */
export const raincheckPercentLabel = (totalHoles: number, holesPlayed: number): string =>
  `${Math.round(raincheckFraction(totalHoles, holesPlayed) * 100)}%`;

export const isSpentOut = (r: RainCheck): boolean => r.balance <= 0.001;

/** Expired against the demo clock, so a story never drifts into or out of expiry. */
export function isExpired(r: RainCheck, today: Date = DEMO_TODAY()): boolean {
  const [m, d, y] = r.expires.split('/').map(Number);
  return new Date(y, m - 1, d) < today;
}

export const isRedeemable = (r: RainCheck, today: Date = DEMO_TODAY()): boolean =>
  !isSpentOut(r) && !isExpired(r, today);

/** Mulberry32 — a small deterministic generator, so the ledger never moves. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

function dateString(rand: () => number, year: number): string {
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  return `${pad(month)}/${pad(day)}/${year}`;
}

function teeTimeString(rand: () => number): string {
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const hour = 6 + Math.floor(rand() * 12);
  const minute = [0, 8, 16, 24, 32, 40, 48, 56][Math.floor(rand() * 8)];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour > 12 ? hour - 12 : hour;
  return `${month}/${day}/2026 ${h12}:${pad(minute)} ${ampm}`;
}

const RETAIL = [
  'Glove, 2 sleeves Pro V1',
  'Twilight green fee',
  'Cart fee + range balls',
  'Hot dog and a beer',
  'Sleeve of Pro V1',
  'Green fee, 9 holes',
];

/**
 * Builds the ledger.
 *
 * One customer is given two credits so that the picker has to exist at all, and roughly one in
 * seven of the rest carries one. A third of those have been partly spent, because a lookup that
 * only ever shows full balances hides the case people argue about.
 */
export function buildRainChecks(list: Customer[] = roster, seed = 41): RainCheck[] {
  const rand = rng(seed);
  let nextId = 51400;

  const build = (c: Customer, forceSpent = false): RainCheck => {
    const roundPrice = +(28 + rand() * 90).toFixed(2);
    const totalHoles: 9 | 18 = rand() > 0.8 ? 9 : 18;
    const holesPlayed = Math.floor(rand() * totalHoles);
    const awarded = raincheckValue(roundPrice, totalHoles, holesPlayed);
    const spent = forceSpent || rand() > 0.66 ? +(awarded * (0.2 + rand() * 0.6)).toFixed(2) : 0;
    const balance = +(awarded - spent).toFixed(2);
    return {
      id: String(nextId++),
      customerId: c.id,
      customerName: bookingName(c),
      reservation: String(10290000 + Math.floor(rand() * 40000)),
      teeTime: teeTimeString(rand),
      issued: dateString(rand, 2026),
      expires: dateString(rand, 2027),
      course: RAINCHECK_COURSES[Math.floor(rand() * RAINCHECK_COURSES.length)],
      roundPrice,
      totalHoles,
      holesPlayed,
      awarded,
      spent,
      balance,
      redemptions:
        spent > 0
          ? [
              {
                at: dateString(rand, 2026).replace(/^0/, ''),
                amount: spent,
                order: String(5690000 + Math.floor(rand() * 20000)),
                what: RETAIL[Math.floor(rand() * RETAIL.length)],
                course: RAINCHECK_COURSES[Math.floor(rand() * RAINCHECK_COURSES.length)],
              },
            ]
          : undefined,
    };
  };

  // The pinned holder: two credits, one of them partly spent, so the customer modal has a case
  // where a person carries more than one and the amounts have to be told apart. Pinned to
  // someone who appears on a tee sheet, so that case is reachable by clicking rather than only
  // by searching.
  const owner = list.find((c) => c.sheetName && c.punchCards.length > 0 && c.memberships.length > 0) ?? list[0];
  const pinned = [build(owner, true), build(owner)];

  const generated = list.flatMap((c) => (c.id === owner.id || rand() > 0.14 ? [] : [build(c)]));

  return [...pinned, ...generated];
}

export const rainChecks = buildRainChecks();

/** Every credit this customer holds, newest first. */
export const rainChecksFor = (customerId: string, list: RainCheck[] = rainChecks): RainCheck[] =>
  list.filter((r) => r.customerId === customerId);

/** What the course still owes this customer across every live credit. */
export const rainCheckBalance = (customerId: string, list: RainCheck[] = rainChecks): number =>
  +rainChecksFor(customerId, list)
    .filter((r) => isRedeemable(r))
    .reduce((sum, r) => sum + r.balance, 0)
    .toFixed(2);
