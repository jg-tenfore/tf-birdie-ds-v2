import { describe, expect, it } from 'vitest';
import { SEED_ROOMS, allTables, type FloorElement } from '../data/floor';
import { ALL_GOLFERS } from '../data/golfers';
import { SEED_RESERVATIONS, SEED_TABS } from '../data/restaurant-seed';
import {
  MEAL_MIN,
  RESERVATION_SLOTS,
  blockerText,
  byService,
  canMarkNoShow,
  canSeat,
  choiceItem,
  choiceNote,
  daySummary,
  defaultReservationTime,
  formatSeated,
  initials,
  liveCtx,
  mealsOverlap,
  minutesSeated,
  occupiedNote,
  relativeTo,
  reservationsToSeatAt,
  searchGolfers,
  statusCounts,
  tableBlocker,
  tableChoicesNow,
  tableOptionsFor,
  tablesForReservation,
  type FloorCtx,
} from './dining';
import { HOLD_BEFORE_MIN, tableStatus, tablesFor, type DiningReservation } from './restaurant';

const NOON = 12 * 60;
const at = (h: number, m = 0) => h * 60 + m;
const ctx = liveCtx({ tabs: SEED_TABS, diningReservations: SEED_RESERVATIONS });
const DAY = ctx.date;
const tableById = (id: string): FloorElement => allTables(SEED_ROOMS).find((t) => t.table.id === id)!.table;
const res = (r: Partial<DiningReservation>): DiningReservation => ({
  id: 'R-X',
  date: DAY,
  timeMin: at(19),
  partySize: 4,
  name: 'Test, Party',
  status: 'booked',
  ...r,
});

describe('the overlap rule', () => {
  it('holds a table for a whole meal', () => {
    expect(MEAL_MIN).toBe(90);
    expect(mealsOverlap(at(19), at(19))).toBe(true);
    expect(mealsOverlap(at(19), at(19, 30))).toBe(true);
    expect(mealsOverlap(at(19, 30), at(19))).toBe(true);
    expect(mealsOverlap(at(19), at(20, 29))).toBe(true);
  });

  it('lets a table turn: back-to-back meals do not clash', () => {
    expect(mealsOverlap(at(17, 30), at(19))).toBe(false);
    expect(mealsOverlap(at(19), at(17, 30))).toBe(false);
    expect(mealsOverlap(at(12), at(18))).toBe(false);
  });

  it('is symmetric for any pair of times', () => {
    for (let a = at(11); a <= at(21); a += 15)
      for (let b = at(11); b <= at(21); b += 15) expect(mealsOverlap(a, b)).toBe(mealsOverlap(b, a));
  });

  it('agrees with the floor: the hold before a reservation is exactly one meal', () => {
    // If these drift apart, `tablesFor` (free now) and `tableBlocker` (free for the meal) stop
    // agreeing about a party seated this minute.
    expect(HOLD_BEFORE_MIN).toBe(MEAL_MIN);
  });
});

