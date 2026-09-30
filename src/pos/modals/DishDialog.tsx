import type { RestaurantModal } from '../state/restaurant';
import { ModalFrame } from './ModalFrame';
import { usePos } from '../state/PosProvider';

/**
 * Choose modifiers for a dish (V1 → V2, Wave 2). A placeholder until the screen that owns it replaces it.
 */
export function DishDialog({ m }: { m: Extract<RestaurantModal, { kind: 'dish' }> }) {
  const { dispatch } = usePos();
  void m;
  return <ModalFrame title="Choose modifiers for a dish" onClose={() => dispatch({ type: 'closeModal' })}>{null}</ModalFrame>;
}
