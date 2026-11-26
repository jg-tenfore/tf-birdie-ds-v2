import type { Golfer } from '../types';
import { ALL_GOLFERS } from './golfers';

/**
 * Bookable things that are not tee times — courts and simulator bays (V1 → V2).
 *
 * ## One model for two sheets
 *
 * v1 built these as two different schedulers for the same job. Court Sheet was a stack of
 * discrete 20-minute cards with the time printed inside each and **no duration at all** — a
 * court booking stored only a display name. Bay Sheet was a continuous time axis where a
 * booking's height is its length. Both are the same operation: *a named person, on a named
 * resource, from a time, for a while*.
 *
 * So there is one model here, and the two sheets are two configurations of it. Both get a
 * duration, both get a price, both reach the register through Check in & pay — which is what a
 * tee time already does, so staff learn one booking model rather than three.
 *
 * ## Where the numbers came from
 *
 * The **resources** are v1's (`court-sheet.tsx`, `bay-sheet.tsx`), which were transcribed from
 * the shipping app. Their **names are normalised**: production has "Tennis Court 1" beside
 * "Tennis 2" and "Basketball" beside "Basket Ball 2", and v1 kept that faithfully because it
 * was recording the app. A v2 demo has no reason to.
 *
 * **Bays are TF Buck's** (Nov 26, `tf-buck-ds-v1/.../nov-11-2026/bay-data.ts`): ten bays with a
 * capacity each — five numbered bays, a Lesson Bay, two named bays and two single-seat porch sims —
 * priced by Buck's fees (`BAY_FEES`: an hourly rate by time of day, and a member rate), with Buck's
 * daily limit of two bookings a golfer. v1's six colour-named bays at a flat $45 are gone. **Court
 * pricing is invented**: v1 never charged for a court, and Justin chose paid-like-bays for V1 → V2.
 * The per-type rates below are plausible placeholders and are the first thing to correct against a
 * real club. The 90-minute bay default is still v1's.
 */

export type ResourceKind = 'court' | 'bay';

export interface Resource {
  id: string;
  kind: ResourceKind;
  name: string;
  /** Short label for the column header, where the full name does not fit. */
  short: string;
  /**
   * Dollars per hour. For a bay, the walk-in daytime rate — what the column header shows; the charge
   * itself comes from Buck's fees (`bayFeeFor`), which change with the hour and the golfer.
   */
  hourly: number;
  /** The most people it holds (Buck's bay capacity). Absent: the sheet's own maximum. */
  capacity?: number;
  /** Groups rates and icons: a pool is not priced like a tennis court. */
  type: 'tennis' | 'pickleball' | 'basketball' | 'pool' | 'simulator';
}

export interface ResourceSheetConfig {
  kind: ResourceKind;
  title: string;
  /** Opening and closing, in minutes from midnight. */
  openMin: number;
  closeMin: number;
  /** Bookings start and end on this grid. */
  stepMin: number;
  defaultDurationMin: number;
  minDurationMin: number;
  maxDurationMin: number;
  /** What a booking holds — "players" on a court, "golfers" in a bay. */
  partyNoun: string;
  maxParty: number;
}