describe('which table a reservation may have', () => {
  it("refuses a table another reservation has for an overlapping meal, and names who", () => {
    // Johnson (8) holds Table 12 at 7:00. A 7:30 for six cannot have it.
    const b = tableBlocker(tableById('d-12'), res({ timeMin: at(19, 30), partySize: 6 }), ctx);
    expect(b?.kind).toBe('booked');
    expect(blockerText(b!)).toBe('Johnson · 7:00 PM');
  });

  it('allows the same table once the earlier meal is done', () => {
    // Park has Table 2 at 5:30; a 7:00 there is the next seating, not a clash.
    expect(tableBlocker(tableById('d-2'), res({ timeMin: at(19) }), ctx)).toBeNull();
    expect(tableBlocker(tableById('d-2'), res({ timeMin: at(18, 59) }), ctx)?.kind).toBe('booked');
  });

  it('does not clash a reservation with itself, so editing one keeps its table', () => {
    const park = SEED_RESERVATIONS.find((r) => r.id === 'R-506')!;
    expect(tableBlocker(tableById('d-2'), park, ctx)).toBeNull();
  });

  it('ignores cancelled, no-show and other-day reservations', () => {
    const cancelled = res({ id: 'R-C', tableId: 'd-11', status: 'cancelled' });
    const noShow = res({ id: 'R-N', tableId: 'd-11', status: 'no_show' });
    const tomorrow = res({ id: 'R-T', tableId: 'd-11', date: '2099-01-01' });
    const c: FloorCtx = { ...ctx, reservations: [cancelled, noShow, tomorrow] };
    expect(tableBlocker(tableById('d-11'), res({}), c)).toBeNull();
  });

  it('treats a table seated now as taken for a meal from when it sat, then free', () => {
    // Table 1 sat at 11:35. Walsh at 1:00 would arrive before it turns; a 7:00 would not.
    expect(tableBlocker(tableById('d-1'), res({ timeMin: at(13), partySize: 2 }), ctx)?.kind).toBe('occupied');
    expect(tableBlocker(tableById('d-1'), res({ timeMin: at(19) }), ctx)).toBeNull();
  });

  it('keeps a table that has run long taken until it is actually paid', () => {
    // Table 10 opened at 11:10; at 2:00 it is still open, so it is taken at 2:00 though the meal "should" be over.
    const late: FloorCtx = { ...ctx, nowMin: at(14) };
    expect(tableBlocker(tableById('d-10'), res({ timeMin: at(13, 50), partySize: 6 }), late)?.kind).toBe('occupied');
  });

  it("only counts today's tabs against today's reservations", () => {
    expect(tableBlocker(tableById('d-1'), res({ timeMin: at(12), date: '2099-01-01' }), ctx)).toBeNull();
  });

  it('refuses a table too small or out of service', () => {
    expect(tableBlocker(tableById('d-5'), res({ partySize: 4 }), ctx)).toEqual({ kind: 'too-small', seats: 2 });
    expect(tableBlocker({ ...tableById('d-11'), outOfService: true }, res({}), ctx)).toEqual({ kind: 'out-of-service' });
  });

  it('offers the fitting tables smallest first, leaves out the too-small, and explains the rest', () => {
    // Patel, 4, at 7:00.
    const patel = SEED_RESERVATIONS.find((r) => r.id === 'R-509')!;
    const opts = tableOptionsFor(patel, SEED_ROOMS, ctx);
    expect(opts.every((o) => (o.table.seats ?? 0) >= 4)).toBe(true);
    const seats = opts.map((o) => o.table.seats ?? 0);
    expect(seats).toEqual([...seats].sort((a, b) => a - b));
    expect(opts.find((o) => o.table.id === 'd-12')?.blocker?.kind).toBe('booked');
    const ok = tablesForReservation(patel, SEED_ROOMS, ctx).map((o) => o.table.id);
    expect(ok).toContain('d-2');
    expect(ok).toContain('d-11');
    expect(ok).not.toContain('d-12');
    expect(ok).not.toContain('d-8'); // Whitfield 6:30
  });

  it('agrees with tablesFor for a party seated right now', () => {
    const now = (id: string, size: number) => ({ id, date: DAY, timeMin: NOON, partySize: size });
    for (const size of [1, 2, 4, 6, 8]) {
      const fresh = tablesFor(size, SEED_ROOMS, ctx).map((t) => t.table.id).sort();
      const mine = tablesForReservation(now('R-NEW', size), SEED_ROOMS, ctx).map((t) => t.table.id).sort();
      expect(mine, `party of ${size}`).toEqual(fresh);
    }
  });
});

