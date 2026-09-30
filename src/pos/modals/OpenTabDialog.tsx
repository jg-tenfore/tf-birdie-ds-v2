import type { RestaurantModal } from '../state/restaurant';
import { ModalFrame } from './ModalFrame';
import { usePos } from '../state/PosProvider';

/**
 * Open a tab (V1 → V2, Wave 2). A placeholder until the screen that owns it replaces it.
 */
export function OpenTabDialog({ m }: { m: Extract<RestaurantModal, { kind: 'openTab' }> }) {
  const { dispatch } = usePos();
  void m;
  return <ModalFrame title="Open a tab" onClose={() => dispatch({ type: 'closeModal' })}>{null}</ModalFrame>;
}
