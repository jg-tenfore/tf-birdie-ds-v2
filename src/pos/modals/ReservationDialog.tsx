import type { RestaurantModal } from '../state/restaurant';
import { ModalFrame } from './ModalFrame';
import { usePos } from '../state/PosProvider';

/**
 * Create or edit a reservation (V1 → V2, Wave 2). A placeholder until the screen that owns it replaces it.
 */
export function ReservationDialog({ m }: { m: Extract<RestaurantModal, { kind: 'reservation' }> }) {
  const { dispatch } = usePos();
  void m;
  return <ModalFrame title="Create or edit a reservation" onClose={() => dispatch({ type: 'closeModal' })}>{null}</ModalFrame>;
}