describe('choosing a table right now', () => {
  it('blocks what is occupied or out of service, and only warns about a hold or a tight fit', () => {
    const choices = tableChoicesNow(6, SEED_ROOMS, ctx);
    const of = (id: string) => choices.find((c) => c.table.id === id)!;
    expect(of('d-1').blocker?.kind).toBe('occupied');
    expect(of('d-3').blocker).toBeNull();
    expect(of('d-3').held?.id).toBe('R-504');
    expect(of('d-3').tooSmall).toBe(true);
    expect(of('d-9').tooSmall).toBe(false);
  });

  it('leaves out tables more than two chairs short', () => {
    const ids = tableChoicesNow(4, SEED_ROOMS, ctx).map((c) => c.table.id);
    expect(ids).toContain('d-5'); // a two-top, two chairs pulled up
    expect(ids).not.toContain('b-1'); // a bar stool
    // …but a tab's own table stays, however small, so a move can say "here now".
    expect(tableChoicesNow(4, SEED_ROOMS, ctx, 'T-1005').map((c) => c.table.id)).toContain('b-3');
  });

  it("does not block the table a tab is already on (moving it nowhere isn't a clash)", () => {
    expect(tableChoicesNow(4, SEED_ROOMS, ctx, 'T-1001').find((c) => c.table.id === 'd-1')!.blocker).toBeNull();
  });

  it('says on each table what the host would be taking on', () => {
    const choices = tableChoicesNow(6, SEED_ROOMS, ctx);
    const item = (id: string) => choiceItem(choices.find((c) => c.table.id === id)!);
    expect(item('d-1')).toMatchObject({ disabled: true, warn: false, note: 'Occupied · Kim' });
    expect(item('d-3')).toMatchObject({ disabled: false, warn: true, note: 'Held · Delgado 12:30 PM' });
    expect(item('d-2')).toMatchObject({ disabled: false, warn: true, note: 'Seats 4' });
    expect(item('d-9')).toMatchObject({ disabled: false, warn: false, note: undefined });
    const blocked = tableChoicesNow(2, [{ ...SEED_ROOMS[0], elements: [{ ...tableById('d-6'), outOfService: true }] }], ctx);
    expect(choiceNote(blocked[0])).toBe('Out of service');
  });
});

describe('finding a customer', () => {
  const roster = ALL_GOLFERS;

  it('matches every word of a name, in any order, surname-first or not', () => {
    expect(searchGolfers(roster, 'kim').map((g) => g.name)).toContain('Kim, David');
    expect(searchGolfers(roster, 'david kim').map((g) => g.name)).toContain('Kim, David');
    expect(searchGolfers(roster, 'kim, dav')[0]?.name).toBe('Kim, David');
  });

  it('matches phone digits however they are typed', () => {
    expect(searchGolfers(roster, '400-0005').map((g) => g.id)).toEqual(['M005']);
    expect(searchGolfers(roster, '(555)4000005').map((g) => g.id)).toEqual(['M005']);
  });

  it('waits for two characters, and stops at six', () => {
    expect(searchGolfers(roster, 'k')).toEqual([]);
    expect(searchGolfers(roster, 'an').length).toBeLessThanOrEqual(6);
    expect(searchGolfers(roster, 'zzzz')).toEqual([]);
  });
});

