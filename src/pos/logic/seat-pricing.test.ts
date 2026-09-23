import { describe, expect, it } from 'vitest';
import { TRANSPORT_RATES, transportById } from '../data/rate-catalog';
import { roster } from '../data/roster';
import { buildTeeTimeCart, orderTotals } from './cart';
import { COURSES } from '../data/courses';
import { createInitialState, reducer } from '../state/pos-store';

/** The demo's own courses, so a fixture booking resolves to one. */
const ALL_COURSES_FOR_TEST = COURSES;
import { availableCarts, signedOutCarts } from '../data/carts';
import type { Booking } from '../types';
import {
  applyPunchCard,
  clearPunchCard,
  clearPlayerDiscount,
  playerFee,
  playerTransport,
  resetPlayerRate,
  returnCart,
  setGroupRate,
  setPlayerDiscount,
  setPlayerHoles,
  reservationDue,
  reservationSettled,
  setPlayerRate,
  setPlayerTransportFee,
  setPlayerTransportRate,
  signOutCart,
} from './reservation';
import {
  seatCanSwitchHoles,
  seatNetGreenFee,
  seatPrice,
  seatRate,
  seatRateGrid,
  seatRecord,
  seatTransportFee,
  seatUsesPunch,
} from './seat-pricing';

/**
 * Weston Edits follow-ups (3): a seat is sold on a named rate, transport is priced, and a
 * discount leaves a reason behind.
 *
 * The load-bearing property is the last group: a booking nobody has touched must price exactly
 * as it did before the catalog existed. Two hundred authored bookings and every test written
 * against them depend on it.
 */

const apply = (b: Booking, patch: Partial<Booking>): Booking => ({ ...b, ...patch });
const seat = () => ({ paid: false, step: -1, noShow: false });

/** A guest foursome at 11:00 AM on Thursday May 21 — peak, 18 holes, rack rate. */
const foursome = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  date: '2026-05-21',
  course: 'champ-front',
  slot: 0,
  timeMin: 660,
  name: 'Nobody, X.',
  players: 4,
  cart: 'cart',
  status: 'booked',
  phone: '(555)000-0000',
  conf: 'R-9001',
  pay: 'open',
  price: 72,
  holes: '18H',
  playerStates: [seat(), seat(), seat(), seat()],
  ...over,
});

describe('the rate grid', () => {
  it('offers what this slot sells, and pre-picks rack for a seat nobody is identified on', () => {
    const b = foursome();
    const grid = seatRateGrid(b, 18);
    expect(grid.length).toBeGreaterThan(0);
    expect(seatRate(b, 1)?.rack).toBe(true);
  });

  it('pre-picks a member their membership rate once the seat is linked', () => {
    const member = roster.find((c) => c.memberships.some((m) => m.name === 'Full Golf'))!;
    const b = foursome({ guests: [{ name: 'x' }, { name: member.displayName, crmId: member.id }] });
    expect(seatRecord(b, 1)?.id).toBe(member.id);
    expect(seatRate(b, 1)?.name).toBe('Membership 7 Days');
  });

  it('never prices a seat off its name alone', () => {
    // The seat is called exactly what a member is called, but nothing is linked. It pays rack.
    const member = roster.find((c) => c.memberships.some((m) => m.name === 'Full Golf'))!;
    const b = foursome({ guests: [{ name: 'x' }, { name: member.displayName }] });
    expect(seatRecord(b, 1)).toBeNull();
    expect(seatRate(b, 1)?.rack).toBe(true);
  });
});

