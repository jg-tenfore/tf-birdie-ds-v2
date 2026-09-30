import { describe, expect, it } from 'vitest';
import { SEED_EVENTS, SEED_EVENT_BOOKINGS } from '../data/events';
import { chargeableEvents, eventsInOrder, fromDateStr, removableCharge, teeSheetGroups } from './event-screen';

/** The Events screen's rules (V1 → V2, Wave 3). */

describe('which events', () => {
  it('lists open first, then upcoming, then billed', () => {
    expect(eventsInOrder(SEED_EVENTS).map((e) => e.status)).toEqual(['open', 'upcoming', 'billed']);
  });

  it('offers only events still taking charges at checkout, and never the bill being paid', () => {
    expect(chargeableEvents(SEED_EVENTS).map((e) => e.id)).toEqual(['EV-302', 'EV-301']);
    expect(chargeableEvents(SEED_EVENTS, 'EV-301').map((e) => e.id)).toEqual(['EV-302']);
  });
});

describe('the ledger', () => {
  const memberGuest = SEED_EVENTS.find((e) => e.id === 'EV-301')!;
  const rotary = SEED_EVENTS.find((e) => e.id === 'EV-300')!;

  it('lets a hand-added charge be removed, but not one that came from an order', () => {
    const fromOrder = memberGuest.ledger.find((c) => c.orderNumber)!;
    const byHand = memberGuest.ledger.find((c) => !c.orderNumber)!;
    expect(removableCharge(memberGuest, byHand)).toBe(true);
    expect(removableCharge(memberGuest, fromOrder)).toBe(false);
  });

  it('removes nothing from a billed event', () => {
    for (const c of rotary.ledger) expect(removableCharge(rotary, c)).toBe(false);
  });
});

describe('tee-sheet groups an event can take its golf from', () => {
  it('finds each outing once, with its players', () => {
    const groups = teeSheetGroups(SEED_EVENT_BOOKINGS);
    expect(groups.map((g) => [g.groupId, g.players])).toEqual([
      ['grp-rotary', 40],
      ['grp-member-guest', 72],
    ]);
  });
});

it('reads a date as the local day, not UTC midnight', () => {
  const d = fromDateStr('2026-05-30');
  expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 4, 30]);
});
