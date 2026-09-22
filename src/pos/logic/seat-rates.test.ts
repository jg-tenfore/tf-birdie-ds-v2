import { describe, expect, it } from 'vitest';
import { DEMO_NOW_MIN, DEMO_TODAY, createBookings, demoNow, fixturePrice, minutesOfDay } from '../data/bookings';
import { RATE_PRICING } from '../data/courses';
import { ALL_GOLFERS } from '../data/golfers';
import { venueBookings } from '../data/venues';
import { createInitialState, rateContext, reducer } from '../state/pos-store';
import type { Booking, Golfer } from '../types';
import { buildTeeTimeCart, cartTotals, orderTotals, payableTotal, seatCharges } from './cart';
import { seatCustomer, seatSuggestion } from './seat-customer';
import { TEE_PRICES } from '../data/courses';
import { MEMBER_RATE, bookingRowKey, rateBand, rateCardFee, seatIsMember, seatRateClass } from './rates';
import { assignPlayer, holesFee, playerFee, reservationDue, setPlayerFee, setPlayerHoles, setPlayerTransport } from './reservation';

/**
 * Weston Edits follow-ups (2): the rate class is the player's, the demo prices follow the
 * rate card, and "now" is one fixed demo clock.
 */

const apply = (b: Booking, patch: Partial<Booking>): Booking => ({ ...b, ...patch });
const rack = (band: 'early' | 'peak' | 'twilight') => RATE_PRICING[band].find((r) => r.rack)!;
const golfer = (id: string): Golfer => ALL_GOLFERS.find((g) => g.id === id)!;
const seat = () => ({ paid: false, step: -1, noShow: false });

/** A foursome at 11:00 AM (peak), booked under a name nobody in the roster has. */
const foursome = (status: Booking['status'], price: number, holes: '9H' | '18H' = '9H'): Booking => ({
  id: 'mix',
  date: '2026-05-21',
  course: 'champ-front',
  slot: 0,
  timeMin: 660,
  name: 'Nobody, A.',
  players: 4,
  cart: 'walking',
  status,
  phone: '',
  conf: status === 'member' ? 'M-1' : 'R-1',
  pay: 'open',
  price,
  holes,
  playerStates: [seat(), seat(), seat(), seat()],
});

/** Guest booking: seat 1 a member (Kim, David), seat 2 a guest record (Martinez), seat 3 unnamed. */
const guestGroup = (): Booking => {
  let b = foursome('booked', rack('peak').p9);
  b = apply(b, assignPlayer(b, 1, golfer('M005')));
  b = apply(b, assignPlayer(b, 2, golfer('G003')));
  return b;
};

/** Member booking: the same seats, but the booking is a member's at $0. */
const memberGroup = (): Booking => {
  let b = foursome('member', 0);
  b = apply(b, assignPlayer(b, 1, golfer('M005')));
  b = apply(b, assignPlayer(b, 2, golfer('G003')));
  return b;
};

