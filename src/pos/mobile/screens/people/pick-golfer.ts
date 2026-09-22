import type { Dispatch } from 'react';
import type { Action } from '../../../state/pos-store';
import { assignPlayer } from '../../../logic/reservation';
import type { Booking, Golfer } from '../../../types';
import type { GolferPickTarget } from '../../navigation';

/**
 * Attach a golfer to whatever the picker was opened for: the order's customer, the tee time
 * being booked, one seat on a round line, or one seat on a booking's reservation (Weston
 * Edits). Shared by the picker and by "Add new customer" inside it, so a brand-new record
 * lands in the same place an existing one would.
 *
 * `bookings` is the live list — a reservation seat is patched from its current booking,
 * so a swap never overwrites edits made since the picker opened.
 */
export function attachGolfer(
  dispatch: Dispatch<Action>,
  target: GolferPickTarget,
  golfer: Golfer,
  bookings: readonly Booking[] = [],
) {
  if (target === 'primary') {
    dispatch({ type: 'selectGolfer', golfer });
  } else if (target === 'booking') {
    dispatch({ type: 'setBookingGolfer', golfer });
  } else if ('bookingId' in target) {
    const b = bookings.find((x) => x.id === target.bookingId);
    if (b) dispatch({ type: 'patchBooking', bookingId: b.id, patch: assignPlayer(b, target.playerIndex, golfer) });
  } else {
    dispatch({
      type: 'updatePlayer',
      itemIndex: target.itemIdx,
      playerIndex: target.playerIdx,
      patch: { name: golfer.name, crmId: golfer.id, phone: golfer.phone, memberType: golfer.memberType },
    });
  }
}
