import { describe, expect, it } from 'vitest';
import { bookingName, isMember, memberTierOf } from './customers';
import {
  autoRate,
  catalogRates,
  discountAmount,
  discountById,
  eligibleRates,
  isEligible,
  price,
  ratesForTeeTime,
  transportById,
  TRANSPORT_RATES,
} from './rate-catalog';
import { availableCarts, cartHolder, CART_FLEET, signedOutCarts } from './carts';
import { isRedeemable, rainCheckBalance, rainChecks, raincheckValue } from './rain-checks';
import { customerForName, customerForPhone, roster, searchRoster } from './roster';
import { SHEET_NAMES } from './sheet-names';
import type { Booking } from '../types';

/**
 * Weston Edits follow-ups (3): the customer database, the rate catalog and the cart fleet.
 *
 * The rule these all serve is the one Weston stated on the call — the tiles show "every rate
 * you could possibly have for this specific tee time on this specific date", and the system
 * pre-picks what the player is owed. Everything below is that sentence, split into the parts
 * that can be wrong independently.
 */

const THURSDAY = new Date(2026, 4, 21);
const SUNDAY = new Date(2026, 4, 24);

describe('roster', () => {
  it('resolves every name that can appear on a tee sheet', () => {
    const unresolved = SHEET_NAMES.filter((n) => !customerForName(n));
    expect(unresolved).toEqual([]);
  });

  it('keeps the hand-authored records, so search still has its awkward cases', () => {
    // Three Brennevins and two Kuznetsovs — a search that cannot tell them apart is the bug.
    expect(roster.filter((c) => c.lastName === 'Brennevin').length).toBeGreaterThanOrEqual(3);
    expect(searchRoster('hamlet').map((c) => c.displayName)).toContain('Jonah Hamlet - Trial Month');
  });

  it('is deterministic — the same name always reads the same way', () => {
    const a = customerForName('Adams, D.');
    const b = customerForName('Adams, D.');
    expect(a).toBe(b);
    expect(a?.firstName).toBe('Daniel');
  });

  it('gives a member a tier and a non-member none', () => {
    const member = roster.find(isMember)!;
    expect(memberTierOf(member)).not.toBeNull();
    const guest = roster.find((c) => !isMember(c))!;
    expect(memberTierOf(guest)).toBeNull();
  });

  it('finds a booker by phone however the number is punctuated', () => {
    const c = roster.find((x) => x.phone)!;
    const digits = c.phone as string;
    const pretty = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    expect(customerForPhone(pretty)?.phone).toBe(digits);
  });

  it('resolves a shared household number to the member', () => {
    // Two records, one number. Whichever sorted first would otherwise decide how the booking
    // prices — and a member's round falling to rack because their partner sorted earlier is the
    // exact bug this round exists to kill.
    const counts = new Map<string, number>();
    for (const c of roster) {
      if (c.phone) counts.set(c.phone, (counts.get(c.phone) ?? 0) + 1);
    }
    const shared = [...counts.entries()].find(
      ([phone, n]) => n > 1 && roster.some((c) => c.phone === phone && isMember(c)),
    );
    // The ported records contain households on purpose; if that ever stops being true the
    // assertion below is meaningless, so fail loudly rather than pass vacuously.
    expect(shared).toBeTruthy();
    expect(isMember(customerForPhone(shared![0]) as never)).toBe(true);
  });

  it('leaves a league or an outing with nobody behind it', () => {
    expect(customerForName('Course Maintenance')).toBeNull();
  });
});

