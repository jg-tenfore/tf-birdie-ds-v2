import type { Booking, Course } from '../types';
import { createBookings } from './bookings';

/**
 * Venue configurations — the three shapes of club this POS is shown against.
 *
 * A "prototype" is not a fork of the app. The only thing that differs between them is the
 * course layout: the tee sheet renders one column group per visible course, so a club's
 * shape *is* its `courses` array. Everything else — catalog, pricing, dialogs, deep links —
 * is the same code, which is what stops three prototypes becoming three codebases that drift.
 *
 * Each is deployed to its own path (`/prototype/`, `/prototype-18/`, `/prototype-9/`) by
 * building with a different `VITE_VENUE`, and any of them can be rendered in Storybook or
 * addressed with `?venue=` for side-by-side comparison.
 */

export type VenueId = 'three-nines' | 'eighteen' | 'nine';

export interface Venue {
  id: VenueId;
  /** Club name, shown in the register's top bar. */
  name: string;
  /** One line on what makes this configuration different. */
  tagline: string;
  courses: Course[];
  /**
   * How the shared demo bookings are re-homed onto this venue's courses.
   *
   * The booking fixtures are authored against the three-nines club. Rather than maintain a
   * separate set per venue — three fixtures to keep in step, and three chances to diverge —
   * each venue maps the source course ids onto its own. A source course with no entry here
   * has its bookings dropped, which is how a smaller club ends up with a proportionally
   * lighter sheet rather than an impossible one.
   *
   * Mapping is 1:1 per source course, so slot indices stay valid: two source courses never
   * collapse onto one target and collide in the same cell.
   */
  courseMap: Record<string, string>;
}

const base = { slots: 4, visible: true, locked: false, note: '', indScroll: false };

/**
 * Three nines — the original club, and the default.
 *
 * Ponds, Valley and Rolling run as independent nine-hole tracks. Twelve bookable cells per
 * time row, which is the densest of the three and the case the tee sheet was designed around.
 */
const threeNines: Venue = {
  id: 'three-nines',
  name: 'Pro Shop · Register 1',
  tagline: 'Three independent nine-hole tracks',
  courses: [
    { ...base, id: 'ponds', name: 'Ponds (to Woods)', holes: '9 HOLES', holeCount: 9 },
    { ...base, id: 'valley', name: 'Front Valley', holes: '9 HOLES', holeCount: 9 },
    { ...base, id: 'rolling', name: 'Rolling', holes: '9 HOLES', holeCount: 9 },
  ],
  courseMap: { ponds: 'ponds', valley: 'valley', rolling: 'rolling' },
};

/**
 * One 18-hole course, split into its two nines.
 *
 * Front and back are separate column groups because a golfer can be sent off either one —
 * crossovers, shotgun starts, and back-nine twilight all need a place on the sheet to live.
 * A round here is 18 holes regardless of which tee you start on, which is why both groups
 * carry `holeCount: 18`; the nine is where you *begin*, not what you play.
 */
const eighteen: Venue = {
  id: 'eighteen',
  name: 'Championship · Register 1',
  tagline: 'One 18-hole course, front and back nines',
  courses: [
    { ...base, id: 'champ-front', name: 'Championship · Front 9', holes: 'FRONT 9', holeCount: 18 },
    { ...base, id: 'champ-back', name: 'Championship · Back 9', holes: 'BACK 9', holeCount: 18 },
  ],
  // Two source courses onto two nines; Rolling's bookings are dropped.
  courseMap: { ponds: 'champ-front', valley: 'champ-back' },
};

/**
 * A single nine-hole course.
 *
 * The smallest configuration: one column group, four cells a row. Deliberately sparse — that
 * is the honest picture of a nine-hole operation, and it exercises how the sheet reads when
 * there is very little on it.
 */
const nine: Venue = {
  id: 'nine',
  name: 'The Nine · Register 1',
  tagline: 'A single nine-hole course',
  courses: [{ ...base, id: 'the-nine', name: 'The Nine', holes: '9 HOLES', holeCount: 9 }],
  courseMap: { ponds: 'the-nine' },
};

export const VENUES: Record<VenueId, Venue> = {
  'three-nines': threeNines,
  eighteen,
  nine,
};

export const DEFAULT_VENUE: VenueId = 'three-nines';

export const isVenueId = (v: string): v is VenueId => v in VENUES;

/**
 * Which venue this build is for.
 *
 * Set per deployment by `VITE_VENUE`; falls back to the three-nines club so a plain
 * `npm run dev` and any test that doesn't care both get the original.
 */
export function buildVenue(): VenueId {
  const fromEnv = import.meta.env?.VITE_VENUE as string | undefined;
  return fromEnv && isVenueId(fromEnv) ? fromEnv : DEFAULT_VENUE;
}

export const venue = (id: VenueId): Venue => VENUES[id] ?? VENUES[DEFAULT_VENUE];

// ─── Bookings per venue ─────────────────────────────────────────────────────

const cache = new Map<VenueId, Booking[]>();

/**
 * The demo bookings, re-homed onto a venue's courses.
 *
 * Memoized per venue: the underlying generator builds an eleven-day window and there is no
 * reason to redo it for every provider or story.
 */
export function venueBookings(id: VenueId): Booking[] {
  const cached = cache.get(id);
  if (cached) return cached;

  const { courseMap } = venue(id);
  const remapped = createBookings()
    .filter((b) => courseMap[b.course])
    .map((b) => (courseMap[b.course] === b.course ? b : { ...b, course: courseMap[b.course] }));

  cache.set(id, remapped);
  return remapped;
}
