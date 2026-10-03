import { formatTimeLabel } from '../../../../pos/data/courses';
import { TRANSPORT_RATES } from '../../../../pos/data/rate-catalog';
import { memberGuest } from '../../100126/scenarios';

/**
 * The 100226 League view's data — invented, deterministic, Storybook only.
 *
 * Three leagues on Saturday, May 30 (the day the seed puts the Member-Guest on). The tee-timed
 * league borrows the Member-Guest's first five tee times on Championship Front — 7:04 to 7:36, so
 * *"Justin, you're the 7:20"* is a real slot on the sheet.
 */

export type Format = 'shotgun' | 'tee-times';

export interface Golfer {
  id: string;
  name: string;
  ride: boolean;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
}

export interface Arrival {
  in?: boolean;
  /** Settled for everything on the bill so far. */
  paid?: boolean;
  /** What has been paid already — set when an extra reopens a paid bill. */
  settled?: number;
  extras?: Extra[];
}

export interface League {
  id: string;
  name: string;
  format: Format;
  startMin: number;
  roster: Golfer[];
  /** Golfer id → group (tee time or shotgun team), or null when not placed yet. */
  groups: Record<string, number | null>;
  arrivals: Record<string, Arrival>;
  groupCount: number;
}

export const DAY_LABEL = 'Sat, May 30';
export const SEATS = 4;

/** The pool every roster is cut from: 32 names, last name first as the tee sheet writes them. */
const POOL = [
  'Girard, Justin', 'Farnsworth, Weston', 'Alvarez, Johnny', 'Brennan, Kevin', 'Okafor, Daniel', 'Lindqvist, Erik',
  'Patel, Raj', 'Moreau, Luc', 'Sullivan, Pat', 'Nakamura, Ken', 'Hughes, Tom', 'Rossi, Marco', "O'Neill, Sean",
  'Silva, Rafael', 'Chen, Wei', 'Dubois, Henri', 'Kowalski, Piotr', 'Murphy, Liam', 'Becker, Hans', 'Thompson, Grant',
  'Abernathy, Carl', 'Bishop, Dale', 'Castellano, Ray', 'Dempsey, Mark', 'Ellison, Bruce', 'Fitzgerald, Owen',
  'Grant, Hollis', 'Halvorsen, Nils', 'Ibarra, Luis', 'Jensen, Sven', 'Kearney, Frank', 'Lowe, Arthur',
];

const golfer = (i: number): Golfer => ({ id: `g${i}`, name: POOL[i], ride: i % 5 !== 3 });

/** Round-robin the placed golfers over `count` groups; `open` stay unplaced. */
function spread(roster: Golfer[], count: number, open: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  let k = 0;
  for (const g of roster) out[g.id] = open.includes(g.id) ? null : k++ % count;
  return out;
}

/** The catalog's League Rate, 18 holes, and its transport rows — what each golfer pays. */
export const LEAGUE_FEE = 36;
const RIDE = TRANSPORT_RATES.find((t) => t.id === 'tr-riding-cart')!;
const WALK = TRANSPORT_RATES.find((t) => t.id === 'tr-walking')!;
export const transportOf = (g: Golfer) => (g.ride ? RIDE : WALK);
export const owes = (g: Golfer, a: Arrival = {}) =>
  +(LEAGUE_FEE + transportOf(g).price + (a.extras ?? []).reduce((s, e) => s + e.price, 0)).toFixed(2);

/** What the Pay button takes now: the bill, less anything settled before an extra reopened it. */
export const dueOf = (g: Golfer, a: Arrival = {}) => (a.paid ? 0 : +(owes(g, a) - (a.settled ?? 0)).toFixed(2));

const SENIOR_TIMES = memberGuest()
  .slice(0, 5)
  .map((b) => b.timeMin);

function senior(): League {
  const roster = Array.from({ length: 20 }, (_, i) => golfer(i));
  // Prep work done: sixteen placed, four still to place — Justin among them.
  const groups: Record<string, number | null> = {
    g1: 0, g3: 0, g4: 0, g5: 0,
    g6: 1, g8: 1, g9: 1,
    g2: 2, g10: 2, g11: 2,
    g12: 3, g14: 3, g15: 3,
    g16: 4, g17: 4, g18: 4,
    g0: null, g7: null, g13: null, g19: null,
  };
  // The 7:04 has teed off, paid; one of the 7:12 is in.
  const arrivals: Record<string, Arrival> = { g1: { in: true, paid: true }, g3: { in: true, paid: true }, g4: { in: true, paid: true }, g5: { in: true, paid: true }, g6: { in: true } };
  return { id: 'senior', name: 'Senior League', format: 'tee-times', startMin: SENIOR_TIMES[0], roster, groups, arrivals, groupCount: 5 };
}

function skins(): League {
  const roster = Array.from({ length: 12 }, (_, i) => golfer(20 + i));
  return { id: 'skins', name: 'Skins League', format: 'tee-times', startMin: 13 * 60, roster, groups: spread(roster, 3, ['g31']), arrivals: {}, groupCount: 3 };
}

function mens(): League {
  const ids = [0, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const roster = ids.map(golfer);
  return { id: 'mens', name: "Men's League", format: 'shotgun', startMin: 15 * 60, roster, groups: spread(roster, 5, ['g21', 'g23']), arrivals: {}, groupCount: 5 };
}

/** Today's leagues, in the order they go out. */
export const leagues = (): League[] => [senior(), skins(), mens()];

/** Tee time `k` of a league played as tee times: the seed's times, or 8 minutes apart from the start. */
export function teeTimeOf(l: League, k: number): number {
  if (l.id === 'senior') return SENIOR_TIMES[k];
  return l.startMin + k * 8;
}

/** `7:20 AM`, or `Team 3 · Hole 3` — the group's name in the league's format today. */
export const groupLabel = (l: League, format: Format, k: number) => (format === 'shotgun' ? `Team ${k + 1} · Hole ${k + 1}` : formatTimeLabel(teeTimeOf(l, k)));

export const startLabel = (l: League) => formatTimeLabel(l.startMin);
export const formatLabel = (f: Format) => (f === 'shotgun' ? 'Shotgun' : 'Tee times');

/** The register's quick keys for an extra. */
export const EXTRAS: Array<Extra & { icon: string }> = [
  { id: 'x-large-bucket', name: 'Large bucket', price: 12, icon: 'sports_golf' },
  { id: 'x-medium-bucket', name: 'Medium bucket', price: 9, icon: 'sports_golf' },
  { id: 'x-small-bucket', name: 'Small bucket', price: 6, icon: 'sports_golf' },
  { id: 'x-sleeve', name: 'Sleeve of balls', price: 14.99, icon: 'storefront' },
  { id: 'x-glove', name: 'Golf glove', price: 19.99, icon: 'storefront' },
  { id: 'x-water', name: 'Water', price: 2.5, icon: 'local_cafe' },
];

/** "Girard, Justin" → "Justin". */
export const firstName = (name: string) => name.split(',')[1]?.trim() || name;

/** Does `q` find this golfer — by either name order, or by the group they are in? */
export function matches(g: Golfer, group: string | null, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const [last, first = ''] = g.name.toLowerCase().split(',').map((x) => x.trim());
  return [g.name.toLowerCase(), `${first} ${last}`, group?.toLowerCase() ?? ''].some((x) => x.includes(s));
}
