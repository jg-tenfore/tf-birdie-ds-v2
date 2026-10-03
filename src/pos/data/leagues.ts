import type { Booking, BookingGuest, GroupMeta, PlayerState } from '../types';
import { DEMO_TODAY } from './bookings';
import { formatTimeLabel, toDateStr } from './courses';
import { ROUND_STEP } from './config';
import { LEAGUE_RATE, TRANSPORT_RATES } from './rate-catalog';
import type { VenueId } from './venues';

/**
 * Leagues (V1 → V2, 100226 · League view) — the roster, the tee times, and how it goes out.
 *
 * ## What a league is here
 *
 * A league is a tee-sheet **group**: real bookings sharing a `groupId` and `groupMeta`, the same
 * shape the League dialog (`modals/TimeRow.tsx`) and the seeded outings (`data/events.ts`) make.
 * What a league adds is a **roster** — the golfers who play in it, placed on a tee time or not yet —
 * and a **format**: a shotgun, or tee times. Both live here, keyed by the group's id.
 *
 * Each of the league's tee times is one booking whose seats are its golfers. Placing a golfer fills
 * a real seat (`guests[i].leagueGolferId`, priced on the League Rate and the golfer's ride or walk);
 * taking them off frees it. Checking in writes the seat's round step, and paying goes through the
 * register like any other seat — so the tee sheet and the League view can never disagree, because
 * there is only one copy of the truth.
 *
 * The format is a League view label only (Justin): a shotgun shows its groups as *Team k · Hole k*,
 * the tee sheet keeps the tee times, and no booking moves.
 *
 * ## Where they are
 *
 * Saturday, May 30 at the 18-hole club — the Member-Guest's day. The Member-Guest holds the front
 * nine from 7:04 to 9:20, so the **Senior League** goes off the **back nine** at the same five times
 * the 100226 mock borrowed (7:04–7:36), and the afternoon leagues take the front once the outing is
 * through. The sheet's rows are every 8 minutes from 6:00, so "1:00" and "3:00" are the first rows
 * after them — **1:04 PM** and **3:04 PM**.
 *
 * Deterministic, like every seed: fixed names, fixed placement, no clock.
 */

export type LeagueFormat = 'shotgun' | 'tee-times';

export interface LeagueGolfer {
  /** Unique within the league; a seat carries it as `guests[i].leagueGolferId`. */
  id: string;
  /** "Last, First", as the tee sheet writes names. */
  name: string;
  /** Rides a cart (Riding Cart), or walks (Walking). */
  ride: boolean;
}

export interface LeagueTeeTime {
  course: string;
  timeMin: number;
}

export interface League {
  /** The tee-sheet group's id — what every one of its bookings carries. */
  groupId: string;
  name: string;
  venueId: VenueId;
  date: string;
  /** How it goes out unless the League view's switch changed it (`leagueFormats`). */
  format: LeagueFormat;
  /** Group `k` of the league tees off at `teeTimes[k]` — or, as a shotgun, is Team k+1 on hole k+1. */
  teeTimes: LeagueTeeTime[];
  roster: LeagueGolfer[];
}

/** Players per tee time — the course's slots. */
export const LEAGUE_SEATS = 4;

const RIDE = TRANSPORT_RATES.find((t) => t.id === 'tr-riding-cart')!;
const WALK = TRANSPORT_RATES.find((t) => t.id === 'tr-walking')!;
const PUSH = TRANSPORT_RATES.find((t) => t.id === 'tr-push-cart')!;

/** Saturday, May 30 — nine days after the demo's today, as the events seed counts it. */
const LEAGUE_DAY = (() => {
  const d = DEMO_TODAY();
  d.setDate(d.getDate() + 9);
  return toDateStr(d);
})();

