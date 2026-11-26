import type { CheckoutModal } from '../state/checkout';
import { TenderCreditDialog } from './TenderCreditDialog';

/**
 * Checkout's dialogs (Nov 26), routed from `ModalHost`'s default branch — one file per dialog, and
 * this switch the only shared piece, as the restaurant's and Wave 3's are.
 */
export function CheckoutDialogs({ m }: { m: CheckoutModal }) {
  switch (m.kind) {
    case 'tenderCredit':
      return <TenderCreditDialog m={m} />;
  }
}
