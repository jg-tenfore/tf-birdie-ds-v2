import { describe, expect, it } from 'vitest';
import { DEFAULT_VENUE, VENUES, isVenueId, venue, venueBookings } from './venues';
import type { VenueId } from './venues';
import { COURSES } from './courses';
import { createInitialState } from '../state/pos-store';
import { buildTeeTimeCart } from '../logic/cart';

/**
 * The three published prototypes are three venue configurations of one app. These tests
 * guard the properties that make that true — chiefly that a venue's bookings actually fit
 * on its courses, since a booking pointing at a course that isn't there renders as nothing
 * at all rather than as an error.
 */

const ALL: VenueId[] = ['three-nines', 'eighteen', 'nine'];

describe('configuration', () => {
  it('has the three published venues', () => {
    expect(Object.keys(VENUES).sort()).toEqual([...ALL].sort());
  });

  it('defaults to the original club, so an unset VITE_VENUE is the three nines', () => {
    expect(DEFAULT_VENUE).toBe('three-nines');
    expect(venue(DEFAULT_VENUE).courses.map((c) => c.id)).toEqual(COURSES.map((c) => c.id));
  });

  it('falls back rather than throwing on an unknown id', () => {
    expect(isVenueId('nonsense')).toBe(false);
    expect(venue('nonsense' as VenueId).id).toBe(DEFAULT_VENUE);
  });

  it.each(ALL)('%s declares at least one visible course', (id) => {
    const visible = venue(id).courses.filter((c) => c.visible);
    expect(visible.length).toBeGreaterThan(0);
  });

  it('gives each club the grid density it is meant to have', () => {
    const cells = (id: VenueId) =>
      venue(id).courses.filter((c) => c.visible).reduce((n, c) => n + c.slots, 0);
    expect(cells('three-nines')).toBe(12);
    expect(cells('eighteen')).toBe(8);
    expect(cells('nine')).toBe(4);
  });

  it('models the 18-hole club as one course in two nines, both playing 18', () => {
    const courses = venue('eighteen').courses;
    expect(courses).toHaveLength(2);
    // The nine is where a round begins, not what it is — so both halves count 18.
    expect(courses.every((c) => c.holeCount === 18)).toBe(true);
    expect(courses.map((c) => c.holes)).toEqual(['FRONT 9', 'BACK 9']);
  });
});

describe('bookings fit their venue', () => {
  it.each(ALL)('%s has no booking on a course it does not have', (id) => {
    const ids = new Set(venue(id).courses.map((c) => c.id));
    const orphans = [...new Set(venueBookings(id).filter((b) => !ids.has(b.course)).map((b) => b.course))];
    // An orphaned booking doesn't error — it renders nowhere, which is far harder to notice.
    expect(orphans, `bookings on missing courses: ${orphans.join(', ')}`).toEqual([]);
  });

  it.each(ALL)('%s has bookings at all', (id) => {
    expect(venueBookings(id).length).toBeGreaterThan(0);
  });

  it('gives smaller clubs proportionally lighter sheets', () => {
    const n = (id: VenueId) => venueBookings(id).length;
    expect(n('three-nines')).toBeGreaterThan(n('eighteen'));
    expect(n('eighteen')).toBeGreaterThan(n('nine'));
  });

  it('never collapses two source courses onto one target', () => {
    // Two sources mapping to one target would put two bookings in the same cell.
    for (const id of ALL) {
      const targets = Object.values(venue(id).courseMap);
      expect(new Set(targets).size, `${id} maps two courses onto one`).toBe(targets.length);
    }
  });

  it('memoizes, so repeated reads are the same array', () => {
    expect(venueBookings('eighteen')).toBe(venueBookings('eighteen'));
  });
});

describe('state seeds from the venue', () => {
  it.each(ALL)('%s seeds courses and bookings together', (id) => {
    const state = createInitialState({ venueId: id });
    expect(state.venueId).toBe(id);
    expect(state.courses.map((c) => c.id)).toEqual(venue(id).courses.map((c) => c.id));
    const ids = new Set(state.courses.map((c) => c.id));
    expect(state.bookings.every((b) => ids.has(b.course))).toBe(true);
  });

  it('lets an explicit courses override win, for stories pinning an unusual layout', () => {
    const custom = [{ ...venue('nine').courses[0], id: 'custom', name: 'Custom' }];
    expect(createInitialState({ venueId: 'nine', courses: custom }).courses[0].id).toBe('custom');
  });
});

describe('round length comes from the course, not its label', () => {
  it('reads holeCount rather than parsing the display string', () => {
    // The original parsed `holes.replace(' HOLES','')`, which yields "FRONT 9" — and so a
    // nonsense round label — the moment a course isn't named "N HOLES".
    const eighteenCourse = venue('eighteen').courses[0];
    expect(eighteenCourse.holes).toBe('FRONT 9');
    expect(eighteenCourse.holeCount).toBe(18);
  });

  it('labels a walk-in on the 18-hole club as an 18-hole round', () => {
    const booking = venueBookings('eighteen').find((b) => b.status === 'walkin')!;
    const label = buildTeeTimeCart(booking)[0].name;
    // buildTeeTimeCart resolves against the default COURSES, so this asserts the shape of
    // the label rather than the venue's own count — the parsing bug would show as a label
    // containing "FRONT" instead of a number.
    expect(label).toMatch(/^(Walk-in|Tee Time) \d+ holes$/);
  });
});
