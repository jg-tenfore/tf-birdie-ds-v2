import { describe, expect, it } from 'vitest';
import { SEED_EVENT_BOOKINGS } from '../data/events';
import { LEAGUES, LEAGUE_SEATS, groupLabel, leagueBookingId, seedLeagueBookings } from '../data/leagues';
import { LEAGUE_RATE } from '../data/rate-catalog';
import { venueBookings } from '../data/venues';
import { buildTeeTimeCart, orderTotals } from '../logic/cart';
import { seatRateGrid } from '../logic/seat-pricing';
import { golferFeeLine, golferStatus, groupBooking, leagueCounts, matchesGolfer, placeGolfer, seatOf } from './league';
import { createInitialState, reducer, type Action, type PosState } from './pos-store';
import { rateContext } from './rate-context';

const [SENIOR, SKINS, MENS] = LEAGUES;

/** May 30 at the 18-hole club, as V1 → V2 seeds it: the Member-Guest and the three leagues. */
const fresh = (): PosState =>
  createInitialState({
    venueId: 'eighteen',
    bookings: [...venueBookings('eighteen'), ...SEED_EVENT_BOOKINGS, ...seedLeagueBookings()],
    transportFromRow: true,
  });

const run = (s: PosState, ...actions: Action[]) => actions.reduce(reducer, s);

describe('the seed', () => {
  it('puts each league on the sheet as real tee times with the mock’s placement', () => {
    const s = fresh();
    expect(leagueCounts(s, SENIOR)).toEqual({ in: 5, paid: 4, placed: 16 });
    expect(leagueCounts(s, SKINS)).toEqual({ in: 0, paid: 0, placed: 11 });
    expect(leagueCounts(s, MENS)).toEqual({ in: 0, paid: 0, placed: 18 });
    // Justin is still to place in the Senior League, and on a team in the Men's.
    expect(seatOf(s.bookings, SENIOR, 'g0')).toBeNull();
    expect(seatOf(s.bookings, MENS, 'g0')).not.toBeNull();
    // The 7:20 is Johnny's three, one seat open.
    const seven20 = groupBooking(s.bookings, SENIOR, 2)!;
    expect(groupLabel(SENIOR, 'tee-times', 2)).toBe('7:20 AM');
    expect(seven20.players).toBe(3);
    expect(seven20.name).toBe('Alvarez, Johnny');
    expect(seven20.groupId).toBe(SENIOR.groupId);
    expect(seven20.groupMeta?.name).toBe('Senior League');
  });

  it('never shares a tee time with the Member-Guest (or anyone) on May 30', () => {
    const day = fresh().bookings.filter((b) => b.date === SENIOR.date);
    const leagues = day.filter((b) => b.id.startsWith('league-'));
    expect(leagues).toHaveLength(13);
    for (const b of leagues) {
      const others = day.filter((x) => x.id !== b.id && x.course === b.course && x.timeMin === b.timeMin);
      expect(others, `${b.id} shares ${b.course} ${b.timeMin}`).toEqual([]);
    }
  });

  it('sits on the sheet’s 8-minute rows', () => {
    for (const l of LEAGUES) for (const t of l.teeTimes) expect((t.timeMin - 360) % 8).toBe(0);
  });
});

describe('pricing goes through the register', () => {
  it('sells a league seat on the League Rate, with the golfer’s ride or walk', () => {
    const s = fresh();
    const johnny = seatOf(s.bookings, SENIOR, 'g2')!;
    expect(golferFeeLine(s, johnny)).toBe('League Rate $36.00 · Riding Cart $26.82');
    const walker = seatOf(s.bookings, SENIOR, 'g8')!; // Sullivan, Pat — one in five walks
    expect(golferFeeLine(s, walker)).toBe('League Rate $36.00 · Walking $8.58');
  });

  it('offers the League Rate only on a league’s tee times', () => {
    const s = fresh();
    const league = groupBooking(s.bookings, SENIOR, 2)!;
    expect(seatRateGrid(league, 18).some((r) => r.id === LEAGUE_RATE.id)).toBe(true);
    const ordinary = s.bookings.find((b) => b.date === '2026-05-22' && b.players === 4)!;
    expect(seatRateGrid(ordinary, 18).some((r) => r.id === LEAGUE_RATE.id)).toBe(false);
  });

  it('shows on Pay exactly what the register will charge for the seat', () => {
    const s = fresh();
    const ref = seatOf(s.bookings, SENIOR, 'g2')!;
    const register = orderTotals(buildTeeTimeCart(ref.booking, s.courses, rateContext(s), [ref.seat])).total;
    expect(golferStatus(s, SENIOR, 'g2').due).toBe(register);
    const paying = run(s, { type: 'leaguePay', groupId: SENIOR.groupId, golferId: 'g2' });
    expect(orderTotals(paying.cart).total).toBe(register);
  });
});

