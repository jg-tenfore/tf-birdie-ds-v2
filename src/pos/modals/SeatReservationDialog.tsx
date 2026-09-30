import type { RestaurantModal } from '../state/restaurant';
import { ModalFrame } from './ModalFrame';
import { usePos } from '../state/PosProvider';

/**
 * Seat a reservation at a table (V1 → V2, Wave 2). A placeholder until the screen that owns it replaces it.
 */
export function SeatReservationDialog({ m }: { m: Extract<RestaurantModal, { kind: 'seatReservation' }> }) {
  const { dispatch } = usePos();
  void m;
  return <ModalFrame title="Seat a reservation at a table" onClose={() => dispatch({ type: 'closeModal' })}>{null}</ModalFrame>;
}
