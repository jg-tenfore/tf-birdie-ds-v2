import type { RestaurantModal } from '../state/restaurant';
import { AdjustTipDialog } from './AdjustTipDialog';
import { DishDialog } from './DishDialog';
import { MoveTabDialog } from './MoveTabDialog';
import { OpenTabDialog } from './OpenTabDialog';
import { ReservationDialog } from './ReservationDialog';
import { SeatReservationDialog } from './SeatReservationDialog';

/**
 * The restaurant's dialogs (V1 → V2, Wave 2), routed from `ModalHost`'s default branch.
 *
 * One file per dialog, owned by the screen that opens it, so screens built in parallel never
 * edit the same file. This switch is the only shared piece, and it does not change as they land.
 */
export function RestaurantDialogs({ m }: { m: RestaurantModal }) {
  switch (m.kind) {
    case 'dish':
      return <DishDialog m={m} />;
    case 'openTab':
      return <OpenTabDialog m={m} />;
    case 'moveTab':
      return <MoveTabDialog m={m} />;
    case 'reservation':
      return <ReservationDialog m={m} />;
    case 'seatReservation':
      return <SeatReservationDialog m={m} />;
    case 'adjustTip':
      return <AdjustTipDialog m={m} />;
  }
}