describe('placing the roster fills real seats', () => {
  it('puts Justin on the 7:20: a fourth seat on that booking, his name, his id', () => {
    const s = run(fresh(), { type: 'leaguePlace', groupId: SENIOR.groupId, golferId: 'g0', group: 2 });
    const b = groupBooking(s.bookings, SENIOR, 2)!;
    expect(b.players).toBe(4);
    expect(b.playerStates).toHaveLength(4);
    expect(b.guests![3]).toMatchObject({ name: 'Girard, Justin', leagueGolferId: 'g0' });
    expect(b.playerStates[3]).toMatchObject({ paid: false, step: -1, rateId: LEAGUE_RATE.id, transportRateId: 'tr-riding-cart' });
    expect(leagueCounts(s, SENIOR).placed).toBe(17);
  });

  it('refuses a full tee time', () => {
    const s = fresh();
    expect(groupBooking(s.bookings, SENIOR, 0)!.players).toBe(LEAGUE_SEATS);
    expect(placeGolfer(s.bookings, SENIOR, 'g0', 0)).toBeNull();
    expect(run(s, { type: 'leaguePlace', groupId: SENIOR.groupId, golferId: 'g0', group: 0 }).bookings).toBe(s.bookings);
  });

  it('takes a golfer off, freeing the seat; the next golfer becomes the booker', () => {
    const s = run(fresh(), { type: 'leaguePlace', groupId: SENIOR.groupId, golferId: 'g2', group: null });
    const b = groupBooking(s.bookings, SENIOR, 2)!;
    expect(b.players).toBe(2);
    expect(b.name).toBe('Hughes, Tom');
    expect(seatOf(s.bookings, SENIOR, 'g2')).toBeNull();
  });

  it('moves a golfer with their seat as it stands — paid and teed off', () => {
    const s = run(fresh(), { type: 'leaguePlace', groupId: SENIOR.groupId, golferId: 'g1', group: 2 });
    const ref = seatOf(s.bookings, SENIOR, 'g1')!;
    expect(ref.group).toBe(2);
    expect(ref.booking.playerStates[ref.seat]).toMatchObject({ paid: true, step: 1 });
    expect(groupBooking(s.bookings, SENIOR, 0)!.players).toBe(3);
  });

  it('frees the tee time when the last golfer leaves, and books it again when someone is placed', () => {
    let s = fresh();
    for (const id of ['g12', 'g14', 'g15']) s = run(s, { type: 'leaguePlace', groupId: SENIOR.groupId, golferId: id, group: null });
    expect(groupBooking(s.bookings, SENIOR, 3)).toBeUndefined();
    s = run(s, { type: 'leaguePlace', groupId: SENIOR.groupId, golferId: 'g0', group: 3 });
    const b = groupBooking(s.bookings, SENIOR, 3)!;
    expect(b.id).toBe(leagueBookingId(SENIOR, 3));
    expect(b).toMatchObject({ name: 'Girard, Justin', players: 1, course: 'champ-back', timeMin: 7 * 60 + 28 });
  });
});

