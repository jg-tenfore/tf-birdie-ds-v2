import type { RestaurantModal } from '../state/restaurant';
import { ModalFrame } from './ModalFrame';
import { usePos } from '../state/PosProvider';

/**
 * Move a tab to another table (V1 → V2, Wave 2). A placeholder until the screen that owns it replaces it.
 */
export function MoveTabDialog({ m }: { m: Extract<RestaurantModal, { kind: 'moveTab' }> }) {
  const { dispatch } = usePos();
  void m;
  return <ModalFrame title="Move a tab to another table" onClose={() => dispatch({ type: 'closeModal' })}>{null}</ModalFrame>;
}