describe('rate class per player', () => {
  it("reads each seat's membership from who is sitting there, else the booking", () => {
    const g = guestGroup();
    expect(g.playerStates.map((_, i) => seatIsMember(g, i))).toEqual([false, true, false, false]);
    const m = memberGroup();
    // The unnamed booker and "Guest 4" fall back to the member booking's class.
    expect(m.playerStates.map((_, i) => seatIsMember(m, i))).toEqual([true, true, false, true]);
    expect(seatRateClass(g, 1)).toBe(MEMBER_RATE);
    expect(seatRateClass(g, 2)).toBe(rack('peak').rate);
  });

  it("uses a named guest's own memberType when there is no record", () => {
    const b = foursome('booked', 46);
    b.guests = [{ name: 'Nobody, A.' }, { name: 'Stranger, Z.', memberType: 'annual' }, { name: 'Other, Y.', memberType: null }];
    expect(seatIsMember(b, 1)).toBe(true);
    expect(seatIsMember(b, 2)).toBe(false);
  });

  it('the booker is found by phone', () => {
    // Reed, Marcus is a monthly member; a guest booking under his phone seats him as a member.
    const b = { ...foursome('booked', 54, '18H'), name: 'Reed, M.', phone: '(555)201-3344' };
    expect(seatIsMember(b, 0)).toBe(true);
    expect(playerFee(b, 0)).toBe(0);
    expect(playerFee(b, 1)).toBe(54);
  });

  it('a mixed guest foursome: members at the member rate, guests at the booking rate', () => {
    const b = guestGroup();
    expect(b.playerStates.map((_, i) => playerFee(b, i))).toEqual([46, 0, 46, 46]);
    expect(reservationDue(b)).toBe(46 * 3);
    // The member switching to 18 stays on the membership row; a guest reads the rack 18.
    expect(playerFee(apply(b, setPlayerHoles(b, 1, 18)), 1)).toBe(0);
    expect(playerFee(apply(b, setPlayerHoles(b, 2, 18)), 2)).toBe(rack('peak').p18);
  });

  it('a mixed member foursome: the guest pays rack for the booked holes', () => {
    const b = memberGroup();
    expect(b.playerStates.map((_, i) => playerFee(b, i))).toEqual([0, 0, rack('peak').p9, 0]);
    expect(holesFee(b, 2, 18)).toBe(rack('peak').p18);
    expect(reservationDue(b)).toBe(rack('peak').p9);
  });

  it("a row's price override reprices guests, never a membership", () => {
    const b = memberGroup();
    const rates = { timePrices: { [bookingRowKey(b)]: { fee: 61 } } };
    expect(playerFee(b, 2, rates)).toBe(61);
    expect(playerFee(b, 1, rates)).toBe(0);
    expect(rateCardFee(b, 9, rates, MEMBER_RATE)).toBe(0);
  });

  it('the register charges the same per-seat fees, with the Member tag on members only', () => {
    for (const b of [guestGroup(), memberGroup()]) {
      const cart = buildTeeTimeCart(b);
      const players = cart[0].players!;
      const due = reservationDue(b);
      expect(payableTotal(cart) - cartTotals(cart).tax).toBe(due);
      players.forEach((p, i) => {
        expect(p.fee ?? cart[0].unitPrice).toBe(playerFee(b, i));
        expect(p.modifierTags.some((t) => t.name === 'Member Rate')).toBe(seatIsMember(b, i));
      });
    }
  });

  it('loadBooking prices from state, including a customer created this session', () => {
    const newMember: Golfer = { id: 'C900', name: 'Newby, Nora', phone: '(555) 999-0000', email: '', type: 'Member', memberType: 'annual', hcp: 10 };
    let b = foursome('booked', 46);
    b = apply(b, assignPlayer(b, 3, newMember));
    b = { ...b, guests: b.guests!.map((g, i) => (i === 3 ? { name: g.name, crmId: g.crmId } : g)) };
    let s = createInitialState({ venueId: 'eighteen', bookings: [b] });
    // Without the record, "Newby, Nora" is nobody — the booking's class.
    expect(playerFee(b, 3, rateContext(s))).toBe(46);
    s = reducer(s, { type: 'addGolfer', golfer: newMember });
    expect(playerFee(b, 3, rateContext(s))).toBe(0);
    s = reducer(s, { type: 'loadBooking', bookingId: b.id });
    expect(s.cart[0].players![3].fee).toBe(0);
  });
});