describe('rate catalog', () => {
  it('offers only the rates sold at this tee time, not the whole catalog', () => {
    // A weekday-only rate is not sellable on a Sunday, whatever the customer qualifies for.
    const thu = ratesForTeeTime('peak', THURSDAY, 18, 'heavy').map((r) => r.name);
    const sun = ratesForTeeTime('peak', SUNDAY, 18, 'heavy').map((r) => r.name);
    expect(thu).toContain('Weekday Resident');
    expect(sun).not.toContain('Weekday Resident');
    expect(sun).toContain('Weekend Resident');
  });

  it('drops a band-restricted rate outside its band', () => {
    const peak = ratesForTeeTime('peak', THURSDAY, 18, 'heavy').map((r) => r.name);
    const twilight = ratesForTeeTime('twilight', THURSDAY, 18, 'heavy').map((r) => r.name);
    expect(peak).not.toContain('Replay');
    expect(twilight).toContain('Replay');
  });

  it('drops an 18-only rate from a 9-hole slot', () => {
    const h18 = ratesForTeeTime('peak', THURSDAY, 18, 'heavy').map((r) => r.name);
    const h9 = ratesForTeeTime('peak', THURSDAY, 9, 'heavy').map((r) => r.name);
    expect(h18).toContain('Premium Single');
    expect(h9).not.toContain('Premium Single');
  });

  it('never prices a nine above the eighteen, in any band', () => {
    for (const band of ['early', 'peak', 'twilight'] as const) {
      for (const r of catalogRates(band, 'heavy')) {
        expect(r.p9).toBeLessThanOrEqual(r.p18);
      }
    }
  });

  it('never prices twilight above peak', () => {
    const peak = new Map(catalogRates('peak', 'heavy').map((r) => [r.name, r.p18]));
    for (const r of catalogRates('twilight', 'heavy')) {
      expect(r.p18).toBeLessThanOrEqual(peak.get(r.name) as number);
    }
  });

  it('qualifies a member for their membership rate and a stranger for none of it', () => {
    const rates = ratesForTeeTime('peak', THURSDAY, 18, 'standard');
    const full = roster.find((c) => c.memberships.some((m) => m.name === 'Full Golf'))!;
    expect(eligibleRates(rates, full, 18).map((r) => r.name)).toContain('Membership 7 Days');
    // Nobody at all still sees the rack rate, because rack is open to everyone.
    expect(eligibleRates(rates, null, 18).map((r) => r.name)).toEqual(['Weekday Non Resident']);
  });

  it('picks the best rate the player qualifies for', () => {
    const rates = ratesForTeeTime('peak', THURSDAY, 18, 'standard');
    const full = roster.find((c) => c.memberships.some((m) => m.name === 'Full Golf'))!;
    expect(autoRate(rates, full, 18)?.name).toBe('Membership 7 Days');
    expect(price(autoRate(rates, full, 18)!, 18)).toBe(0);
  });

  it('falls back to rack for a seat nobody is identified on', () => {
    const rates = ratesForTeeTime('peak', THURSDAY, 18, 'standard');
    expect(autoRate(rates, null, 18)?.rack).toBe(true);
  });

  it('still offers an ineligible rate as a tile — staff can override', () => {
    const rates = ratesForTeeTime('peak', THURSDAY, 18, 'standard');
    const employeeRate = rates.find((r) => r.name === 'Employee')!;
    const stranger = roster.find((c) => c.customerTypes.length === 0 && !isMember(c))!;
    expect(isEligible(employeeRate, stranger)).toBe(false);
    // But it is in the grid, because the counter can put anyone on it.
    expect(rates).toContain(employeeRate);
  });

  it('sells a heavy catalog without losing rates to the filter', () => {
    expect(catalogRates('peak', 'heavy')).toHaveLength(26);
    expect(ratesForTeeTime('peak', THURSDAY, 18, 'heavy').length).toBeGreaterThan(20);
  });
});

describe('transport', () => {
  it('charges for walking, which a walk/ride toggle cannot express', () => {
    const walking = TRANSPORT_RATES.find((t) => t.id === 'tr-walking')!;
    expect(walking.mode).toBe('walking');
    expect(walking.price).toBeGreaterThan(0);
  });

  it('keeps a member cart at nothing and a punch cart off the bill', () => {
    expect(transportById('tr-member-cart')?.price).toBe(0);
    expect(transportById('tr-punch-cart')?.punchCard).toBe('any');
  });

  it('has exactly one default per mode, so the toggle is never ambiguous', () => {
    for (const mode of ['walking', 'cart', 'push'] as const) {
      expect(TRANSPORT_RATES.filter((t) => t.mode === mode && t.default)).toHaveLength(1);
    }
  });
});

