import type { OperationsModal } from '../state/operations';
import { CashDropDialog } from './CashDropDialog';
import { CountFormDialog } from './CountFormDialog';
import { CustomerFormDialog } from './CustomerFormDialog';
import { EventFormDialog } from './EventFormDialog';
import { RefundOrderDialog } from './RefundOrderDialog';
import { ShiftCloseDialog } from './ShiftCloseDialog';
import { ShiftOpenDialog } from './ShiftOpenDialog';
import { TenderCardOnFileDialog } from './TenderCardOnFileDialog';
import { TenderCheckDialog } from './TenderCheckDialog';
import { TenderEventDialog } from './TenderEventDialog';
import { TenderGiftCardDialog } from './TenderGiftCardDialog';
import { TenderHouseAccountDialog } from './TenderHouseAccountDialog';

/**
 * Operations' dialogs (V1 → V2, Wave 3), routed from `ModalHost`'s default branch — the same
 * pattern as the restaurant's: one file per dialog, and this switch the only shared piece.
 */
export function OperationsDialogs({ m }: { m: OperationsModal }) {
  switch (m.kind) {
    case 'tenderGiftCard':
      return <TenderGiftCardDialog m={m} />;
    case 'tenderHouseAccount':
      return <TenderHouseAccountDialog m={m} />;
    case 'tenderCardOnFile':
      return <TenderCardOnFileDialog m={m} />;
    case 'customerForm':
      return <CustomerFormDialog m={m} />;
    case 'refundOrder':
      return <RefundOrderDialog m={m} />;
    case 'eventForm':
      return <EventFormDialog m={m} />;
    case 'tenderEvent':
      return <TenderEventDialog m={m} />;
    case 'tenderCheck':
      return <TenderCheckDialog m={m} />;
    case 'shiftOpen':
      return <ShiftOpenDialog m={m} />;
    case 'shiftClose':
      return <ShiftCloseDialog m={m} />;
    case 'cashDrop':
      return <CashDropDialog m={m} />;
    case 'countForm':
      return <CountFormDialog m={m} />;
  }
}
