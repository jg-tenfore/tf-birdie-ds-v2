import { describe, expect, it } from 'vitest';
import { SHEETS, resourcesOf, seedResourceDay, type ResourceBooking } from '../data/resources';
import { createInitialState, reducer } from '../state/pos-store';
import {
  canStartAt,
  clampDuration,
  conflictsWith,
  formatDuration,
  maxDurationAt,
  overlaps,
  resourceCartLine,
  resourcePrice,
  snap,
} from './resource-booking';

const booking = (over: Partial<ResourceBooking> = {}): ResourceBooking => ({
  id: 'x',
  kind: 'bay',
  resourceId: 'bay-red',
  date: '2026-05-21',
  startMin: 600,
  durationMin: 60,
  name: 'Kim, D.',
  players: 2,
  checkedIn: false,
  paid: false,
  ...over,
});

describe('pricing', () => {
  it('charges the hourly rate for the length, to the cent', () => {
    // v1's bay rate, and its 90-minute default.
    expect(resourcePrice(booking({ durationMin: 90 }))).toBe(67.5);
    expect(resourcePrice(booking({ resourceId: 'tennis-1', durationMin: 30 }))).toBe(10);
  });

  it('prices an unknown resource at nothing rather than throwing', () => {
    expect(resourcePrice(booking({ resourceId: 'nope' }))).toBe(0);
  });
});

describe('overlap', () => {
  it('treats back-to-back bookings as not overlapping', () => {
    // 10:00–11:00 and 11:00–12:00 share a boundary, not a minute.
    expect(overlaps(booking(), booking({ startMin: 660 }))).toBe(false);
  });

  it('catches a partial overlap in either direction', () => {
    expect(overlaps(booking(), booking({ startMin: 630 }))).toBe(true);
    expect(overlaps(booking({ startMin: 630 }), booking())).toBe(true);
  });

  it('does not flag a booking against itself, or against another resource or day', () => {
    const a = booking();
    const all = [a, booking({ id: 'y', resourceId: 'bay-blue' }), booking({ id: 'z', date: '2026-05-22' })];
    expect(conflictsWith(a, all)).toEqual([]);
  });
});

describe('the grid', () => {
  it('snaps down to the 30-minute grid and stays inside opening hours', () => {
    expect(snap('bay', 8 * 60 + 44)).toBe(8 * 60 + 30);
    expect(snap('bay', 0)).toBe(SHEETS.bay.openMin);
    expect(snap('bay', 24 * 60)).toBe(SHEETS.bay.closeMin - SHEETS.bay.stepMin);
  });

  it('offers only the room before the next booking', () => {
    const all = [booking({ startMin: 720 })]; // 12:00
    // From 10:30 there are 90 minutes before noon.
    expect(maxDurationAt('bay', 'bay-red', '2026-05-21', 630, all)).toBe(90);
  });

  it('offers nothing where the minimum does not fit', () => {
    const all = [booking({ startMin: 600, durationMin: 60 }), booking({ id: 'y', startMin: 690 })];
    // 11:00–11:30 is exactly the 30-minute minimum, so it fits…
    expect(canStartAt('bay', 'bay-red', '2026-05-21', 660, all)).toBe(true);
    // …but inside an existing booking nothing does.
    expect(canStartAt('bay', 'bay-red', '2026-05-21', 630, all)).toBe(false);
  });

  it('clamps a duration to the grid, the limits and the room', () => {
    expect(clampDuration('bay', 100, 240)).toBe(90);
    expect(clampDuration('bay', 10, 240)).toBe(30);
    expect(clampDuration('bay', 180, 60)).toBe(60);
  });

  it('reads a duration the way a person says it', () => {
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(60)).toBe('1 hr');
    expect(formatDuration(30)).toBe('30 min');
  });
});

describe('seeding', () => {
  const day = seedResourceDay('bay', '2026-05-21', 12 * 60);

  it('is the same day every time', () => {
    expect(seedResourceDay('bay', '2026-05-21', 12 * 60)).toEqual(day);
  });

  it('fills every resource and never double-books one', () => {
    for (const r of resourcesOf('bay')) {
      const mine = day.filter((b) => b.resourceId === r.id);
      expect(mine.length).toBeGreaterThan(0);
      for (const b of mine) expect(conflictsWith(b, mine)).toEqual([]);
    }
  });

  it('keeps every booking on the grid and inside opening hours', () => {
    const { openMin, closeMin, stepMin } = SHEETS.bay;
    for (const b of day) {
      expect(b.startMin).toBeGreaterThanOrEqual(openMin);
      expect(b.startMin + b.durationMin).toBeLessThanOrEqual(closeMin);
      expect((b.startMin - openMin) % stepMin).toBe(0);
      expect(b.durationMin % stepMin).toBe(0);
    }
  });

  it('checks in only what has already started, and pays only what is checked in', () => {
    for (const b of day) {
      expect(b.checkedIn).toBe(b.startMin <= 12 * 60);
      if (b.paid) expect(b.checkedIn).toBe(true);
    }
  });
});

