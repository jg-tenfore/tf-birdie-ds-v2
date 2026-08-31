import { Box } from '@mui/material';
import { md3 } from '../../theme/tokens';
import { DEMO_TODAY } from '../../pos/data/bookings';
import { PosApp } from '../../pos/PosApp';
import {
  demoBookings,
  findBooking,
  onTeeSheet,
  withLoadedBooking,
  withRetailOrder,
  withWalkInOrder,
} from '../../pos/state/scenarios';
import type { PosState } from '../../pos/state/pos-store';
import type { Booking } from '../../pos/types';

/**
 * Helpers shared by the POS screen stories.
 *
 * A screen story should be *declarative*: describe the state you want and get that screen,
 * with no clicking and no effects. Because the whole app is driven by one reducer, "the
 * register with a paid foursome loaded and the checkout open" is just an object.
 *
 * The scenario builders themselves live in `src/pos/state/scenarios.ts`, not here, because
 * the prototype's deep links use the same ones (`?order=walkin`). One definition means a
 * link and a story that claim to show the same thing actually do.
 */

// Re-exported so stories keep importing everything from one place.
export { onTeeSheet, withLoadedBooking, withRetailOrder, withWalkInOrder };

/** The shared demo booking set — generated once per session. */
export const DEMO_BOOKINGS: Booking[] = demoBookings();

/** `YYYY-MM-DD` for the demo "today" (Thursday, May 21, 2026). */
export const TODAY_STR = (() => {
  const d = DEMO_TODAY();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

/** Bookings on the demo "today". */
export const todayBookings = (): Booking[] => DEMO_BOOKINGS.filter((b) => b.date === TODAY_STR);

/**
 * Find a booking on the demo day matching a predicate — used to pick a representative
 * example (a paid foursome, an unpaid member, a no-show) without hard-coding an id that the
 * generator might not produce.
 */
export const findToday = (predicate: (b: Booking) => boolean): Booking =>
  findBooking(DEMO_BOOKINGS, TODAY_STR, predicate);

/** A paid four-player booking — the canonical "group checking in" case. */
export const paidFoursome = (): Booking =>
  findToday((b) => b.players === 4 && b.pay === 'paid' && b.status !== 'block');

/** An unpaid booking — the canonical "balance to settle" case. */
export const unpaidBooking = (): Booking =>
  findToday((b) => b.pay === 'open' && b.players >= 2 && b.status !== 'block');

/** A member booking, priced at zero through a member-rate override. */
export const memberBooking = (): Booking => findToday((b) => b.status === 'member');

/**
 * Render a screen story.
 *
 * The dark ground matches the prototype and the hosted app — it frames the terminal so a
 * screenshot reads as hardware rather than as a cropped web page.
 *
 * URL syncing stays off: Storybook already uses the address bar to track which story is
 * open, and a story rewriting the hash would fight it.
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
