import type { RestaurantModal } from '../state/restaurant';
import { ModalFrame } from './ModalFrame';
import { usePos } from '../state/PosProvider';

/**
 * Adjust a tip after the fact (V1 → V2, Wave 2). A placeholder until the screen that owns it replaces it.
 */
export function AdjustTipDialog({ m }: { m: Extract<RestaurantModal, { kind: 'adjustTip' }> }) {
  const { dispatch } = usePos();
  void m;
  return <ModalFrame title="Adjust a tip after the fact" onClose={() => dispatch({ type: 'closeModal' })}>{null}</ModalFrame>;
}
