import { useLayoutEffect } from 'react';
import { seedEventBookings } from '../data/events';
import { usePos } from './PosProvider';

/**
 * The seeded events' outings on the tee sheet (V1 → V2, Wave 3 — the caller decides).
 *
 * A layout effect, like the demo-day fill, so the outing is on the sheet before it paints. Keyed on
 * the club: changing club replaces every booking, so the outing is re-added off the new club's
 * first tee. `addEventBookings` skips ids already present, so a re-run adds nothing twice.
 */
export function useEventBookings(enabled: boolean) {
  const { state, dispatch } = usePos();
  useLayoutEffect(() => {
    if (!enabled) return;
    const [first, second] = state.courses;
    if (!first) return;
    dispatch({ type: 'addEventBookings', bookings: seedEventBookings(first.id, second?.id) });
    // Only a club change replaces the bookings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, state.venueId]);
}
