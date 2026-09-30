import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** New stock count (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function CountFormDialog({ m }: { m: Extract<OperationsModal, { kind: 'countForm' }> }) {
  void m;
  return <ModalFrame title="New stock count">Being built</ModalFrame>;
}
