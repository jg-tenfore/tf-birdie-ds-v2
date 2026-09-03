import { TIMES } from '../data/courses';
import { buildVenue, venue, venueBookings } from '../data/venues';
import { buildTeeTimeCart } from '../logic/cart';
import type { Booking } from '../types';
import type { PosState } from './pos-store';

/**
 * Named starting states for the POS.
 *
 * These live in app-land rather than in Storybook because two things consume them:
 * the screen stories, and the prototype's deep links (`?order=walkin`). Keeping one
 * definition means a link and a story that claim to show "a walk-in mid-build" show
 * the same thing.
 *
 * A scenario exists for any state you can't reach by describing a few flags — chiefly
 * anything with a *cart*, since half the dialogs (checkout, modifiers, guest details,
 * the tee picker) render as empty shells without one.
 */

// ─── Shared demo data ───────────────────────────────────────────────────────

/**
 * The demo booking set for the build's venue.
 *
 * Delegates to `venueBookings`, which memoizes per venue — generating the 11-day window is
 * not free and every provider and story would otherwise redo it. Sharing one array is safe:
 * the reducer only ever replaces bookings immutably, so no consumer can mutate another's.
 */
export const demoBookings = (): Booking[] => venueBookings(buildVenue());

/** Find a booking on a given date matching a predicate, falling back to the first. */
export function findBooking(
  bookings: Booking[],
  dateStr: string,
  predicate: (b: Booking) => boolean,
): Booking {
  const day = bookings.filter((b) => b.date === dateStr);
  // The fallback keeps a link or story renderable if the generator's distribution
  // shifts, rather than blowing up on an id that no longer exists.
  return day.find(predicate) ?? day[0];
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

/** A tee-sheet booking loaded into the register. */
export function withLoadedBooking(
  booking: Booking,
  extra: Partial<PosState> = {},
): Partial<PosState> {
  return {
    bookings: demoBookings(),
    view: 'pos',
    selectedBookingId: booking.id,
    cart: buildTeeTimeCart(booking),
    ...extra,
  };
}

/**
 * A walk-in mid-build: a three-player 18-hole guest rate with a tee time attached, two
 * players named from the CRM and one still an unnamed seat, one carrying a military
 * discount, plus a retail line.
 *
 * Deliberately uneven — a foursome where every seat costs the same wouldn't exercise the
 * per-player pricing that the cart is built around.
 */
export function withWalkInOrder(extra: Partial<PosState> = {}): Partial<PosState> {
  const course = venue(buildVenue()).courses[0];
  const slot = TIMES.find((t) => t.totalMin === 8 * 60 + 24)!;
  return {
    bookings: demoBookings(),
    view: 'pos',
    flowMode: 'walkin',
    currentCategory: 'CHECK IN',
    cart: [
      {
        name: 'Guest Rate 18 Holes',
        unitPrice: 59,
        price: 177,
        qty: 3,
        isCheckIn: true,
        teeTime: {
          courseId: course.id,
          courseName: course.name,
          timeMin: slot.totalMin,
          label: slot.label,
        },
        players: [
          {
            name: 'Whitfield, Gerald',
            transport: 'cart',
            modifierTags: [
              { name: 'Riding Cart', tag: 'CART', tagColor: '#1d4ed8', p: 20, isTransport: true },
            ],
          },
          {
            name: 'Okafor, James',
            transport: 'cart',
            modifierTags: [
              { name: 'Riding Cart', tag: 'CART', tagColor: '#1d4ed8', p: 20, isTransport: true },
              {
                name: 'Military Discount',
                tag: 'MILITARY',
                tagColor: '#1d4ed8',
                p: -10,
                isDiscount: true,
              },
            ],
          },
          { name: 'Guest 3', transport: 'walking', modifierTags: [] },
        ],
      },
      { name: 'Titleist Pro V1 Sleeve', price: 16, qty: 2 },
    ],
    ...extra,
  };
}

/** A retail-only order: no round, so the round-specific chrome stays out of the way. */
export function withRetailOrder(extra: Partial<PosState> = {}): Partial<PosState> {
  return {
    bookings: demoBookings(),
    view: 'pos',
    currentCategory: 'GOLF BALLS',
    cart: [
      { name: 'Titleist Pro V1 Box', price: 54, qty: 1 },
      { name: 'Golf Glove Mens', price: 18, qty: 2 },
      { name: 'Range Bucket Large', price: 14, qty: 1 },
    ],
    ...extra,
  };
}

/** The tee sheet, calendar view, order panel out of the way. */
export function onTeeSheet(extra: Partial<PosState> = {}): Partial<PosState> {
  return {
    bookings: demoBookings(),
    view: 'tee',
    teeSheetMode: 'cal',
    leftPanelCollapsed: true,
    ...extra,
  };
}

// ─── Registry, for deep links ───────────────────────────────────────────────

/**
 * Scenarios addressable by name in a URL (`?order=walkin`).
 *
 * Only cart-bearing scenarios need to be here — everything else a link wants to say
 * (which view, which date, which dialog) is expressible as plain flags.
 */
export const ORDER_SCENARIOS = {
  walkin: withWalkInOrder,
  retail: withRetailOrder,
} as const satisfies Record<string, (extra?: Partial<PosState>) => Partial<PosState>>;

export type OrderScenario = keyof typeof ORDER_SCENARIOS;

export const isOrderScenario = (v: string): v is OrderScenario => v in ORDER_SCENARIOS;
