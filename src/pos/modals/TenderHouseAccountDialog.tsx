import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Charge to a house account (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function TenderHouseAccountDialog({ m }: { m: Extract<OperationsModal, { kind: 'tenderHouseAccount' }> }) {
  void m;
  return <ModalFrame title="Charge to a house account">Being built</ModalFrame>;
}
