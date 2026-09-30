import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Order Lookup (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function OrderLookupView() {
  return (
    <OpsScreen data-order-lookup>
      <OpsToolbar title="Order Lookup" />
      <EmptyState icon="receipt_long" label="Order Lookup is being built" />
    </OpsScreen>
  );
}
