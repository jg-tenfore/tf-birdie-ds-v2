import { useCallback } from 'react';
import { useWestonEdits } from '../edition';
import { usePos } from '../state/PosProvider';

/**
 * What clicking a booking does, by edition.
 *
 * - **base** — loads it into the register, as the original did.
 * - **weston** — opens its reservation panel over the tee sheet. The order comes after the
 *   golf: nothing reaches the cart until the panel's Check in & pay.
 *
 * One hook so the grid, the list, the day summary and tee-sheet search can't disagree.
 */
export function useOpenBooking(): (bookingId: string) => void {
  const { dispatch } = usePos();
  const weston = useWestonEdits();
  return useCallback(
    (bookingId: string) =>
      dispatch(weston ? { type: 'openReservation', bookingId } : { type: 'loadBooking', bookingId }),
    [dispatch, weston],
  );
}