/** The pool every roster is cut from: 32 names, last name first as the tee sheet writes them. */
const POOL = [
  'Girard, Justin', 'Farnsworth, Weston', 'Alvarez, Johnny', 'Brennan, Kevin', 'Okafor, Daniel', 'Lindqvist, Erik',
  'Patel, Raj', 'Moreau, Luc', 'Sullivan, Pat', 'Nakamura, Ken', 'Hughes, Tom', 'Rossi, Marco', "O'Neill, Sean",
  'Silva, Rafael', 'Chen, Wei', 'Dubois, Henri', 'Kowalski, Piotr', 'Murphy, Liam', 'Becker, Hans', 'Thompson, Grant',
  'Abernathy, Carl', 'Bishop, Dale', 'Castellano, Ray', 'Dempsey, Mark', 'Ellison, Bruce', 'Fitzgerald, Owen',
  'Grant, Hollis', 'Halvorsen, Nils', 'Ibarra, Luis', 'Jensen, Sven', 'Kearney, Frank', 'Lowe, Arthur',
];

/** One in five walks. */
const golfer = (i: number): LeagueGolfer => ({ id: `g${i}`, name: POOL[i], ride: i % 5 !== 3 });

const every8 = (course: string, start: number, n: number): LeagueTeeTime[] =>
  Array.from({ length: n }, (_, k) => ({ course, timeMin: start + k * 8 }));

