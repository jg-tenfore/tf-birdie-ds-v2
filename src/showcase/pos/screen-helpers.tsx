import { Box } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { createBookings, DEMO_TODAY } from '../../pos/data/bookings';
import { COURSES, TIMES } from '../../pos/data/courses';
import { buildTeeTimeCart } from '../../pos/logic/cart';
import { PosApp } from '../../pos/PosApp';
import type { PosState } from '../../pos/state/pos-store';
import type { Booking } from '../../pos/types';

/**
 * Helpers shared by the POS screen stories.
 *
 * The point of these is that a screen story should be *declarative*: describe the
 * state you want and get that screen, with no clicking and no effects. Because the
 * whole app is driven by one reducer, "the register with a paid foursome loaded and
 * the checkout open" is just an object.
 *
 * The demo data is generated once and shared, so thirty stories don't each rebuild
 * eleven days of bookings.
 */

/** One shared booking set — deterministic, so stories are stable. */
export const DEMO_BOOKINGS: Booking[] = createBookings();

/** `YYYY-MM-DD` for the demo "today" (Thursday, May 21, 2026). */
export const TODAY_STR = (() => {
  const d = DEMO_TODAY();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

/** Bookings on the demo "today". */
export const todayBookings = (): Booking[] => DEMO_BOOKINGS.filter((b) => b.date === TODAY_STR);

/**
 * Find a booking on the demo day matching a predicate — used to pick a representative
 * example (a paid foursome, an unpaid member, a no-show) without hard-coding an id
 * that the generator might not produce.
 */
export function findToday(predicate: (b: Booking) => boolean): Booking {
  const match = todayBookings().find(predicate);
  // Falling back to the first booking keeps a story renderable even if the
  // generator's distribution shifts, rather than crashing the whole Storybook.
  return match ?? todayBookings()[0];
}

/** A paid four-player booking — the canonical "group checking in" case. */
export const paidFoursome = (): Booking =>
  findToday((b) => b.players === 4 && b.pay === 'paid' && b.status !== 'block');

/** An unpaid booking — the canonical "balance to settle" case. */
export const unpaidBooking = (): Booking =>
  findToday((b) => b.pay === 'open' && b.players >= 2 && b.status !== 'block');

/** A member booking, priced at zero with a member-rate modifier. */
export const memberBooking = (): Booking => findToday((b) => b.status === 'member');

/** State with a tee-sheet booking loaded into the register. */
export function withLoadedBooking(booking: Booking, extra: Partial<PosState> = {}): Partial<PosState> {
  return {
    bookings: DEMO_BOOKINGS,
    view: 'pos',
    selectedBookingId: booking.id,
    cart: buildTeeTimeCart(booking),
    ...extra,
  };
}

/** State mid walk-in: a rate rung up, a tee time attached, players named. */
export function withWalkInOrder(extra: Partial<PosState> = {}): Partial<PosState> {
  const course = COURSES[0];
  const slot = TIMES.find((t) => t.totalMin === 8 * 60 + 24)!;
  return {
    bookings: DEMO_BOOKINGS,
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

/** State on the tee sheet, calendar view, on the demo day. */
export function onTeeSheet(extra: Partial<PosState> = {}): Partial<PosState> {
  return {
    bookings: DEMO_BOOKINGS,
    view: 'tee',
    teeSheetMode: 'cal',
    leftPanelCollapsed: true,
    ...extra,
  };
}

/**
 * Render a screen story.
 *
 * The dark ground matches the prototype and the hosted app — it frames the terminal
 * so a screenshot reads as hardware rather than as a cropped web page.
 */
export function Screen({ initialState }: { initialState?: Partial<PosState> }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: md3.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
      }}
    >
      <PosApp initialState={initialState} />
    </Box>
  );
}

/** Standard story parameters for a full-screen POS story. */
export const screenParams = { layout: 'fullscreen' as const };
