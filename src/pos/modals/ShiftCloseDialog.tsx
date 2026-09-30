import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Close the drawer (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function ShiftCloseDialog({ m }: { m: Extract<OperationsModal, { kind: 'shiftClose' }> }) {
  void m;
  return <ModalFrame title="Close the drawer">Being built</ModalFrame>;
}