export const RESOURCES: Resource[] = [
  { id: 'tennis-1', kind: 'court', name: 'Tennis Court 1', short: 'Tennis 1', hourly: 20, type: 'tennis' },
  { id: 'tennis-2', kind: 'court', name: 'Tennis Court 2', short: 'Tennis 2', hourly: 20, type: 'tennis' },
  { id: 'pickle-1', kind: 'court', name: 'Pickleball Court 1', short: 'Pickleball 1', hourly: 15, type: 'pickleball' },
  { id: 'bball-1', kind: 'court', name: 'Basketball Court 1', short: 'Basketball 1', hourly: 25, type: 'basketball' },
  { id: 'bball-2', kind: 'court', name: 'Basketball Court 2', short: 'Basketball 2', hourly: 25, type: 'basketball' },
  { id: 'pool-1', kind: 'court', name: 'Swimming Pool', short: 'Pool', hourly: 10, type: 'pool' },

  // Buck's ten bays, by Buck's ids, names and capacities.
  { id: 'bay-1', kind: 'bay', name: 'Bay 1', short: 'Bay 1', hourly: 60, capacity: 6, type: 'simulator' },
  { id: 'bay-2', kind: 'bay', name: 'Bay 2', short: 'Bay 2', hourly: 60, capacity: 6, type: 'simulator' },
  { id: 'bay-3', kind: 'bay', name: 'Bay 3', short: 'Bay 3', hourly: 60, capacity: 6, type: 'simulator' },
  { id: 'bay-4', kind: 'bay', name: 'Bay 4', short: 'Bay 4', hourly: 60, capacity: 8, type: 'simulator' },
  { id: 'bay-5', kind: 'bay', name: 'Bay 5', short: 'Bay 5', hourly: 60, capacity: 8, type: 'simulator' },
  { id: 'lesson', kind: 'bay', name: 'Lesson Bay', short: 'Lesson', hourly: 60, capacity: 2, type: 'simulator' },
  { id: 'nicklaus', kind: 'bay', name: 'Nicklaus Bay', short: 'Nicklaus', hourly: 60, capacity: 8, type: 'simulator' },
  { id: 'palmer', kind: 'bay', name: 'Palmer Bay', short: 'Palmer', hourly: 60, capacity: 6, type: 'simulator' },
  { id: 'east-porch', kind: 'bay', name: 'East Porch Sim', short: 'East Porch', hourly: 60, capacity: 1, type: 'simulator' },
  { id: 'west-porch', kind: 'bay', name: 'West Porch Sim', short: 'West Porch', hourly: 60, capacity: 1, type: 'simulator' },
];

export const SHEETS: Record<ResourceKind, ResourceSheetConfig> = {
  court: {
    kind: 'court',
    title: 'Court Sheet',
    openMin: 6 * 60,
    closeMin: 21 * 60,
    // v1 used 20-minute slots. Thirty is the grid both sheets share now, so a booking moved
    // between them never lands between two lines.
    stepMin: 30,
    defaultDurationMin: 60,
    minDurationMin: 30,
    maxDurationMin: 240,
    partyNoun: 'players',
    maxParty: 8,
  },
  bay: {
    kind: 'bay',
    title: 'Bay Sheet',
    openMin: 8 * 60,
    closeMin: 22 * 60,
    stepMin: 30,
    // v1's own default.
    defaultDurationMin: 90,
    minDurationMin: 30,
    maxDurationMin: 240,
    partyNoun: 'golfers',
    // Buck's largest bays hold eight; each bay's own capacity is the real limit.
    maxParty: 8,
  },
};

export const resourcesOf = (kind: ResourceKind): Resource[] => RESOURCES.filter((r) => r.kind === kind);

export const resourceById = (id: string): Resource | undefined => RESOURCES.find((r) => r.id === id);

/** How many a resource holds: its own capacity, else its sheet's maximum. */
export const capacityOf = (r: Pick<Resource, 'kind' | 'capacity'>): number => r.capacity ?? SHEETS[r.kind].maxParty;

// ─── Buck's bay fees and limit ──────────────────────────────────────────────

/**
 * Buck's bay fees (Simulator Bays › Fees): an hourly rate by start time, and a member rate. **The most
 * specific fee wins** — one that names the golfer's membership beats one for everybody — exactly as
 * Buck's `feeFor` picks it, so a booking costs the same at the counter as in the back office.
 *
 * Buck's member fee names its *Club* and *Monthly Range* plans; Birdie's members hold golf plans, so
 * "member" here is a plan Buck gives the *Member Sim Hour* (`memberSimRate` in `memberships.ts`).
 */
export interface BayFee {
  name: string;
  hourly: number;
  /** Start times it covers, minutes from midnight, `[from, to)`. */
  from: number;
  to: number;
  membersOnly: boolean;
}

export const BAY_FEES: BayFee[] = [
  { name: 'Sim Hour Sun–Thu', hourly: 60, from: 8 * 60, to: 16 * 60, membersOnly: false },
  { name: 'Sim Hour Evening', hourly: 75, from: 16 * 60, to: 22 * 60, membersOnly: false },
  { name: 'Member Sim Hour', hourly: 40, from: 8 * 60, to: 22 * 60, membersOnly: true },
];

/** The fee a bay booking pays: the member rate for a member, else the rate for its start time. */
export function bayFeeFor(isMember: boolean, startMin: number, durationMin: number): { name: string; hourly: number; amount: number } {
  const fee =
    BAY_FEES.filter((f) => startMin >= f.from && startMin < f.to)
      .filter((f) => !f.membersOnly || isMember)
      .sort((a, b) => Number(b.membersOnly) - Number(a.membersOnly))[0] ?? BAY_FEES[0];
  return { name: fee.name, hourly: fee.hourly, amount: Math.round(fee.hourly * (durationMin / 60) * 100) / 100 };
}