export const LEAGUES: League[] = [
  {
    groupId: 'grp-senior-league',
    name: 'Senior League',
    venueId: 'eighteen',
    date: LEAGUE_DAY,
    format: 'tee-times',
    teeTimes: every8('champ-back', 7 * 60 + 4, 5),
    roster: Array.from({ length: 20 }, (_, i) => golfer(i)),
  },
  {
    groupId: 'grp-skins-league',
    name: 'Skins League',
    venueId: 'eighteen',
    date: LEAGUE_DAY,
    format: 'tee-times',
    teeTimes: every8('champ-front', 13 * 60 + 4, 3),
    roster: Array.from({ length: 12 }, (_, i) => golfer(20 + i)),
  },
  {
    groupId: 'grp-mens-league',
    name: "Men's League",
    venueId: 'eighteen',
    date: LEAGUE_DAY,
    format: 'shotgun',
    teeTimes: every8('champ-front', 15 * 60 + 4, 5),
    roster: [0, 2, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(golfer),
  },
];

export const leagueById = (groupId: string | null | undefined): League | undefined =>
  groupId ? LEAGUES.find((l) => l.groupId === groupId) : undefined;

/** A day's leagues at a club, in the order they go out. */
export const leaguesOn = (date: string, venueId: VenueId): League[] =>
  LEAGUES.filter((l) => l.date === date && l.venueId === venueId).sort((a, b) => a.teeTimes[0].timeMin - b.teeTimes[0].timeMin);

/** The booking id of a league's group `k` — fixed, so a link, a seed and a placement agree. */
export const leagueBookingId = (l: League, k: number): string => `league-${l.groupId}-${k}`;

/** `7:20 AM`, or `Team 3 · Hole 3` — what group `k` is called in a format. */
export function groupLabel(l: League, format: LeagueFormat, k: number, timeMin = l.teeTimes[k]?.timeMin ?? 0): string {
  return format === 'shotgun' ? `Team ${k + 1} · Hole ${k + 1}` : formatTimeLabel(timeMin);
}

export const formatLabel = (f: LeagueFormat): string => (f === 'shotgun' ? 'Shotgun' : 'Tee times');

/** "Girard, Justin" → "Justin". */
export const firstName = (name: string): string => name.split(',')[1]?.trim() || name;

// ─── Seats ──────────────────────────────────────────────────────────────────

/**
 * A golfer's seat when they are placed: the League Rate, their Riding Cart or Walking, not yet
 * arrived. `patch` sets how far they have got (the seed's arrivals).
 */
export function leagueSeat(g: LeagueGolfer, patch: Partial<PlayerState> = {}): { state: PlayerState; guest: BookingGuest } {
  return {
    state: {
      paid: false,
      step: ROUND_STEP.notArrived,
      noShow: false,
      rateId: LEAGUE_RATE.id,
      transportRateId: g.ride ? RIDE.id : WALK.id,
      ...(!g.ride && { transport: 'walking' as const }),
      ...patch,
    },
    guest: { name: g.name, leagueGolferId: g.id },
  };
}

/** What every one of a league's bookings carries as its group. */
export function leagueMeta(l: League): GroupMeta {
  const first = l.teeTimes[0];
  const last = l.teeTimes[l.teeTimes.length - 1];
  return {
    groupId: l.groupId,
    name: l.name,
    holes: 18,
    want: l.roster.length,
    greenFee: LEAGUE_RATE.p18,
    transportPrices: { cart: RIDE.price, push: PUSH.price, walking: WALK.price },
    startMin: first.timeMin,
    dateStr: l.date,
    rangeEndMin: last.timeMin,
    duration: 135,
    course9: null,
    frontCourse: first.course,
    backCourse: first.course === 'champ-front' ? 'champ-back' : 'champ-front',
  };
}

/**
 * Group `k`'s booking with exactly these seats. The booker — seat 0, whose name the chip shows — is
 * the first golfer on it; the group reads paid once everyone on it has.
 */
export function leagueBooking(l: League, k: number, seats: Array<{ state: PlayerState; guest: BookingGuest }>, from?: Booking): Booking {
  const playerStates = seats.map((s) => s.state);
  const guests = seats.map((s) => s.guest);
  const settled = playerStates.length > 0 && playerStates.every((p) => p.paid || p.noShow);
  const t = l.teeTimes[k];
  return {
    ...(from ?? {
      id: leagueBookingId(l, k),
      date: l.date,
      course: t.course,
      slot: 0,
      timeMin: t.timeMin,
      cart: 'cart',
      status: 'group',
      phone: '',
      conf: `LG-${l.groupId.replace(/^grp-|-league$/g, '').slice(0, 3).toUpperCase()}${k + 1}`,
      price: LEAGUE_RATE.p18,
      holes: '18H',
      groupId: l.groupId,
      groupMeta: leagueMeta(l),
    }),
    name: guests[0]?.name ?? l.name,
    players: seats.length,
    playerStates,
    guests,
    pay: settled ? 'paid' : from && from.pay !== 'paid' ? from.pay : 'open',
  };
}

// ─── The seed ───────────────────────────────────────────────────────────────

/** Round-robin the placed golfers over the groups; `open` stay unplaced. */
function spread(l: League, open: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  let k = 0;
  for (const g of l.roster) out[g.id] = open.includes(g.id) ? null : k++ % l.teeTimes.length;
  return out;
}

/**
 * Where the seed puts everyone, and who is in already. The Senior League's prep is done — sixteen
 * placed, four still to place, Justin among them; its 7:04 has teed off and paid, and one of the
 * 7:12 is in. The afternoon leagues have nobody in yet.
 */
const SEED: Record<string, { groups: Record<string, number | null>; arrived?: Record<string, Partial<PlayerState>> }> = {
  'grp-senior-league': {
    groups: {
      g1: 0, g3: 0, g4: 0, g5: 0,
      g6: 1, g8: 1, g9: 1,
      g2: 2, g10: 2, g11: 2,
      g12: 3, g14: 3, g15: 3,
      g16: 4, g17: 4, g18: 4,
      g0: null, g7: null, g13: null, g19: null,
    },
    arrived: {
      g1: { step: ROUND_STEP.teedOff, paid: true },
      g3: { step: ROUND_STEP.teedOff, paid: true },
      g4: { step: ROUND_STEP.teedOff, paid: true },
      g5: { step: ROUND_STEP.teedOff, paid: true },
      g6: { step: ROUND_STEP.checkedIn },
    },
  },
  'grp-skins-league': { groups: spread(LEAGUES[1], ['g31']) },
  'grp-mens-league': { groups: spread(LEAGUES[2], ['g21', 'g23']) },
};

/** The leagues' tee times as real bookings — added to the sheet in V1 → V2, at the 18-hole club. */
export function seedLeagueBookings(): Booking[] {
  return LEAGUES.flatMap((l) => {
    const seed = SEED[l.groupId];
    return l.teeTimes.flatMap((_, k) => {
      const seats = l.roster
        .filter((g) => seed.groups[g.id] === k)
        .map((g) => leagueSeat(g, seed.arrived?.[g.id]));
      return seats.length ? [leagueBooking(l, k, seats)] : [];
    });
  });
}
