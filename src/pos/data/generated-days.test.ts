import { describe, expect, it, vi } from 'vitest';
import { DEMO_TODAY, createBookings, demoRange, generateDayBookings, isInDemoRange, isInDemoWindow } from './bookings';
import { createHash } from 'node:crypto';
import { DEFAULT_TEE_SHEET_SETTINGS, generateTimes, toDateStr } from './courses';
import { venue, venueBookings, venueDayBookings } from './venues';
import type { VenueId } from './venues';
import { createInitialState, reducer } from '../state/pos-store';
import { clampToDemoRange, missingDemoDay, unfilledDemoDay } from '../state/demo-days';
import type { PosState } from '../state/pos-store';

/**
 * Weston Edits' phone date navigation can go to any date within a year of the demo's
 * today, and each such day gets a generated tee sheet. These tests pin what makes that
 * believable and safe: the same date is always the same sheet, ids never collide with
 * another date's, weekends are busier, and nothing is generated outside the range.
 */

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Every date in `demoRange()`, as `YYYY-MM-DD`. */
function allRangeDates(): string[] {
  const { start, end } = demoRange();
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(toDateStr(d));
  return out;
}

const VENUES: VenueId[] = ['three-nines', 'eighteen', 'nine'];

describe('range', () => {
  it('spans twelve months either side of the demo today', () => {
    const { start, end } = demoRange();
    expect(toDateStr(start)).toBe('2025-05-21');
    expect(toDateStr(end)).toBe('2027-05-21');
    expect(toDateStr(DEMO_TODAY())).toBe('2026-05-21');
  });

  it('generates nothing outside the range, and something at both ends', () => {
    expect(generateDayBookings('2025-05-20')).toEqual([]);
    expect(generateDayBookings('2027-05-22')).toEqual([]);
    expect(generateDayBookings('2025-05-21').length).toBeGreaterThan(0);
    expect(generateDayBookings('2027-05-21').length).toBeGreaterThan(0);
    expect(isInDemoRange('2025-05-20')).toBe(false);
    expect(isInDemoRange('2027-05-21')).toBe(true);
  });

  it('leaves the authored window to createBookings', () => {
    const windowDates = [...new Set(createBookings().map((b) => b.date))].sort();
    expect(windowDates).toHaveLength(11);
    expect(windowDates[0]).toBe('2026-05-15');
    expect(windowDates[10]).toBe('2026-05-25');
    for (const ds of windowDates) {
      expect(isInDemoWindow(ds)).toBe(true);
      expect(generateDayBookings(ds)).toEqual([]);
    }
    expect(isInDemoWindow('2026-05-14')).toBe(false);
    expect(isInDemoWindow('2026-05-26')).toBe(false);
  });

  it('clamps dates into the range', () => {
    expect(toDateStr(clampToDemoRange(new Date(2024, 0, 1)))).toBe('2025-05-21');
    expect(toDateStr(clampToDemoRange(new Date(2028, 0, 1)))).toBe('2027-05-21');
    expect(toDateStr(clampToDemoRange(new Date(2026, 5, 12)))).toBe('2026-06-12');
  });
});

describe('determinism', () => {
  it('gives a date the same bookings on a fresh load', async () => {
    const first = JSON.stringify(generateDayBookings('2026-06-12'));
    vi.resetModules();
    const fresh = await import('./bookings');
    expect(JSON.stringify(fresh.generateDayBookings('2026-06-12'))).toBe(first);
  });

  it('dates every booking on the date asked for', () => {
    for (const ds of ['2025-11-03', '2026-06-12', '2027-01-01']) {
      const day = generateDayBookings(ds);
      expect(day.length).toBeGreaterThan(0);
      expect(day.every((b) => b.date === ds)).toBe(true);
    }
  });

  it('never repeats an id — within a day, across dates, or against the window', () => {
    const seen = new Set(createBookings().map((b) => b.id));
    let total = seen.size;
    for (const ds of allRangeDates()) {
      for (const b of generateDayBookings(ds)) seen.add(b.id);
      total += generateDayBookings(ds).length;
    }
    expect(seen.size).toBe(total);
  });
});

describe('volume', () => {
  const counts = allRangeDates()
    .filter((ds) => !isInDemoWindow(ds))
    .map((ds) => {
      const [y, m, d] = ds.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const offset = Math.round((date.getTime() - DEMO_TODAY().getTime()) / 86_400_000);
      return { ds, dow: date.getDay(), offset, n: generateDayBookings(ds).length };
    });
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const weekend = (c: { dow: number }) => c.dow === 0 || c.dow === 6;

  it('is busier at weekends than on weekdays', () => {
    expect(avg(counts.filter(weekend).map((c) => c.n))).toBeGreaterThan(avg(counts.filter((c) => !weekend(c)).map((c) => c.n)) * 1.3);
  });

  it('is busier at weekends than weekdays in every month', () => {
    const months = new Map<string, typeof counts>();
    for (const c of counts) months.set(c.ds.slice(0, 7), [...(months.get(c.ds.slice(0, 7)) ?? []), c]);
    for (const [, cs] of months) {
      const we = cs.filter(weekend);
      const wd = cs.filter((c) => !weekend(c));
      if (we.length && wd.length) expect(avg(we.map((c) => c.n))).toBeGreaterThan(avg(wd.map((c) => c.n)));
    }
  });

  it('thins out further from today', () => {
    const near = counts.filter((c) => Math.abs(c.offset) <= 60).map((c) => c.n);
    const far = counts.filter((c) => Math.abs(c.offset) >= 300).map((c) => c.n);
    expect(avg(near)).toBeGreaterThan(avg(far));
  });
});

