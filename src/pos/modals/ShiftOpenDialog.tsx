import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Open the drawer (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function ShiftOpenDialog({ m }: { m: Extract<OperationsModal, { kind: 'shiftOpen' }> }) {
  void m;
  return <ModalFrame title="Open the drawer">Being built</ModalFrame>;
}
