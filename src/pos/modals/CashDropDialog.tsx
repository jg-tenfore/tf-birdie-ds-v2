import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Cash drop (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function CashDropDialog({ m }: { m: Extract<OperationsModal, { kind: 'cashDrop' }> }) {
  void m;
  return <ModalFrame title="Cash drop">Being built</ModalFrame>;
}