describe('discounts', () => {
  it('comps a seat to nothing', () => {
    expect(discountAmount(discountById('disc-comp'), 58)).toBe(58);
  });

  it('takes a percentage off', () => {
    expect(discountAmount(discountById('disc-50'), 58)).toBe(29);
    expect(discountAmount(discountById('disc-25'), 58)).toBe(14.5);
  });

  it('never discounts more than the fee', () => {
    expect(discountAmount(discountById('disc-manual'), 20, 80)).toBe(20);
  });

  it('carries a reason, so a $0 seat says why', () => {
    expect(discountById('disc-comp')?.reason).toBe('Comped');
  });
});

describe('cart fleet', () => {
  const booking = (id: string, keys: Array<number | undefined>): Booking =>
    ({
      id,
      date: '2026-05-21',
      course: 'champ-front',
      slot: 0,
      timeMin: 600,
      name: 'Adams, D.',
      players: keys.length,
      cart: 'cart',
      status: 'booked',
      phone: '',
      conf: 'R-1',
      pay: 'open',
      price: 58,
      holes: '18H',
      playerStates: keys.map((k) => ({ paid: false, step: -1, noShow: false, cartKey: k })),
    }) as Booking;

  it('reads what is out off the bookings themselves', () => {
    const day = [booking('a', [14, undefined]), booking('b', [21])];
    expect(signedOutCarts(day).map((s) => s.cart)).toEqual([14, 21]);
  });

  it('does not offer a cart that is already out', () => {
    const day = [booking('a', [14])];
    expect(availableCarts(day)).not.toContain(14);
    expect(availableCarts(day)).toContain(15);
  });

  it('says who has a cart, so the counter can chase it', () => {
    const day = [booking('a', [14])];
    expect(cartHolder(14, day)?.bookingId).toBe('a');
    expect(cartHolder(15, day)).toBeNull();
  });

  it('skips 13, the way fleets do', () => {
    expect(CART_FLEET).not.toContain(13);
  });
});

describe('rain checks', () => {
  it('returns the whole round when nothing was played, and a fraction otherwise', () => {
    expect(raincheckValue(72, 18, 0)).toBe(72);
    expect(raincheckValue(72, 18, 9)).toBe(36);
    expect(raincheckValue(72, 18, 17)).toBe(4);
    expect(raincheckValue(72, 18, 18)).toBe(0);
  });

  it('gives one customer two credits, so the picker has to exist', () => {
    const counts = new Map<string, number>();
    for (const r of rainChecks) counts.set(r.customerId, (counts.get(r.customerId) ?? 0) + 1);
    expect([...counts.values()].some((n) => n >= 2)).toBe(true);
  });

  it('is sparse — most golfers have never had one', () => {
    expect(rainChecks.length).toBeLessThan(roster.length / 4);
  });

  it('says where a partly-spent credit went', () => {
    const spent = rainChecks.find((r) => r.spent > 0)!;
    expect(spent.redemptions?.[0].what).toBeTruthy();
    expect(spent.redemptions?.[0].amount).toBeCloseTo(spent.spent, 2);
  });

  it('only counts live credits towards what the course owes', () => {
    const holder = rainChecks.find((r) => r.balance > 0)!;
    const owed = rainCheckBalance(holder.customerId);
    const live = rainChecks
      .filter((r) => r.customerId === holder.customerId && isRedeemable(r))
      .reduce((s, r) => s + r.balance, 0);
    expect(owed).toBeCloseTo(live, 2);
  });

  it('names the credit holder the way a booking would', () => {
    const r = rainChecks[0];
    const c = roster.find((x) => x.id === r.customerId)!;
    expect(r.customerName).toBe(bookingName(c));
  });
});