describe('membership from a linked record or phone — never a name', () => {
  it("a seat named like a member is a guest until the customer is linked", () => {
    const b = foursome('booked', 46);
    b.guests = [{ name: 'Nobody, A.' }, { name: 'Kim, D.' }, { name: 'Kim, David' }];
    // Name matches (abbreviated and exact) find nobody for pricing…
    expect(seatCustomer(b, 1, ALL_GOLFERS)).toBeUndefined();
    expect(seatCustomer(b, 2, ALL_GOLFERS)).toBeUndefined();
    expect(seatIsMember(b, 1)).toBe(false);
    expect(seatIsMember(b, 2)).toBe(false);
    expect(playerFee(b, 1)).toBe(46);
    expect(buildTeeTimeCart(b)[0].players![1].modifierTags.some((t) => t.name === 'Member Rate')).toBe(false);
    // …but are offered as a suggestion to link.
    expect(seatSuggestion(b, 1, ALL_GOLFERS)?.id).toBe('M005');
    expect(seatSuggestion(b, 3, ALL_GOLFERS)).toBeUndefined(); // unnamed "Guest 4"
    // Linking it is what makes the seat a member.
    const linked = apply(b, assignPlayer(b, 1, golfer('M005')));
    expect(seatIsMember(linked, 1)).toBe(true);
    expect(playerFee(linked, 1)).toBe(0);
    expect(seatSuggestion(linked, 1, ALL_GOLFERS)).toBeUndefined();
  });

  it("the booker's name is not a key either — their phone is", () => {
    const byName = { ...foursome('booked', 54, '18H'), name: 'Reed, M.', phone: '' };
    expect(seatIsMember(byName, 0)).toBe(false);
    expect(playerFee(byName, 0)).toBe(54);
    expect(seatSuggestion(byName, 0, ALL_GOLFERS)?.name).toMatch(/^Reed, M/);
    const byPhone = { ...byName, phone: '(555)201-3344' };
    expect(seatIsMember(byPhone, 0)).toBe(true);
    expect(seatSuggestion(byPhone, 0, ALL_GOLFERS)).toBeUndefined();
  });
});

describe('green-fee tax and cart fees per seat, by the seat\'s class', () => {
  const taxLine = (b: Booking) => buildTeeTimeCart(b).find((i) => i.isTax)?.price;
  const guestTax = TEE_PRICES.booked.tax;

  it("a member's $0 seat in a guest group carries no tax; each guest seat does", () => {
    const b = guestGroup(); // seat 1 a linked member, 0/2/3 guests at $46
    expect(b.playerStates.map((_, i) => seatCharges(b, i).tax)).toEqual([guestTax, 0, guestTax, guestTax]);
    expect(taxLine(b)).toBe(guestTax * 3);
    const t = orderTotals(buildTeeTimeCart(b));
    expect(t.golfTax).toBe(guestTax * 3);
    expect(t.total).toBe(46 * 3 + guestTax * 3);
  });

  it('a guest in a member booking pays the guest tax; the members pay none', () => {
    const b = memberGroup(); // seat 2 a linked guest record, the rest members at $0
    expect(b.playerStates.map((_, i) => seatCharges(b, i).tax)).toEqual([0, 0, guestTax, 0]);
    expect(taxLine(b)).toBe(guestTax);
    expect(orderTotals(buildTeeTimeCart(b)).total).toBe(rack('peak').p9 + guestTax);
  });

  it('an all-member party: $0 tax, and the golf still isn\'t charged sales tax', () => {
    const b = { ...foursome('member', 0), cart: 'cart' as const };
    const cart = buildTeeTimeCart(b);
    expect(taxLine(b)).toBe(0);
    const t = orderTotals(cart);
    expect(t.golfTax).toBe(0);
    expect(t.salesTax).toBe(0);
    expect(t.total).toBe(TEE_PRICES.member.cartFee * 4);
  });

  it('cart fees follow each seat\'s class and transport', () => {
    // A walk-in: guests on the walk-in row ($18 riding), a linked member on the member row ($20).
    let b = foursome('walkin', 46);
    b = apply(b, assignPlayer(b, 1, golfer('M005')));
    b = apply(b, setPlayerTransport(b, 0, 'cart'));
    b = apply(b, setPlayerTransport(b, 1, 'cart'));
    b = apply(b, setPlayerTransport(b, 2, 'push'));
    const players = buildTeeTimeCart(b)[0].players!;
    const transportFee = (i: number) => players[i].modifierTags.find((t) => t.isTransport)?.p;
    expect(transportFee(0)).toBe(TEE_PRICES.walkin.cartFee);
    expect(transportFee(1)).toBe(TEE_PRICES.member.cartFee);
    expect(transportFee(2)).toBe(5);
    expect(transportFee(3)).toBeUndefined();
    // Walk-in guest tax on the three paying guests; none on the member.
    expect(taxLine(b)).toBe(TEE_PRICES.walkin.tax * 3);
  });

  it('a guest riding in a member booking pays the guest cart fee', () => {
    let b = memberGroup();
    b = apply(b, setPlayerTransport(b, 2, 'cart'));
    const fee = buildTeeTimeCart(b)[0].players![2].modifierTags.find((t) => t.isTransport)?.p;
    expect(fee).toBe(TEE_PRICES.booked.cartFee);
  });

  it('paid and no-show seats add no tax; a member with a typed fee is taxed', () => {
    let b = guestGroup();
    b = { ...b, playerStates: b.playerStates.map((p, i) => (i === 0 ? { ...p, paid: true } : i === 3 ? { ...p, noShow: true } : p)) };
    expect(taxLine(b)).toBe(guestTax); // only seat 2
    const typed = apply(b, setPlayerFee(b, 1, 20));
    expect(seatCharges(typed, 1).tax).toBe(TEE_PRICES.member.tax);
    expect(taxLine(typed)).toBe(guestTax + TEE_PRICES.member.tax);
  });

  it('the reservation panel total (the cart) equals the register total', () => {
    for (const b of [guestGroup(), memberGroup()]) {
      let s = createInitialState({ venueId: 'eighteen', bookings: [b] });
      const panel = orderTotals(buildTeeTimeCart(b, s.courses, rateContext(s))).total;
      s = reducer(s, { type: 'loadBooking', bookingId: b.id });
      expect(orderTotals(s.cart).total).toBe(panel);
    }
  });
});

