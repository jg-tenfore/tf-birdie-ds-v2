import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Pay with a gift card (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function TenderGiftCardDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderGiftCard' }> }) {
  void m;
  return <ModalFrame title="Pay with a gift card">Being built</ModalFrame>;
}
