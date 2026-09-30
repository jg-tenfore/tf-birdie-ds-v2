import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Charge the card on file (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function TenderCardOnFileDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderCardOnFile' }> }) {
  void m;
  return <ModalFrame title="Charge the card on file">Being built</ModalFrame>;
}