describe('the store', () => {
  const seeded = () => reducer(createInitialState(), { type: 'seedResourceDay', kind: 'court', date: '2026-05-21' });

  it('seeds a day once, so edits to it survive coming back', () => {
    const once = seeded();
    const first = once.resourceBookings[0];
    const edited = reducer(once, { type: 'patchResourceBooking', id: first.id, patch: { name: 'Edited' } });
    const again = reducer(edited, { type: 'seedResourceDay', kind: 'court', date: '2026-05-21' });
    expect(again.resourceBookings.length).toBe(once.resourceBookings.length);
    expect(again.resourceBookings.find((b) => b.id === first.id)!.name).toBe('Edited');
  });

  it('check in & pay puts one line on the order, and tapping again refreshes rather than duplicates', () => {
    const s = seeded();
    const b = s.resourceBookings.find((x) => !x.checkedIn)!;
    const once = reducer(s, { type: 'checkInResource', id: b.id });
    expect(once.view).toBe('pos');
    expect(once.cart.filter((i) => i.resourceBookingId === b.id)).toHaveLength(1);

    const longer = reducer(once, { type: 'patchResourceBooking', id: b.id, patch: { durationMin: b.durationMin + 30 } });
    const twice = reducer(longer, { type: 'checkInResource', id: b.id });
    const lines = twice.cart.filter((i) => i.resourceBookingId === b.id);
    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(resourceCartLine({ ...b, durationMin: b.durationMin + 30 }).price);
  });

  it('payment marks the booking paid', () => {
    const s = seeded();
    const b = s.resourceBookings.find((x) => !x.paid)!;
    const paid = reducer(reducer(s, { type: 'checkInResource', id: b.id }), {
      type: 'recordPayment',
      method: 'card',
      amount: 1,
    });
    expect(paid.resourceBookings.find((x) => x.id === b.id)!.paid).toBe(true);
  });

  it('removing a booking takes its line off the order', () => {
    const s = seeded();
    const b = s.resourceBookings[0];
    const onOrder = reducer(s, { type: 'checkInResource', id: b.id });
    const gone = reducer(onOrder, { type: 'removeResourceBooking', id: b.id });
    expect(gone.cart.some((i) => i.resourceBookingId === b.id)).toBe(false);
  });

  it('cancelling a booking that is on a held order takes it off that order too', () => {
    // Courts and holding a ticket were built in parallel; this is where they meet. Scrubbing
    // only the live cart would let resuming the held order revive a charge for a cancelled court.
    const s = seeded();
    const b = s.resourceBookings[0];
    const held = reducer(reducer(s, { type: 'checkInResource', id: b.id }), { type: 'holdOrder', name: 'Court' });
    expect(held.cart).toHaveLength(0);
    expect(held.heldOrders[0].order.cart.some((i) => i.resourceBookingId === b.id)).toBe(true);

    const gone = reducer(held, { type: 'removeResourceBooking', id: b.id });
    const resumed = reducer(gone, { type: 'resumeHeldOrder', id: gone.heldOrders[0].id });
    expect(resumed.cart.some((i) => i.resourceBookingId === b.id)).toBe(false);
  });

  it('keeps courts and bays across Back / Forward — a link resets the panel, not the day', () => {
    // The first cut of this reset wiped every booking on navigation: a string replace matched
    // the defaults and, as a substring, `applyUrl` too.
    const s = reducer(seeded(), { type: 'openResourceBooking', bookingId: seeded().resourceBookings[0].id });
    const after = reducer(s, { type: 'applyUrl', patch: { view: 'courts' } });
    expect(after.resourceBookings.length).toBe(s.resourceBookings.length);
    expect(after.resourceSeeded).toEqual(s.resourceSeeded);
    expect(after.resourcePanel).toBeNull();
  });
});