describe('choosing a rate', () => {
  it('reprices the seat from the catalog', () => {
    const b = foursome();
    const junior = seatRateGrid(b, 18).find((r) => r.name === 'Weekday Junior')!;
    const next = apply(b, setPlayerRate(b, 1, junior.id));
    expect(playerFee(next, 1)).toBe(junior.p18);
    expect(playerFee(next, 2)).toBe(72); // everyone else is untouched
  });

  it('does not pin a choice that matches what the system already picked', () => {
    const b = foursome();
    const auto = seatRate(b, 1)!;
    const next = apply(b, setPlayerRate(b, 1, auto.id));
    expect(next.playerStates[1].rateId).toBeUndefined();
  });

  it('keeps the rate across a 9 ↔ 18 switch and charges that rate for the new length', () => {
    const b = foursome();
    const junior = seatRateGrid(b, 18).find((r) => r.name === 'Weekday Junior')!;
    const chosen = apply(b, setPlayerRate(b, 1, junior.id));
    const switched = apply(chosen, setPlayerHoles(chosen, 1, 9));
    expect(seatRate(switched, 1)?.name).toBe('Weekday Junior');
    expect(playerFee(switched, 1)).toBe(junior.p9);
  });

  it('lets staff type over the rate, and reset comes back to it', () => {
    const b = foursome();
    const junior = seatRateGrid(b, 18).find((r) => r.name === 'Weekday Junior')!;
    let next = apply(b, setPlayerRate(b, 1, junior.id));
    next = apply(next, { playerStates: next.playerStates.map((p, j) => (j === 1 ? { ...p, fee: 12 } : p)) });
    expect(playerFee(next, 1)).toBe(12);
    next = apply(next, resetPlayerRate(next, 1));
    expect(playerFee(next, 1)).toBe(72); // back to what the system picks
  });

  it('puts the whole group on one rate, skipping paid seats', () => {
    const b = foursome({
      playerStates: [seat(), { ...seat(), paid: true }, seat(), seat()],
    });
    const junior = seatRateGrid(b, 18).find((r) => r.name === 'Weekday Junior')!;
    const next = apply(b, setGroupRate(b, junior.id));
    expect(next.playerStates[0].rateId).toBe(junior.id);
    expect(next.playerStates[1].rateId).toBeUndefined();
    expect(next.playerStates[3].rateId).toBe(junior.id);
  });
});

describe('transport', () => {
  it('charges a trail fee for walking — the case a walk/ride toggle cannot express', () => {
    const b = foursome({ cart: 'walking' });
    expect(seatTransportFee(b, 0)).toBeGreaterThan(0);
  });

  it('moves the seat to the row s mode, so the toggle and the tiles cannot disagree', () => {
    const b = foursome({ cart: 'cart' });
    const walking = TRANSPORT_RATES.find((t) => t.id === 'tr-walking')!;
    const next = apply(b, setPlayerTransportRate(b, 1, walking.id));
    expect(playerTransport(next, 1)).toBe('walking');
    expect(seatTransportFee(next, 1)).toBe(walking.price);
  });

  it('does not sell a punch-card transport row — a punch buys the round, not the ride', () => {
    expect(transportById('tr-punch-cart')).toBeNull();
  });

  it('lets staff type over the transport price', () => {
    const b = foursome();
    const next = apply(b, setPlayerTransportFee(b, 1, 10));
    expect(seatTransportFee(next, 1)).toBe(10);
  });
});

describe('punch cards', () => {
  it('settles the round and leaves transport on the bill', () => {
    const b = foursome();
    const holder = roster.find((c) => c.punchCards.some((p) => p.remaining > 0))!;
    const card = holder.punchCards[0];
    const next = apply(b, applyPunchCard(b, 1, holder.id, card.name));
    const p = seatPrice(next, 1, playerFee(next, 1));
    expect(seatUsesPunch(next, 1)).toBe(true);
    expect(p.greenFee).toBe(0);
    // The ride is still charged — this is the half the old "Free Punch Cart" row conflated.
    expect(p.transportFee).toBeGreaterThan(0);
    expect(p.total).toBe(p.transportFee);
  });

  it('carries whose card paid, so a member can cover a guest', () => {
    const b = foursome();
    const holder = roster.find((c) => c.punchCards.some((x) => x.remaining > 0))!;
    const next = apply(b, applyPunchCard(b, 1, holder.id, holder.punchCards[0].name));
    expect(seatPrice(next, 1, playerFee(next, 1)).punch?.customerId).toBe(holder.id);
  });

  it('reprices to its rate when the punch is taken back off', () => {
    const b = foursome();
    const holder = roster.find((c) => c.punchCards.some((x) => x.remaining > 0))!;
    let next = apply(b, applyPunchCard(b, 1, holder.id, holder.punchCards[0].name));
    next = apply(next, clearPunchCard(next, 1));
    expect(seatPrice(next, 1, playerFee(next, 1)).greenFee).toBe(72);
  });
});

