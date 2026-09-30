import { EmptyState } from '../primitives';
import { OpsScreen, OpsToolbar } from './OpsToolbar';

/** Inventory (V1 → V2, Wave 3). A placeholder until its screen lands. */
export function InventoryView() {
  return (
    <OpsScreen data-inventory>
      <OpsToolbar title="Inventory" />
      <EmptyState icon="inventory_2" label="Inventory is being built" />
    </OpsScreen>
  );
}
