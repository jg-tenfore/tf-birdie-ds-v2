import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Refund (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function RefundOrderDialog({ m }: { m: Extract<OperationsModal, { kind: 'refundOrder' }> }) {
  void m;
  return <ModalFrame title="Refund">Being built</ModalFrame>;
}