describe('a rate sold for one length only', () => {
  it('blocks the switch rather than dropping the player somewhere else', () => {
    const b = foursome();
    const premium = seatRateGrid(b, 18, { catalog: 'heavy' }).find((r) => r.name === 'Premium Single')!;
    const on = apply(b, { playerStates: b.playerStates.map((p, j) => (j === 1 ? { ...p, rateId: premium.id } : p)) });
    expect(seatCanSwitchHoles(on, 1, 9, { catalog: 'heavy' })).toBe(false);
    expect(seatCanSwitchHoles(on, 1, 18, { catalog: 'heavy' })).toBe(true);
  });

  it('leaves a seat on an unrestricted rate free to switch', () => {
    const b = foursome();
    expect(seatCanSwitchHoles(b, 1, 9)).toBe(true);
  });
});

describe('discounts', () => {
  it('comps a seat to nothing and says why', () => {
    const b = foursome();
    const next = apply(b, setPlayerDiscount(b, 1, 'disc-comp'));
    const p = seatPrice(next, 1, playerFee(next, 1));
    expect(p.greenFee).toBe(0);
    expect(p.reason).toBe('Comped');
  });

  it('takes a percentage off the seat s own fee', () => {
    const b = foursome();
    const next = apply(b, setPlayerDiscount(b, 1, 'disc-50'));
    expect(seatPrice(next, 1, playerFee(next, 1)).greenFee).toBe(36);
  });

  it('clears cleanly', () => {
    const b = foursome();
    let next = apply(b, setPlayerDiscount(b, 1, 'disc-comp'));
    next = apply(next, clearPlayerDiscount(next, 1));
    expect(seatPrice(next, 1, playerFee(next, 1)).greenFee).toBe(72);
  });
});

describe('cart signout', () => {
  it('hands out a key and puts the player in a cart', () => {
    const b = foursome({ cart: 'walking' });
    const next = apply(b, signOutCart(b, 1, 14));
    expect(next.playerStates[1].cartKey).toBe(14);
    expect(playerTransport(next, 1)).toBe('cart');
  });

  it('takes the cart out of circulation until it is returned', () => {
    const b = foursome();
    const out = apply(b, signOutCart(b, 1, 14));
    expect(availableCarts([out])).not.toContain(14);
    const back = apply(out, returnCart(out, 1));
    expect(signedOutCarts([back])).toEqual([]);
  });
});

describe('a booking nobody has touched', () => {
  it('prices exactly as it did before the catalog existed', () => {
    // The load-bearing case. No rateId anywhere means the booking's own rate, not the
    // catalog's idea of what this person should pay.
    const b = foursome();
    for (let i = 0; i < 4; i++) expect(playerFee(b, i)).toBe(72);
  });

  it('still shows a rate name, so the row can print one', () => {
    const b = foursome();
    expect(seatRate(b, 0)?.name).toBeTruthy();
  });

  it('keeps a comped booking comped', () => {
    const b = foursome({ price: 0 });
    expect(playerFee(b, 0)).toBe(0);
  });
});

describe('what the row says and what the register charges', () => {
  /**
   * The bug this group exists to prevent.
   *
   * Round 3 added three ways for a seat's price to move — a discount, a punch card, a chosen
   * transport row — and all three were display-only when first built: the player row read
   * $0.00 while Check in & pay and the register's Pay still charged the full green fee. The
   * reservation's own "due" figure disagreed with the row directly above it.
   *
   * So every one of them is asserted end to end here: the row, the reservation total, and the
   * order the register would actually take.
   */
  const orderTotal = (x: Booking) => orderTotals(buildTeeTimeCart(x)).total;

  it('takes a comped seat off the order, not just off the row', () => {
    const b = foursome();
    const comped = apply(b, setPlayerDiscount(b, 1, 'disc-comp'));
    expect(seatPrice(comped, 1, playerFee(comped, 1)).greenFee).toBe(0);
    expect(reservationDue(comped)).toBe(reservationDue(b) - 72);
    expect(orderTotal(comped)).toBeLessThan(orderTotal(b));
  });

  it('takes a punch-paid round off the order', () => {
    const b = foursome();
    const holder = roster.find((c) => c.punchCards.some((p) => p.remaining > 0))!;
    const punched = apply(b, applyPunchCard(b, 1, holder.id, holder.punchCards[0].name));
    expect(reservationDue(punched)).toBe(reservationDue(b) - 72);
    expect(orderTotal(punched)).toBeLessThan(orderTotal(b));
  });

  it('charges no green-fee tax on a seat with no green fee', () => {
    const b = foursome();
    const comped = apply(b, setPlayerDiscount(b, 1, 'disc-comp'));
    expect(orderTotals(buildTeeTimeCart(comped)).tax).toBeLessThan(
      orderTotals(buildTeeTimeCart(b)).tax,
    );
  });

  it('bills the transport row the counter actually picked', () => {
    const b = foursome();
    const plus = apply(b, setPlayerTransportRate(b, 1, 'tr-cart-plus'));
    expect(orderTotal(plus)).toBeGreaterThan(orderTotal(b));
  });

  it('leaves an untouched booking priced exactly as before', () => {
    // The other half of the rule: the catalog takes over only once someone picks something.
    const b = foursome();
    expect(orderTotal(b)).toBe(orderTotal(foursome()));
    expect(reservationDue(b)).toBe(72 * 4);
  });
});