describe('check in and pay', () => {
  it('checks a golfer in on their real seat', () => {
    const s = run(fresh(), { type: 'leagueCheckIn', groupId: SENIOR.groupId, golferId: 'g2' });
    const ref = seatOf(s.bookings, SENIOR, 'g2')!;
    expect(ref.booking.playerStates[ref.seat].step).toBe(0);
    expect(leagueCounts(s, SENIOR).in).toBe(6);
  });

  it('pays through the register’s own checkout: that one seat, then the seat is paid', () => {
    let s = run(fresh(), { type: 'openLeague', groupId: SENIOR.groupId }, { type: 'leaguePay', groupId: SENIOR.groupId, golferId: 'g2' });
    expect(s.modal).toEqual({ kind: 'checkout' });
    expect(s.orderSeats).toEqual([0]);
    expect(s.cart.find((i) => i.isCheckIn)!.players!.map((p) => p.name)).toEqual(['Alvarez, Johnny']);
    const due = orderTotals(s.cart).total;
    s = run(s, { type: 'recordPayment', method: 'card', amount: due }, { type: 'closeModal' });
    const ref = seatOf(s.bookings, SENIOR, 'g2')!;
    expect(ref.booking.playerStates[ref.seat]).toMatchObject({ paid: true, step: 0 });
    // Only Johnny: the rest of the 7:20 still owe.
    expect(ref.booking.playerStates.filter((p) => p.paid)).toHaveLength(1);
    expect(golferStatus(s, SENIOR, 'g2')).toMatchObject({ paid: true, due: 0, in: true });
    // Checkout opened over the League view, and closing it leaves you there.
    expect(s.view).toBe('league');
  });

  it('pays one golfer after another without carrying the last one’s order', () => {
    let s = run(fresh(), { type: 'leaguePay', groupId: SENIOR.groupId, golferId: 'g2' });
    s = run(s, { type: 'recordPayment', method: 'card', amount: orderTotals(s.cart).total }, { type: 'closeModal' });
    s = run(s, { type: 'leaguePay', groupId: SENIOR.groupId, golferId: 'g10' });
    expect(s.cart.find((i) => i.isCheckIn)!.players!.map((p) => p.name)).toEqual(['Hughes, Tom']);
    expect(s.lastPayment).toBeNull();
  });
});

describe('an extra', () => {
  it('opens the register on the golfer’s order, and comes back to the league', () => {
    let s = run(fresh(), { type: 'openLeague', groupId: SENIOR.groupId }, { type: 'leagueExtra', groupId: SENIOR.groupId, golferId: 'g10' });
    expect(s).toMatchObject({ view: 'pos', returnToLeague: SENIOR.groupId, currentCategory: 'GOLF BALLS' });
    s = run(s, { type: 'addItem', name: 'Range Bucket Large', price: 14 });
    const st = golferStatus(s, SENIOR, 'g10');
    expect(st.extras).toEqual(['Range Bucket Large']);
    expect(st.due).toBe(orderTotals(s.cart).total);
    s = run(s, { type: 'backToLeague' });
    expect(s).toMatchObject({ view: 'league', leagueGroupId: SENIOR.groupId, returnToLeague: null });
    // Pay now takes the round and the bucket together.
    s = run(s, { type: 'leaguePay', groupId: SENIOR.groupId, golferId: 'g10' });
    expect(s.cart.some((i) => i.name === 'Range Bucket Large')).toBe(true);
  });

  it('after paying, is a new order for just the extra', () => {
    let s = run(fresh(), { type: 'leaguePay', groupId: SENIOR.groupId, golferId: 'g2' });
    s = run(s, { type: 'recordPayment', method: 'card', amount: orderTotals(s.cart).total }, { type: 'closeModal' });
    s = run(s, { type: 'leagueExtra', groupId: SENIOR.groupId, golferId: 'g2' }, { type: 'addItem', name: 'Range Bucket Small', price: 8 });
    // The seat rides along, paid, at $0 — the order charges the bucket and its tax.
    expect(orderTotals(s.cart).goods).toBe(8);
    expect(golferStatus(s, SENIOR, 'g2')).toMatchObject({ paid: false, due: orderTotals(s.cart).total });
  });
});

describe('the view', () => {
  it('opens on the league’s day and keeps a format per league', () => {
    let s = run(fresh(), { type: 'openLeague', groupId: MENS.groupId, tab: 'assign' });
    expect(s).toMatchObject({ view: 'league', leagueGroupId: MENS.groupId, leagueTab: 'assign' });
    expect(s.currentDate.getDate()).toBe(30);
    s = run(s, { type: 'setLeagueFormat', groupId: SENIOR.groupId, format: 'shotgun' });
    expect(s.leagueFormats).toEqual({ [SENIOR.groupId]: 'shotgun' });
  });

  it('does not open a league another club does not have', () => {
    const s = createInitialState({ venueId: 'nine' });
    expect(run(s, { type: 'openLeague', groupId: SENIOR.groupId })).toBe(s);
  });

  it('finds golfers by either name order, or their tee time', () => {
    expect(matchesGolfer('Girard, Justin', null, 'justin')).toBe(true);
    expect(matchesGolfer('Girard, Justin', null, 'justin gir')).toBe(true);
    expect(matchesGolfer('Alvarez, Johnny', '7:20 AM', '7:20')).toBe(true);
    expect(matchesGolfer('Alvarez, Johnny', '7:12 AM', '7:20')).toBe(false);
  });
});