/**
 * Buck's daily limit: **two bookings per golfer per day**. A no-show would still count and a
 * cancellation would not (Birdie's bookings carry neither yet). Staff can override it. Buck's open
 * question — whether the limit counts bookings or hours — is open here too; this counts bookings.
 */
export const BAY_DAILY_LIMIT = 2;

export interface ResourceBooking {
  id: string;
  kind: ResourceKind;
  resourceId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  startMin: number;
  durationMin: number;
  /** Who it is for. Always a name; a CRM id when the person was found in the roster. */
  name: string;
  crmId?: string;
  phone?: string;
  players: number;
  checkedIn: boolean;
  paid: boolean;
  note?: string;
  /**
   * Just created by tapping the sheet, and not yet confirmed. Closing the panel on a draft
   * removes it, so a stray tap on an empty stretch of the sheet does not leave a booking behind.
   */
  draft?: boolean;
}

// ─── Seeding ────────────────────────────────────────────────────────────────

/** FNV-1a, the same hash every other fixture here uses, so a seeded day is stable forever. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A small deterministic stream of numbers from one seed. */
function stream(seed: string) {
  let h = hash(seed);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
    return ((h ^ (h >>> 15)) >>> 0) / 0xffffffff;
  };
}

/**
 * A believable day on one sheet.
 *
 * Deterministic in the date, so the same day looks the same on every machine and in every
 * screenshot. Busier in the evening than the morning, because that is when people play after
 * work — a flat spread would make the sheet look like a test pattern. Nothing overlaps: each
 * resource is filled left to right through the day with gaps between.
 *
 * `today` marks what has already happened: bookings that started before the demo's "now" are
 * checked in, and most of those are paid.
 */
export function seedResourceDay(
  kind: ResourceKind,
  date: string,
  nowMin: number | null,
  roster: Golfer[] = ALL_GOLFERS,
): ResourceBooking[] {
  const cfg = SHEETS[kind];
  const out: ResourceBooking[] = [];
  // Nobody is in two places at once, and on the bay sheet nobody books more than Buck's daily
  // limit — so the seeded day never shows a booking the sheet itself would refuse.
  const limit = kind === 'bay' ? BAY_DAILY_LIMIT : Infinity;
  const free = (g: Golfer, start: number, duration: number) => {
    const theirs = out.filter((x) => x.crmId === g.id);
    return theirs.length < limit && !theirs.some((x) => start < x.startMin + x.durationMin && x.startMin < start + duration);
  };

  for (const r of resourcesOf(kind)) {
    const rand = stream(`${kind}|${date}|${r.id}`);
    let t = cfg.openMin + Math.floor(rand() * 4) * cfg.stepMin;

    while (t < cfg.closeMin - cfg.minDurationMin) {
      // Evenings fill up: the later it is, the less likely a gap.
      const evening = t >= 16 * 60;
      if (rand() < (evening ? 0.2 : 0.5)) {
        t += cfg.stepMin * (1 + Math.floor(rand() * 3));
        continue;
      }
      const steps = Math.max(
        cfg.minDurationMin / cfg.stepMin,
        Math.round((cfg.defaultDurationMin / cfg.stepMin) * (0.5 + rand())),
      );
      const duration = Math.min(steps * cfg.stepMin, cfg.closeMin - t);
      let who = roster[Math.floor(rand() * roster.length)];
      for (let tries = 0; tries < 8 && !free(who, t, duration); tries++) who = roster[Math.floor(rand() * roster.length)];
      if (!free(who, t, duration)) {
        t += duration;
        continue;
      }
      const started = nowMin != null && t <= nowMin;
      out.push({
        id: `${kind}-${date}-${r.id}-${t}`,
        kind,
        resourceId: r.id,
        date,
        startMin: t,
        durationMin: duration,
        name: who.name,
        crmId: who.id,
        phone: who.phone,
        players: 1 + Math.floor(rand() * Math.min(4, capacityOf(r))),
        checkedIn: started,
        paid: started && rand() < 0.8,
      });
      t += duration + cfg.stepMin * Math.floor(rand() * 2);
    }
  }
  return out;
}
