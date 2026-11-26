import type { CheckoutModal } from '../state/checkout';
import { TenderCreditDialog } from './TenderCreditDialog';
import { LineDiscountDialog, OrderDiscountDialog } from './DiscountDialogs';
import { ReceiptDialog, ServiceChargeDialog, SplitCheckDialog, TransferOrderDialog } from './OrderToolsDialogs';

/**
 * Checkout's dialogs (Nov 26), routed from `ModalHost`'s default branch — one file per dialog, and
 * this switch the only shared piece, as the restaurant's and Wave 3's are.
 */
export function CheckoutDialogs({ m }: { m: CheckoutModal }) {
  switch (m.kind) {
    case 'tenderCredit':
      return <TenderCreditDialog m={m} />;
    case 'lineDiscount':
      return <LineDiscountDialog m={m} />;
    case 'orderDiscount':
      return <OrderDiscountDialog m={m} />;
    case 'splitCheck':
      return <SplitCheckDialog m={m} />;
    case 'serviceCharge':
      return <ServiceChargeDialog m={m} />;
    case 'receipt':
      return <ReceiptDialog m={m} />;
    case 'transferOrder':
      return <TransferOrderDialog />;
  }
}