describe('state of generated days', () => {
  it('settles past days: nobody mid-round, nobody waiting to check in', () => {
    for (const b of generateDayBookings('2026-03-14')) {
      expect(['paid', 'open', 'no_show', 'refund', 'rain_chk']).toContain(b.pay);
      for (const p of b.playerStates) expect([6, -1]).toContain(p.step);
    }
  });

  it('leaves future days mostly unpaid and not yet started', () => {
    const day = generateDayBookings('2026-06-12');
    expect(day.every((b) => b.playerStates.every((p) => p.step === -1))).toBe(true);
    const unpaid = day.filter((b) => b.pay === 'open').length;
    expect(unpaid / day.length).toBeGreaterThan(0.4);
  });
});

describe('venues', () => {
  it.each(VENUES)('%s: a generated day sits only on the club’s courses, one booking per cell', (id) => {
    const courses = new Set(venue(id).courses.map((c) => c.id));
    const day = venueDayBookings(id, '2026-06-12');
    expect(day.length).toBeGreaterThan(0);
    expect(day.every((b) => courses.has(b.course))).toBe(true);
    const cells = day.map((b) => `${b.course}|${b.timeMin}|${b.slot}`);
    expect(new Set(cells).size).toBe(cells.length);
  });
});

describe('placement on the grid', () => {
  const rows = new Set(generateTimes(DEFAULT_TEE_SHEET_SETTINGS).map((t) => t.totalMin));
  const slots = DEFAULT_TEE_SHEET_SETTINGS.slots;
  // Every generated date in the range, weekday and weekend, a year either side.
  const DATES = allRangeDates().filter((ds) => !isInDemoWindow(ds));

  it('leaves the authored window byte-identical', () => {
    // Recorded before generated days were snapped onto rows. The window keeps its quirks
    // (12:36 `p42`, overlapping cells) — every story is written against it.
    expect(createHash('sha1').update(JSON.stringify(createBookings())).digest('hex')).toBe(
      'e5c50e24b60459a8e6feae4d0f831f31308cb9cb',
    );
  });

  it.each(VENUES)('%s: every generated booking sits on a row of the grid', (id) => {
    for (const ds of DATES) {
      const off = venueDayBookings(id, ds).filter((b) => !rows.has(b.timeMin));
      expect(off.map((b) => `${b.id}@${b.timeMin}`), ds).toEqual([]);
    }
  });

  it.each(VENUES)('%s: no two generated bookings share a cell, and none runs off the row', (id) => {
    for (const ds of DATES) {
      const cells = new Map<string, string>();
      for (const b of venueDayBookings(id, ds)) {
        expect(b.slot + b.players, `${b.id} overflows its row`).toBeLessThanOrEqual(slots);
        for (let s = b.slot; s < b.slot + b.players; s++) {
          const key = `${b.course}|${b.timeMin}|${s}`;
          expect(cells.get(key), `${b.id} overlaps ${cells.get(key)} at ${key}`).toBeUndefined();
          cells.set(key, b.id);
        }
      }
    }
  });

  it('keeps every booking of the day in the totals the sheet shows', () => {
    // What the phone and tablet add up is the players on bookings they can render — with
    // every booking on a free row, that is simply every booking.
    for (const ds of DATES) {
      const day = generateDayBookings(ds);
      const visible = day.filter((b) => rows.has(b.timeMin) && b.slot + b.players <= slots);
      expect(visible.reduce((n, b) => n + b.players, 0)).toBe(day.reduce((n, b) => n + b.players, 0));
    }
  });
});

