import { describe, expect, it } from 'vitest';
import { DEMO_NOW_MIN, createBookings, statusForConf } from '../data/bookings';
import { RATE_PRICING } from '../data/courses';
import { venue, venueBookings } from '../data/venues';
import { createInitialState, reducer } from '../state/pos-store';
import { largestFit } from './bookings';
import { moveWalkIn, nextOpenTeeTime, openTeeTimes, planWalkIn, rateHoles, walkInCourses } from './walk-in';

/**
 * Decision 4 (Weston Edits follow-ups): a walk-in is a reservation at the next open tee time,
 * deterministic, opened in the panel. Decision 7: `R-` bookings the seed marked walk-in are
 * reservations.
 */

const ctx = (id: 'eighteen' | 'three-nines' | 'nine') => {
  const s = createInitialState({ venueId: id });
  return { bookings: s.bookings, courses: s.courses, timePrices: s.timePrices };
};
const TODAY = '2026-05-21';

describe('next open tee time', () => {
  it('is after the demo "now" and has room', () => {
    const c = ctx('eighteen');
    const at = nextOpenTeeTime(c.bookings, c.courses, { date: TODAY, afterMin: DEMO_NOW_MIN, players: 1 })!;
    expect(at.timeMin).toBeGreaterThan(DEMO_NOW_MIN);
    const day = c.bookings.filter((b) => b.date === TODAY);
    expect(largestFit(day, at.course, at.timeMin)).toBeGreaterThanOrEqual(1);
    // Nothing earlier (after now) had room on any course.
    const earlier = openTeeTimes(c.bookings, c.courses, { date: TODAY, afterMin: DEMO_NOW_MIN, players: 1 })[0];
    expect(earlier).toEqual(at);
  });

  it('starts an 18 on the front nine at an 18-hole club', () => {
    const courses = venue('eighteen').courses;
    expect(walkInCourses(courses, 18).map((c) => c.id)).toEqual(['champ-front']);
    expect(walkInCourses(courses, 9).map((c) => c.id)).toEqual(['champ-front', 'champ-back']);
    expect(walkInCourses(venue('three-nines').courses, 18)).toHaveLength(3);
  });

  it('reads the hole count off a rate name', () => {
    expect(rateHoles('Guest Rate 18 Holes')).toBe(18);
    expect(rateHoles('Guest Rate 9 Holes')).toBe(9);
    expect(rateHoles('Replay 9')).toBe(9);
    expect(rateHoles('Walking Only')).toBeNull();
  });
});

describe('planWalkIn', () => {
  it('builds an unpaid, not-arrived walk-in with a W- code, deterministically', () => {
    const a = planWalkIn(ctx('eighteen'))!;
    const b = planWalkIn(ctx('eighteen'))!;
    expect(a).toEqual(b);
    expect(a).toMatchObject({ id: 'walkin-1', conf: 'W-0001', status: 'walkin', pay: 'open', players: 1, date: TODAY });
    expect(a.playerStates).toEqual([{ paid: false, step: -1, noShow: false }]);
    expect(a.timeMin).toBeGreaterThan(DEMO_NOW_MIN);
  });

  it('defaults to 18 at an 18-hole club, priced from the card for the band', () => {
    const w = planWalkIn(ctx('eighteen'))!;
    expect(w.holes).toBe('18H');
    const band = w.timeMin < 14 * 60 ? 'peak' : 'twilight';
    expect(w.price).toBe(RATE_PRICING[band].find((r) => r.rack)!.p18);
    expect(planWalkIn(ctx('nine'))!.holes).toBe('9H');
  });

  it("respects the rung rate's holes and price", () => {
    const w = planWalkIn(ctx('eighteen'), { rate: { name: 'Guest Rate 9 Holes', price: 35 } })!;
    expect(w.holes).toBe('9H');
    expect(w.price).toBe(35);
  });

  it('numbers walk-ins past the highest so far, and never lands two in one cell', () => {
    let s = createInitialState({ venueId: 'eighteen' });
    const first = planWalkIn(s)!;
    s = reducer(s, { type: 'startWalkIn', booking: first });
    const second = planWalkIn(s)!;
    expect(second.id).toBe('walkin-2');
    expect([second.course, second.timeMin, second.slot]).not.toEqual([first.course, first.timeMin, first.slot]);
  });

  it('carries a picked golfer onto seat 0', () => {
    const golfer = { id: 'g1', name: 'Rhye, O.', phone: '(555)000-0001', email: 'o@x.com', type: 'Member' as const, memberType: 'seasonal' as const, hcp: 12 };
    const w = planWalkIn(ctx('eighteen'), { golfer })!;
    expect(w.name).toBe('Rhye, O.');
    expect(w.guests?.[0]).toMatchObject({ name: 'Rhye, O.', crmId: 'g1', memberType: 'seasonal' });
  });
});

describe('startWalkIn', () => {
  it("adds the booking, shows today's sheet and opens it in the panel", () => {
    let s = createInitialState({ venueId: 'eighteen', view: 'pos', flowMode: 'walkin' });
    const w = planWalkIn(s)!;
    s = reducer(s, { type: 'startWalkIn', booking: w });
    expect(s.bookings.at(-1)).toEqual(w);
    expect(s.view).toBe('tee');
    expect(s.flowMode).toBe('');
    expect(s.reservationPanel).toEqual({ bookingId: w.id, tab: 'players', playerIndex: 0 });
    expect(s.cart).toEqual([]);
  });

  it('moving it re-prices a card price for the new band, and keeps a rung rate', () => {
    const c = ctx('eighteen');
    const w = planWalkIn(c)!;
    const later = openTeeTimes(c.bookings, walkInCourses(c.courses, 18), { date: TODAY, afterMin: 14 * 60, players: 1 })[0];
    expect(moveWalkIn(w, later).price).toBe(RATE_PRICING.twilight.find((r) => r.rack)!.p18);
    const rung = planWalkIn(c, { rate: { name: 'Guest Rate 18 Holes', price: 59 } })!;
    expect(moveWalkIn(rung, later)).not.toHaveProperty('price');
  });
});

describe('demo data: walk-in status follows the confirmation code', () => {
  it('no R- reservation is marked walk-in', () => {
    for (const b of createBookings()) expect(b.status === 'walkin' && b.conf.startsWith('R-')).toBe(false);
    expect(statusForConf({ status: 'walkin', conf: 'R-3029' })).toBe('booked');
    expect(statusForConf({ status: 'walkin', conf: 'W-0001' })).toBe('walkin');
    expect(statusForConf({ status: 'member', conf: 'M-1' })).toBe('member');
  });

  it('changes nothing but the status (and the rate-card price)', () => {
    const all = createBookings();
    const morris = venueBookings('eighteen').find((b) => b.id === 'p43')!;
    expect(morris).toMatchObject({ conf: 'R-3029', status: 'booked', price: 26, holes: '9H', timeMin: 840 });
    expect(all.length).toBe(createBookings().length);
    expect(JSON.stringify(all)).toBe(JSON.stringify(createBookings()));
  });
});
