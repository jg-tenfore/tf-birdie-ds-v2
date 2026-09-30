import type { EventCharge, GolfEvent } from '../data/events';
import type { Booking } from '../types';

/**
 * The rules the Events screen and its dialogs share (V1 → V2, Wave 3). Pure, so the list, the
 * charge-to-event tender and the tests agree on which events take charges and in what order they
 * are shown.
 */

export const eventStatusLabel = (s: GolfEvent['status']): string => (s === 'open' ? 'Open' : s === 'upcoming' ? 'Upcoming' : 'Billed');

/** `YYYY-MM-DD` as a local date — `new Date('2026-05-30')` is midnight UTC, the 29th in Florida. */
export function fromDateStr(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

const RANK: Record<GolfEvent['status'], number> = { open: 0, upcoming: 1, billed: 2 };

/**
 * Open first — today's, where charges are landing — then upcoming, soonest first, then billed,
 * most recent first. v1 sorted by name, which put numeric names and test rows at the top.
 */
export function eventsInOrder(events: GolfEvent[]): GolfEvent[] {
  return events
    .slice()
    .sort((a, b) => RANK[a.status] - RANK[b.status] || (a.status === 'billed' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.name.localeCompare(b.name));
}

/**
 * Which events an order can be charged to at checkout. A billed event is closed — the organiser has
 * paid, and `chargeEvent` refuses it too. The event whose own bill is being paid is left out: charging
 * a bill to the event it settles would be paying it with itself.
 */
export function chargeableEvents(events: GolfEvent[], payingEventId?: string | null): GolfEvent[] {
  return eventsInOrder(events).filter((e) => e.status !== 'billed' && e.id !== payingEventId);
}

/**
 * Whether a charge can be taken off here. Only one added by hand, on an event not yet billed. A
 * charge that came from an order was paid for with the event as its tender; removing it would leave
 * an order paid by nobody. Refunding that order puts the reversal on the ledger instead.
 */
export const removableCharge = (e: GolfEvent, c: EventCharge): boolean => e.status !== 'billed' && !c.orderNumber;

/**
 * The tee-sheet groups an event can take its golf from — every league or outing on the sheet, by
 * the group its bookings share. One entry per group, named as the tee sheet names it.
 */
export function teeSheetGroups(bookings: Booking[]): { groupId: string; name: string; date: string; players: number }[] {
  const by = new Map<string, { groupId: string; name: string; date: string; players: number }>();
  for (const b of bookings) {
    if (!b.groupId) continue;
    const g = by.get(b.groupId) ?? { groupId: b.groupId, name: b.groupMeta?.name ?? b.name, date: b.date, players: 0 };
    g.players += b.players;
    if (b.date < g.date) g.date = b.date;
    by.set(b.groupId, g);
  }
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