describe('demo prices follow the rate card', () => {
  const priced = createBookings().filter((b) => b.price > 0);

  it('every priced fixture is the card price for its holes, band and class', () => {
    expect(priced.length).toBeGreaterThan(100);
    for (const b of priced) expect(b.price).toBe(rateCardFee(b, b.holes === '18H' ? 18 : 9));
  });

  it("no 9-hole fixture costs more than the card's 18 for its band and class", () => {
    for (const b of createBookings().filter((x) => x.holes === '9H')) {
      expect(b.price).toBeLessThanOrEqual(rateCardFee(b, 18));
    }
  });

  it('switching a nine to 18 never lowers a fixture fee, on any seat', () => {
    for (const id of ['eighteen', 'three-nines', 'nine'] as const) {
      for (const b of venueBookings(id).filter((x) => x.holes === '9H')) {
        b.playerStates.forEach((_, i) => {
          expect(holesFee(b, i, 18)).toBeGreaterThanOrEqual(holesFee(b, i, 9));
          expect(playerFee(apply(b, setPlayerHoles(b, i, 18)), i)).toBeGreaterThanOrEqual(playerFee(b, i));
        });
      }
    }
  });

  it('keeps $0 at $0 and is deterministic', () => {
    expect(fixturePrice({ status: 'member', timeMin: 660, date: '2026-05-21', price: 0, holes: '18H' })).toBe(0);
    expect(fixturePrice({ status: 'block', timeMin: 660, date: '2026-05-21', price: 0, holes: '' })).toBe(0);
    expect(fixturePrice({ status: 'booked', timeMin: 900, date: '2026-05-21', price: 59, holes: '9H' })).toBe(rack('twilight').p9);
    expect(JSON.stringify(createBookings())).toBe(JSON.stringify(createBookings()));
  });
});

describe('one demo "now"', () => {
  it('is DEMO_NOW_MIN on DEMO_TODAY, every time', () => {
    const now = demoNow();
    expect(now.toDateString()).toBe(DEMO_TODAY().toDateString());
    expect(minutesOfDay(now)).toBe(DEMO_NOW_MIN);
    expect(demoNow().getTime()).toBe(now.getTime());
    expect(rateBand(minutesOfDay(now))).toBe('peak');
  });

  it('stamps payments with the demo clock', () => {
    let s = createInitialState({ venueId: 'eighteen' });
    s = reducer(s, { type: 'addItem', name: 'Water', price: 2.5 });
    s = reducer(s, { type: 'recordPayment', method: 'card', amount: 2.5 });
    expect(s.lastPayment?.time).toBe('12:00 PM');
  });
});
