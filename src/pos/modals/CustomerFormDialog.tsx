import type { OperationsModal } from '../state/operations';
import { ModalFrame } from './ModalFrame';

/** Customer (V1 → V2, Wave 3). A placeholder until its dialog lands. */
export function CustomerFormDialog({ m }: { m: Extract<OperationsModal, { kind: 'customerForm' }> }) {
  void m;
  return <ModalFrame title="Customer">Being built</ModalFrame>;
}