describe('the row agrees with the total above it', () => {
  /**
   * The third outing of the same fault, so it gets its own group.
   *
   * Round 3 kept shipping surfaces that showed a seat's *rate* while the number beside them
   * showed what was actually owed. It happened in the cart, then on the phone's order screen,
   * then on the Financial tab — a comped seat printing $54.00 on its row while the balance
   * above it had already dropped by $54.00.
   */
  it('prices a comped seat at nothing everywhere that reports it', () => {
    const b = foursome();
    const comped = apply(b, setPlayerDiscount(b, 1, 'disc-comp'));
    const rate = playerFee(comped, 1);
    expect(rate).toBe(72); // the rate is unchanged — that is the point
    expect(seatNetGreenFee(comped, 1, rate)).toBe(0);
    expect(reservationDue(comped)).toBe(reservationDue(b) - 72);
  });

  it('prices a punch-paid seat at nothing everywhere that reports it', () => {
    const b = foursome();
    const holder = roster.find((c) => c.punchCards.some((p) => p.remaining > 0))!;
    const punched = apply(b, applyPunchCard(b, 1, holder.id, holder.punchCards[0].name));
    expect(seatNetGreenFee(punched, 1, playerFee(punched, 1))).toBe(0);
    expect(reservationDue(punched)).toBe(reservationDue(b) - 72);
  });
});

describe('a refund gives the money back on the seats', () => {
  /**
   * Refunding moved the booking's badge but left every `playerStates[].paid` true, so a
   * refunded booking reopened in the reservation still read "Paid in full · nothing due" and
   * offered "Open in register" — insisting it had been paid for a round just refunded.
   */
  it('leaves nothing settled after a whole-group refund', () => {
    const paid = foursome({
      pay: 'paid',
      playerStates: [
        { ...seat(), paid: true },
        { ...seat(), paid: true },
        { ...seat(), paid: true },
        { ...seat(), paid: true },
      ],
    });
    expect(reservationSettled(paid)).toBe(true);
    const refunded = apply(paid, {
      pay: 'refund',
      playerStates: paid.playerStates.map((p) => ({ ...p, paid: false })),
    });
    expect(reservationSettled(refunded)).toBe(false);
    expect(reservationDue(refunded)).toBe(72 * 4);
  });
});

describe('a split order follows the reservation', () => {
  /**
   * Seats added one at a time were priced when they were added and never again, so comping a
   * seat already on the order left the register charging the old amount. The phone had a
   * re-sync on its order screen; the terminal had none.
   */
  it('reprices a seat already on the order when the reservation changes', () => {
    const b = foursome();
    let s = createInitialState({ bookings: [b], courses: ALL_COURSES_FOR_TEST });
    s = reducer(s, { type: 'addSeatToOrder', bookingId: b.id, seat: 0 });
    s = reducer(s, { type: 'addSeatToOrder', bookingId: b.id, seat: 1 });
    const before = orderTotals(s.cart).total;

    s = reducer(s, {
      type: 'patchBooking',
      bookingId: b.id,
      patch: setPlayerDiscount(s.bookings.find((x) => x.id === b.id)!, 1, 'disc-comp'),
    });

    expect(orderTotals(s.cart).total).toBeLessThan(before);
    // And it is still a two-seat order — repricing must not quietly widen it to the party.
    expect(s.orderSeats).toEqual([0, 1]);
  });
});
