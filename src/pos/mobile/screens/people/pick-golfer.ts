import type { Dispatch } from 'react';
import type { Action } from '../../../state/pos-store';
import type { Golfer } from '../../../types';
import type { GolferPickTarget } from '../../navigation';

/**
 * Attach a golfer to whatever the picker was opened for: the order's customer, the tee time
 * being booked, or one seat on a round line. Shared by the picker and by "Add new customer" inside it, so a
 * brand-new record lands in the same place an existing one would.
 */
export function attachGolfer(dispatch: Dispatch<Action>, target: GolferPickTarget, golfer: Golfer) {
  if (target === 'primary') {
    dispatch({ type: 'selectGolfer', golfer });
  } else if (target === 'booking') {
    dispatch({ type: 'setBookingGolfer', golfer });
  } else {
    dispatch({
      type: 'updatePlayer',
      itemIndex: target.itemIdx,
      playerIndex: target.playerIdx,
      patch: { name: golfer.name, crmId: golfer.id, phone: golfer.phone, memberType: golfer.memberType },
    });
  }
}