describe('a day of reservations', () => {
  it('groups by service, in time order, dropping empty services', () => {
    const groups = byService(SEED_RESERVATIONS, DAY);
    expect(groups.map((g) => g.service)).toEqual(['lunch', 'dinner']);
    for (const g of groups) {
      const times = g.reservations.map((r) => r.timeMin);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
    expect(groups[0].reservations.every((r) => r.timeMin < at(16))).toBe(true);
    expect(byService(SEED_RESERVATIONS, '2099-01-01')).toEqual([]);
    expect(byService([res({ timeMin: at(18) })], DAY).map((g) => g.service)).toEqual(['dinner']);
  });

  it('adds up covers the way a host counts them', () => {
    const s = daySummary(SEED_RESERVATIONS, DAY);
    // Everything but Martinez (cancelled, 5): 4+8+2+4+2+4+2+6+4+8+3+2.
    expect(s.covers).toBe(49);
    expect(s.seated).toBe(12); // Kim 4, Farnsworth 8
    expect(s.toCome).toBe(35);
    expect(s.noShows).toBe(1);
    expect(s.unassigned).toBe(3); // Walsh, Patel, Bennett
  });

  it('seats only today, and marks no-shows only once their time has come', () => {
    expect(canSeat(res({}), DAY)).toBe(true);
    expect(canSeat(res({ date: '2099-01-01' }), DAY)).toBe(false);
    expect(canSeat(res({ status: 'seated' }), DAY)).toBe(false);
    expect(canMarkNoShow(res({ timeMin: at(11, 45) }), DAY, NOON)).toBe(true);
    expect(canMarkNoShow(res({ timeMin: NOON }), DAY, NOON)).toBe(true);
    expect(canMarkNoShow(res({ timeMin: at(19) }), DAY, NOON)).toBe(false);
    expect(canMarkNoShow(res({ date: '2000-01-01' }), DAY, NOON)).toBe(true);
    expect(canMarkNoShow(res({ timeMin: at(11), status: 'seated' }), DAY, NOON)).toBe(false);
  });

  it('offers times from the first seating to the last, and defaults to the next one', () => {
    expect(RESERVATION_SLOTS[0]).toBe(at(11));
    expect(RESERVATION_SLOTS.at(-1)).toBe(at(21));
    expect(defaultReservationTime(DAY, DAY, NOON)).toBe(at(12, 15));
    expect(defaultReservationTime(DAY, DAY, at(12, 7))).toBe(at(12, 15));
    expect(defaultReservationTime(DAY, DAY, at(23))).toBe(at(21));
    expect(defaultReservationTime('2099-01-01', DAY, NOON)).toBe(at(18));
  });
});

describe('the live floor', () => {
  const dining = SEED_ROOMS.find((r) => r.id === 'dining')!;
  const tables = dining.elements.filter((e) => e.kind === 'table');

  it('counts every table once, in its derived status', () => {
    const counts = statusCounts(tables, (t) => tableStatus(t, ctx));
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(tables.length);
    expect(counts).toMatchObject({ seated: 2, check: 1, reserved: 1, blocked: 0 });
  });

  it('says how long a table has been sat', () => {
    expect(minutesSeated(SEED_TABS[0], DAY, NOON)).toBe(25);
    expect(minutesSeated(SEED_TABS[0], '2099-01-01', NOON)).toBeNull();
    expect(minutesSeated({ openedDate: DAY, openedAt: '11:58 AM' }, DAY, NOON)).toBe(2);
    expect(formatSeated(25)).toBe('25 min');
    expect(formatSeated(60)).toBe('1 hr');
    expect(formatSeated(70)).toBe('1 hr 10');
    expect(relativeTo(at(12, 30), NOON)).toBe('in 30 min');
    expect(relativeTo(at(11, 40), NOON)).toBe('20 min late');
  });

  it('offers the reservations that fit a table, soonest first', () => {
    const ids = reservationsToSeatAt(tableById('d-11'), ctx).map((r) => r.id);
    expect(ids[0]).toBe('R-504');
    expect(ids).not.toContain('R-510'); // eight at a four-top
    expect(ids).not.toContain('R-501'); // already seated
    expect(ids).not.toContain('R-506'); // tonight, not an early arrival
    expect(ids).toContain('R-505');
  });

  it('names an occupied table by its party, not by itself again', () => {
    expect(occupiedNote({ name: 'Table 1 · Kim' })).toBe('Occupied · Kim');
    expect(occupiedNote({ name: 'P2' })).toBe('Occupied');
    expect(occupiedNote({ name: 'Table 5' })).toBe('Occupied');
    expect(occupiedNote({ name: "Men's league" })).toBe("Occupied · Men's league");
  });

  it('prints initials', () => {
    expect(initials('Jordan Ellis')).toBe('JE');
    expect(initials(undefined)).toBe('');
  });
});
