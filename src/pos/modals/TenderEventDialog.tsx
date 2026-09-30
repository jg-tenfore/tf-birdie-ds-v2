import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Charge to an event (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function TenderEventDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderEvent' }> }) {
  void m;
  return <ModalFrame title="Charge to an event">Being built</ModalFrame>;
}
