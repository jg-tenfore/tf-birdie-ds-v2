import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Event (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function EventFormDialog({ m }: { m: Extract<OperationsModal, { kind: 'eventForm' }> }) {
  void m;
  return <ModalFrame title="Event">Being built</ModalFrame>;
}