describe('missingDemoDay', () => {
  const s0 = createInitialState({ venueId: 'eighteen' });

  const june12 = new Date(2026, 5, 12);
  const fill = (s: PosState, date: Date) =>
    reducer(s, { type: 'fillDemoDay', date: toDateStr(date), bookings: missingDemoDay(s, date) });
  const onDay = (s: PosState, ds: string) => s.bookings.filter((b) => b.date === ds);

  it('starts with no generated dates', () => {
    expect(s0.generatedDates).toEqual([]);
  });

  it('fills a day once, and never again', () => {
    const missing = missingDemoDay(s0, june12);
    expect(missing.length).toBeGreaterThan(0);
    const s1 = reducer(fill(s0, june12), { type: 'setDate', date: june12 });
    expect(s1.generatedDates).toEqual(['2026-06-12']);
    expect(missingDemoDay(s1, june12)).toEqual([]);
    expect(new Set(s1.bookings.map((b) => b.id)).size).toBe(s1.bookings.length);
    expect(s1.bookings.length).toBe(venueBookings('eighteen').length + missing.length);
  });

  it('records the date with the bookings, and ignores a second fill of the same date', () => {
    const s1 = fill(s0, june12);
    const again = reducer(s1, { type: 'fillDemoDay', date: '2026-06-12', bookings: venueDayBookings('eighteen', '2026-06-12') });
    expect(again).toBe(s1);
  });

  it('keeps edits on a filled day — revisiting finds them, not a fresh copy', () => {
    const filled = fill(s0, june12);
    const first = filled.bookings.find((b) => b.date === '2026-06-12')!;
    const edited = reducer(filled, { type: 'patchBooking', bookingId: first.id, patch: { name: 'Edited, E.' } });
    expect(missingDemoDay(edited, june12)).toEqual([]);
    expect(edited.bookings.find((b) => b.id === first.id)!.name).toBe('Edited, E.');
  });

  it('keeps a cleared generated day empty: fill once, delete all, leave, revisit', () => {
    const filled = fill(s0, june12);
    const ids = onDay(filled, '2026-06-12').map((b) => b.id);
    expect(ids.length).toBeGreaterThan(0);
    const cleared = reducer(filled, { type: 'deleteBookings', bookingIds: ids });
    expect(onDay(cleared, '2026-06-12')).toEqual([]);
    // Leave for another day (which fills), then come back.
    const june13 = new Date(2026, 5, 13);
    const away = fill(reducer(cleared, { type: 'setDate', date: june13 }), june13);
    const back = reducer(away, { type: 'setDate', date: june12 });
    expect(missingDemoDay(back, june12)).toEqual([]);
    expect(onDay(fill(back, june12), '2026-06-12')).toEqual([]);
    expect(onDay(back, '2026-06-13').length).toBeGreaterThan(0);
    expect(back.generatedDates).toEqual(['2026-06-12', '2026-06-13']);
    // The calendars' fallback count agrees: nothing left to generate on either date.
    expect(unfilledDemoDay(back, '2026-06-12')).toEqual([]);
    expect(unfilledDemoDay(back, '2026-06-14').length).toBeGreaterThan(0);
  });

  it('keeps the edits and the rest of a partly cleared day', () => {
    const filled = fill(s0, june12);
    const [first, second, ...rest] = onDay(filled, '2026-06-12');
    const edited = reducer(
      reducer(filled, { type: 'deleteBookings', bookingIds: [first.id] }),
      { type: 'patchBooking', bookingId: second.id, patch: { name: 'Edited, E.' } },
    );
    expect(missingDemoDay(edited, june12)).toEqual([]);
    const day = onDay(edited, '2026-06-12');
    expect(day.map((b) => b.id)).toEqual([second.id, ...rest.map((b) => b.id)]);
    expect(day[0].name).toBe('Edited, E.');
  });

  it('survives Back / Forward on the same club, and resets only when the club changes', () => {
    const cleared = reducer(fill(s0, june12), {
      type: 'deleteBookings',
      bookingIds: onDay(fill(s0, june12), '2026-06-12').map((b) => b.id),
    });
    const kept = reducer(cleared, { type: 'applyUrl', patch: { view: 'tee', currentDate: june12 } });
    expect(kept.generatedDates).toEqual(['2026-06-12']);
    expect(missingDemoDay(kept, june12)).toEqual([]);
    // Even a patch that carries fresh bookings for the *same* club is navigation: the
    // session's sheet wins. (This used to replace the sheet and reset `generatedDates` —
    // which is exactly how Back threw away every booking edit.)
    const same = reducer(cleared, {
      type: 'applyUrl',
      patch: { venueId: 'eighteen', bookings: venueBookings('eighteen') },
    });
    expect(same.bookings).toBe(cleared.bookings);
    expect(same.generatedDates).toEqual(['2026-06-12']);
    // Another club re-homes: its sheet, and nothing generated into it yet, so the date is
    // fillable again rather than stuck empty.
    const moved = reducer(cleared, { type: 'applyUrl', patch: { venueId: 'nine' } });
    expect(moved.bookings).toBe(venueBookings('nine'));
    expect(moved.courses.map((c) => c.id)).toEqual(['the-nine']);
    expect(moved.generatedDates).toEqual([]);
    expect(missingDemoDay(moved, june12).length).toBeGreaterThan(0);
  });

  it('adds nothing to a window day or outside the range', () => {
    expect(missingDemoDay(s0, DEMO_TODAY())).toEqual([]);
    expect(missingDemoDay(s0, new Date(2026, 4, 15))).toEqual([]);
    expect(missingDemoDay(s0, new Date(2027, 4, 22))).toEqual([]);
    expect(missingDemoDay(s0, new Date(2025, 4, 20))).toEqual([]);
  });
});
