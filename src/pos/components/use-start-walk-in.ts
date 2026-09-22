import { useCallback } from 'react';
import { useWestonEdits } from '../edition';
import { formatTimeLabel } from '../data/courses';
import { planWalkIn } from '../logic/walk-in';
import type { WalkInRate } from '../logic/walk-in';
import { usePos } from '../state/PosProvider';
import type { Golfer } from '../types';

/**
 * Starting a walk-in on the terminal, by edition (Weston Edits).
 *
 * `routes` says whether a walk-in goes through a reservation right now: the weston edition,
 * with no booking on the order, no round rung up yet and not mid-"Reserve tee time". Then
 * `start` puts one at the next open tee time (`planWalkIn`) and opens it in the reservation
 * panel; Check in & pay brings it to the order like any booking. The base edition's
 * register-first walk-in is untouched — `routes` is false there, so callers fall through
 * to it.
 *
 * One hook for the left panel's Walk-in button, the CHECK IN rate tiles and the member
 * lookup, so the three can't start a walk-in three ways.
 */
export function useStartWalkIn() {
  const { state, dispatch, toast } = usePos();
  const weston = useWestonEdits();
  const routes =
    weston && !state.selectedBookingId && state.flowMode !== 'reserve' && !state.cart.some((i) => i.isCheckIn);

  const start = useCallback(
    (opts: { rate?: WalkInRate | null; golfer?: Golfer | null } = {}) => {
      const booking = planWalkIn(state, { golfer: state.selectedGolfer, ...opts });
      if (!booking) {
        toast('No open tee times left today');
        return false;
      }
      dispatch({ type: 'startWalkIn', booking });
      toast(`Walk-in · ${formatTimeLabel(booking.timeMin)} · next open tee time`);
      return true;
    },
    [state, dispatch, toast],
  );

  return { routes, start };
}
