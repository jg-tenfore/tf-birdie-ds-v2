import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { md3, shell } from '../../theme/tokens';
import { ModalContainerProvider } from '../../pos/modals/modal-container';
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
import type { VenueId } from '../../pos/data/venues';
import { venueBookings } from '../../pos/data/venues';
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

/** The 8px of dark ground `Screen` draws around the terminal, per side. */
const GROUND = 8;

/**
 * The scale that fits the 1366×840 terminal, plus its ground, into the current window.
 * Never above 1: at the counter-terminal viewport the frame renders at its real size.
 */
function useFitScale(): number {
  const measure = () =>
    typeof window === 'undefined'
      ? 1
      : Math.min(
          1,
          (window.innerWidth - GROUND * 2) / shell.width,
          (window.innerHeight - GROUND * 2) / shell.height,
        );
  const [scale, setScale] = useState(measure);
  useEffect(() => {
    const onResize = () => setScale(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

/**
 * Render a screen story.
 *
 * The dark ground matches the prototype and the hosted app — it frames the terminal so a
 * screenshot reads as hardware rather than as a cropped web page.
 *
 * The terminal is a fixed 1366×840 layout, so on a smaller viewport (the Tablet and iPad
 * presets) it is scaled down whole rather than cropped: the same design, smaller. Dialogs are
 * scoped into the scaled frame so they shrink with it instead of opening full-size over it.
 *
 * URL syncing stays off: Storybook already uses the address bar to track which story is
 * open, and a story rewriting the hash would fight it.
 */
export function Screen({ initialState }: { initialState?: Partial<PosState> }) {
  const scale = useFitScale();
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const scaled = scale < 1;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: md3.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: `${GROUND}px`,
      }}
    >
      {scaled ? (
        <Box sx={{ width: shell.width * scale, height: shell.height * scale, flexShrink: 0 }}>
          <Box
            ref={setFrame}
            sx={{
              width: shell.width,
              height: shell.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {frame && (
              <ModalContainerProvider container={frame}>
                <PosApp initialState={initialState} />
              </ModalContainerProvider>
            )}
          </Box>
        </Box>
      ) : (
        <PosApp initialState={initialState} />
      )}
    </Box>
  );
}

/**
 * The tee sheet for a given club.
 *
 * The three prototypes differ only in course layout, so a story renders any of them by
 * naming the venue — no separate fixtures, and no chance of the story and the deployed
 * prototype disagreeing.
 */
export function atVenue(venueId: VenueId, extra: Partial<PosState> = {}): Partial<PosState> {
  return {
    venueId,
    bookings: venueBookings(venueId),
    view: 'tee',
    teeSheetMode: 'cal',
    leftPanelCollapsed: true,
    ...extra,
  };
}

/** Standard story parameters for a full-screen POS story. */
export const screenParams = { layout: 'fullscreen' as const };
